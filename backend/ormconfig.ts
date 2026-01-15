import {DataSource} from 'typeorm';
import * as path from 'path';

/**
 * TypeORM CLI DataSource
 * 用于 migration 命令
 */
export default new DataSource({
    type: 'sqlite',
    database: 'data/weekly-report.sqlite',
    entities: [path.join(__dirname, 'src/entities/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, 'src/migrations/*{.ts,.js}')],
    synchronize: false,
    logging: false,
});
