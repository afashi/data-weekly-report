import {DataSource} from 'typeorm';
import {ReportEntity} from './src/entities/report.entity';
import {SystemMetricEntity} from './src/entities/system-metric.entity';
import {ReportItemEntity} from './src/entities/report-item.entity';
import {MeetingNoteEntity} from './src/entities/meeting-note.entity';

async function cleanDatabase() {
    const dataSource = new DataSource({
        type: 'sqlite',
        database: 'data/weekly-report.sqlite',
        entities: [ReportEntity, SystemMetricEntity, ReportItemEntity, MeetingNoteEntity],
        synchronize: false,
    });

    await dataSource.initialize();
    console.log('数据库连接成功');

    // 删除所有数据（使用 query 直接执行 SQL）
    await dataSource.query('DELETE FROM meeting_notes');
    await dataSource.query('DELETE FROM report_items');
    await dataSource.query('DELETE FROM system_metrics');
    await dataSource.query('DELETE FROM reports');

    console.log('✅ 所有数据已清理');

    await dataSource.destroy();
}

cleanDatabase().catch(console.error);
