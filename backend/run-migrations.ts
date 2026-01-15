import {DataSource} from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 手动执行 Migration 脚本
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
        entities: [path.join(__dirname, 'src/entities/*.entity.ts')],
        migrations: [path.join(__dirname, 'src/migrations/*.ts')],
        synchronize: false,
        logging: true,
    });

    try {
        console.log('正在初始化数据库连接...');
        await dataSource.initialize();
        console.log('✅ 数据库连接成功');

        console.log('\n正在执行 Migration...');
        const migrations = await dataSource.runMigrations();

        if (migrations.length === 0) {
            console.log('✅ 没有需要执行的 Migration');
        } else {
            console.log(`✅ 成功执行 ${migrations.length} 个 Migration:`);
            migrations.forEach((migration) => {
                console.log(`  - ${migration.name}`);
            });
        }

        // 开启 WAL 模式
        console.log('\n正在配置 SQLite WAL 模式...');
        await dataSource.query('PRAGMA journal_mode = WAL;');
        await dataSource.query('PRAGMA busy_timeout = 5000;');
        await dataSource.query('PRAGMA synchronous = NORMAL;');
        await dataSource.query('PRAGMA cache_size = -10000;');
        console.log('✅ WAL 模式配置完成');

        await dataSource.destroy();
        console.log('\n✅ 所有操作完成！');
    } catch (error) {
        console.error('\n❌ Migration 执行失败:', error);
        process.exit(1);
    }
}

runMigrations();
