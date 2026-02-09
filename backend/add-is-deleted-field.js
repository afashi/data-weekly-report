const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'weekly-report.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('正在添加 is_deleted 字段到 report_items 表...');

db.serialize(() => {
    // 检查字段是否已存在
    db.all("PRAGMA table_info(report_items)", (err, rows) => {
        if (err) {
            console.error('❌ 查询表结构失败:', err);
            db.close();
            return;
        }

        const hasIsDeleted = rows.some(row => row.name === 'is_deleted');

        if (hasIsDeleted) {
            console.log('✅ is_deleted 字段已存在，无需添加');
            db.close();
            return;
        }

        // 添加字段
        db.run("ALTER TABLE report_items ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0", (err) => {
            if (err) {
                console.error('❌ 添加字段失败:', err);
                db.close();
                return;
            }

            console.log('✅ is_deleted 字段添加成功');

            // 创建索引
            db.run("CREATE INDEX IF NOT EXISTS idx_report_items_report_tab_deleted ON report_items(report_id, tab_type, is_deleted)", (err) => {
                if (err) {
                    console.error('❌ 创建索引失败:', err);
                } else {
                    console.log('✅ 索引创建成功');
                }

                // 验证
                db.all("PRAGMA table_info(report_items)", (err, rows) => {
                    if (err) {
                        console.error('❌ 验证失败:', err);
                    } else {
                        console.log('\n当前 report_items 表结构:');
                        rows.forEach(row => {
                            console.log(`  - ${row.name} (${row.type})`);
                        });
                    }

                    db.close();
                    console.log('\n✅ 所有操作完成！');
                });
            });
        });
    });
});
