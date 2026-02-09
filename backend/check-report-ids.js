const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'weekly-report.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('正在查询 reports 表中的 ID...\n');

db.serialize(() => {
    // 查询所有报告的 ID
    db.all("SELECT id, week_range, is_deleted, created_at FROM reports ORDER BY created_at DESC LIMIT 10", (err, rows) => {
        if (err) {
            console.error('❌ 查询失败:', err);
            db.close();
            return;
        }

        console.log(`找到 ${rows.length} 条报告记录:\n`);
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id}`);
            console.log(`   周范围: ${row.week_range}`);
            console.log(`   是否删除: ${row.is_deleted}`);
            console.log(`   创建时间: ${row.created_at}`);
            console.log(`   ID 类型: ${typeof row.id}`);
            console.log('');
        });

        // 测试查询特定 ID
        const testId = rows.length > 0 ? rows[0].id : null;
        if (testId) {
            console.log(`\n测试查询 ID: ${testId}`);

            // 尝试不同的查询方式
            db.get("SELECT * FROM reports WHERE id = ?", [testId], (err, row) => {
                if (err) {
                    console.error('❌ 参数化查询失败:', err);
                } else if (row) {
                    console.log('✅ 参数化查询成功:', row);
                } else {
                    console.log('❌ 参数化查询未找到记录');
                }

                // 尝试字符串查询
                db.get(`SELECT * FROM reports WHERE id = '${testId}'`, (err, row) => {
                    if (err) {
                        console.error('❌ 字符串查询失败:', err);
                    } else if (row) {
                        console.log('✅ 字符串查询成功:', row);
                    } else {
                        console.log('❌ 字符串查询未找到记录');
                    }

                    db.close();
                    console.log('\n✅ 查询完成！');
                });
            });
        } else {
            db.close();
            console.log('\n✅ 查询完成！');
        }
    });
});
