import {Module, OnModuleInit} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ConfigAppModule} from './config/config.module';
import {IdModule} from './modules/id/id.module';
import {GenerateModule} from './modules/generate/generate.module';
import {ReportsModule} from './modules/reports/reports.module';
import {ItemsModule} from './modules/items/items.module';
import {NotesModule} from './modules/notes/notes.module';
import {ExportModule} from './modules/export/export.module';
import {createDataSource} from './config/typeorm.config';
import {AppConfig} from './config/config.types';
import {DataSource} from 'typeorm';

/**
 * 应用主模块
 */
@Module({
    imports: [
        // 配置模块（全局）
        ConfigAppModule,

        // TypeORM 模块（动态配置）
        TypeOrmModule.forRootAsync({
            inject: ['APP_CONFIG'],
            useFactory: async (config: AppConfig) => {
                const dataSource = createDataSource(config.database.path);
                return {
                    type: 'sqlite',
                    database: config.database.path,
                    entities: dataSource.options.entities,
                    migrations: dataSource.options.migrations,
                    synchronize: false,
                    logging: false,
                };
            },
        }),

        // ID 生成模块（全局）
        IdModule,

        // 周报生成模块
        GenerateModule,

        // 周报管理模块（查询历史报告）
        ReportsModule,

        // 条目管理模块（单行编辑）
        ItemsModule,

        // 会议待办模块（会议备注保存）
        NotesModule,

        // Excel 导出模块
        ExportModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements OnModuleInit {
    constructor(private readonly dataSource: DataSource) {
    }

    async onModuleInit() {
        // 在模块初始化后执行 WAL 配置
        try {
            await this.dataSource.query('PRAGMA journal_mode = WAL;');
            await this.dataSource.query('PRAGMA busy_timeout = 5000;');
            await this.dataSource.query('PRAGMA synchronous = NORMAL;');
            await this.dataSource.query('PRAGMA cache_size = -10000;');

            const result = await this.dataSource.query('PRAGMA journal_mode;');
            console.log(`✅ SQLite WAL 模式已启用: ${result[0].journal_mode}`);
        } catch (error) {
            console.error('⚠️  WAL 配置失败:', error.message);
        }
    }
}
