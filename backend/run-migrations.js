const {DataSource} = require('typeorm');
const path = require('path');
const fs = require('fs');

/**
 * 手动执行 Migration（JavaScript 版本）
 */
async function runMigrations() {
    // 确保数据库目录存在
    const dbDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, {recursive: true});
    }

    const dataSource = new DataSource({
        type: 'sqlite',
        database: 'data/weekly-report.sqlite',
        synchronize: false,
        logging: true,
    });

    try {
        console.log('正在初始化数据库连接...');
        await dataSource.initialize();
        console.log('✅ 数据库连接成功\n');

        // 手动创建表结构
        console.log('正在创建表结构...');

        // 1. reports 表
        await dataSource.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY,
        week_range VARCHAR(32) NOT NULL,
        week_number INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN NOT NULL DEFAULT 0
      )
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_is_deleted_created_at
      ON reports(is_deleted, created_at DESC)
    `);
        console.log('✅ reports 表已创建');

        // 2. system_metrics 表
        await dataSource.query(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        metric_key VARCHAR(64) NOT NULL,
        metric_value VARCHAR(128) NOT NULL,
        status_code VARCHAR(32) NOT NULL
      )
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_system_metrics_report_id
      ON system_metrics(report_id)
    `);
        await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_system_metrics_report_key
      ON system_metrics(report_id, metric_key)
    `);
        console.log('✅ system_metrics 表已创建');

        // 3. report_items 表
        await dataSource.query(`
      CREATE TABLE IF NOT EXISTS report_items (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        tab_type VARCHAR(16) NOT NULL,
        source_type VARCHAR(16) NOT NULL,
        parent_id INTEGER,
        content_json TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      )
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_report_items_report_tab
      ON report_items(report_id, tab_type)
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_report_items_parent
      ON report_items(parent_id)
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_report_items_sort
      ON report_items(report_id, tab_type, sort_order)
    `);
        console.log('✅ report_items 表已创建');

        // 4. meeting_notes 表
        await dataSource.query(`
      CREATE TABLE IF NOT EXISTS meeting_notes (
        id INTEGER PRIMARY KEY,
        report_id INTEGER NOT NULL,
        content TEXT NOT NULL
      )
    `);
        await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_meeting_notes_report_id
      ON meeting_notes(report_id)
    `);
        console.log('✅ meeting_notes 表已创建');

        // 开启 WAL 模式
        console.log('\n正在配置 SQLite WAL 模式...');
        await dataSource.query('PRAGMA journal_mode = WAL;');
        const walResult = await dataSource.query('PRAGMA journal_mode;');
        console.log(`  journal_mode: ${walResult[0].journal_mode}`);

        await dataSource.query('PRAGMA busy_timeout = 5000;');
        await dataSource.query('PRAGMA synchronous = NORMAL;');
        await dataSource.query('PRAGMA cache_size = -10000;');
        console.log('✅ WAL 模式配置完成');

        await dataSource.destroy();
        console.log('\n✅ 所有操作完成！数据库已初始化。');
    } catch (error) {
        console.error('\n❌ Migration 执行失败:', error.message);
        process.exit(1);
    }
}

runMigrations();
