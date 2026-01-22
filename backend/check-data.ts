import {DataSource} from 'typeorm';
import {ReportEntity} from './src/entities/report.entity';

async function checkData() {
    const dataSource = new DataSource({
        type: 'sqlite',
        database: 'data/weekly-report.sqlite',
        entities: [ReportEntity],
        synchronize: false,
    });

    await dataSource.initialize();

    const reports = await dataSource.query('SELECT id, week_range FROM reports');
    console.log('数据库中的周报 ID:');
    console.log(JSON.stringify(reports, null, 2));

    await dataSource.destroy();
}

checkData().catch(console.error);
