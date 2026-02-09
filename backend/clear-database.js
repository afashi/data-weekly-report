/**
 * 数据库清空脚本
 * 用途：清空所有业务表数据（保留表结构）
 *
 * 执行方式：node clear-database.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'weekly-report.sqlite');

console.log('📊 数据库清空脚本');
console.log('数据库路径:', dbPath);
console.log('');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        process.exit(1);
    }
    console.log('✅ 数据库连接成功');
});

// 先查询当前数据量
const checkSQL = `
    SELECT 'reports' as table_name, COUNT(*) as count FROM reports
    UNION ALL
    SELECT 'system_metrics', COUNT(*) FROM system_metrics
    UNION ALL
    SELECT 'report_items', COUNT(*) FROM report_items
    UNION ALL
    SELECT 'meeting_notes', COUNT(*) FROM meeting_notes;
`;

console.log('');
console.log('🔍 当前数据量统计：');
console.log('─────────────────────────────────');

db.all(checkSQL, [], (err, rows) => {
    if (err) {
        console.error('❌ 查询失败:', err.message);
        db.close();
        process.exit(1);
    }

    rows.forEach(row => {
        console.log(`  ${row.table_name.padEnd(20)} : ${row.count} 条`);
    });

    console.log('─────────────────────────────────');
    console.log('');
    console.log('⚠️  即将执行以下 SQL 语句：');
    console.log('');
    console.log('  1. DELETE FROM meeting_notes;');
    console.log('  2. DELETE FROM report_items;');
    console.log('  3. DELETE FROM system_metrics;');
    console.log('  4. DELETE FROM reports;');
    console.log('  5. DELETE FROM sqlite_sequence WHERE name IN (\'meeting_notes\', \'report_items\', \'system_metrics\', \'reports\');');
    console.log('');

    // 执行清空操作
    db.serialize(() => {
        console.log('🚀 开始执行清空操作...');
        console.log('');

        db.run('DELETE FROM meeting_notes', function (err) {
            if (err) {
                console.error('❌ 清空 meeting_notes 失败:', err.message);
            } else {
                console.log(`✅ meeting_notes 已清空 (删除 ${this.changes} 条)`);
            }
        });

        db.run('DELETE FROM report_items', function (err) {
            if (err) {
                console.error('❌ 清空 report_items 失败:', err.message);
            } else {
                console.log(`✅ report_items 已清空 (删除 ${this.changes} 条)`);
            }
        });

        db.run('DELETE FROM system_metrics', function (err) {
            if (err) {
                console.error('❌ 清空 system_metrics 失败:', err.message);
            } else {
                console.log(`✅ system_metrics 已清空 (删除 ${this.changes} 条)`);
            }
        });

        db.run('DELETE FROM reports', function (err) {
            if (err) {
                console.error('❌ 清空 reports 失败:', err.message);
            } else {
                console.log(`✅ reports 已清空 (删除 ${this.changes} 条)`);
            }
        });

        db.run('DELETE FROM sqlite_sequence WHERE name IN (\'meeting_notes\', \'report_items\', \'system_metrics\', \'reports\')', function (err) {
            if (err) {
                console.error('❌ 重置序列失败:', err.message);
            } else {
                console.log(`✅ 自增序列已重置 (删除 ${this.changes} 条)`);
            }
        });

        // 验证清空结果
        db.all(checkSQL, [], (err, rows) => {
            console.log('');
            console.log('🔍 清空后数据量统计：');
            console.log('─────────────────────────────────');

            if (err) {
                console.error('❌ 验证查询失败:', err.message);
            } else {
                rows.forEach(row => {
                    console.log(`  ${row.table_name.padEnd(20)} : ${row.count} 条`);
                });
            }

            console.log('─────────────────────────────────');
            console.log('');
            console.log('✨ 数据库清空完成！');

            db.close((err) => {
                if (err) {
                    console.error('❌ 关闭数据库失败:', err.message);
                } else {
                    console.log('✅ 数据库连接已关闭');
                }
            });
        });
    });
});
