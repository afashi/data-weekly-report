const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'weekly-report.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('=== 检查表结构 ===\n');

db.serialize(() => {
    // 查看 reports 表结构
    db.all("PRAGMA table_info(reports)", (err, columns) => {
        if (err) {
            console.error('❌ 查询失败:', err);
            db.close();
            return;
        }

        console.log('reports 表结构:');
        columns.forEach(col => {
            console.log(`  ${col.name}: ${col.type} ${col.pk ? '(PRIMARY KEY)' : ''}`);
        });

        // 查询数据
        db.all("SELECT id, week_range FROM reports LIMIT 5", (err, rows) => {
            if (err) {
                console.error('❌ 查询失败:', err);
            } else {
                console.log(`\n找到 ${rows.length} 条记录:`);
                rows.forEach((row, index) => {
                    console.log(`${index + 1}. ID: ${row.id} (类型: ${typeof row.id})`);
                    console.log(`   周范围: ${row.week_range}`);
                });
            }
            db.close();
        });
    });
});
