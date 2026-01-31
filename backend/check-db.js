const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'weekly-report.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
        process.exit(1);
    }
    console.log('✅ 数据库连接成功');
});

// 检查 journal_mode
db.get('PRAGMA journal_mode', (err, row) => {
    if (err) {
        console.error('查询 journal_mode 失败:', err.message);
    } else {
        console.log('📝 Journal Mode:', row.journal_mode);
    }
});

// 检查 synchronous
db.get('PRAGMA synchronous', (err, row) => {
    if (err) {
        console.error('查询 synchronous 失败:', err.message);
    } else {
        console.log('🔄 Synchronous:', row.synchronous);
    }
});

// 检查表
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
    if (err) {
        console.error('查询表失败:', err.message);
    } else {
        console.log('📊 数据库表:');
        rows.forEach(row => {
            console.log('  -', row.name);
        });
    }

    // 关闭数据库
    db.close((err) => {
        if (err) {
            console.error('关闭数据库失败:', err.message);
        } else {
            console.log('✅ 数据库检查完成');
        }
    });
});
