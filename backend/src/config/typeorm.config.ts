import {DataSource} from 'typeorm';
import {ReportEntity} from '../entities/report.entity';
import {SystemMetricEntity} from '../entities/system-metric.entity';
import {ReportItemEntity} from '../entities/report-item.entity';
import {MeetingNoteEntity} from '../entities/meeting-note.entity';
import * as path from 'path';
import * as fs from 'fs';

/**
 * TypeORM 数据源配置
 * SQLite + WAL 模式
 */
export const createDataSource = (databasePath: string): DataSource => {
    // 确保数据库目录存在
    const dbDir = path.dirname(databasePath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, {recursive: true});
    }

    return new DataSource({
        type: 'sqlite',
        database: databasePath,
        entities: [ReportEntity, SystemMetricEntity, ReportItemEntity, MeetingNoteEntity],
        migrations: [path.join(__dirname, '../migrations/*.{ts,js}')],
        synchronize: false, // 生产环境禁用自动同步
        logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
    });
};

/**
 * 初始化 SQLite WAL 模式
 * WAL (Write-Ahead Logging) 模式优势：
 * 1. 读写并发性能更好
 * 2. 写操作不会阻塞读操作
 * 3. 数据库崩溃恢复更快
 */
export async function initializeSQLite(dataSource: DataSource): Promise<void> {
    await dataSource.initialize();

    // 开启 WAL 模式
    await dataSource.query('PRAGMA journal_mode = WAL;');

    // 设置忙等待超时（5 秒）
    await dataSource.query('PRAGMA busy_timeout = 5000;');

    // 设置同步模式（NORMAL 平衡性能与安全）
    await dataSource.query('PRAGMA synchronous = NORMAL;');

    // 设置缓存大小（10MB）
    await dataSource.query('PRAGMA cache_size = -10000;');

    console.log('✅ SQLite 已初始化（WAL 模式）');
}

/**
 * 默认 DataSource（用于 TypeORM CLI）
 */
export default createDataSource('data/weekly-report.sqlite');
