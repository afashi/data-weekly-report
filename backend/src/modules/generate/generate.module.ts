import {Module} from '@nestjs/common';
import {TypeOrmModule} from '@nestjs/typeorm';
import {GenerateController} from './generate.controller';
import {GenerateService} from './generate.service';
import {JiraAdapter} from './adapters/jira.adapter';
import {SqlAdapter} from './adapters/sql.adapter';
import {ReportEntity} from '../../entities/report.entity';
import {SystemMetricEntity} from '../../entities/system-metric.entity';
import {ReportItemEntity} from '../../entities/report-item.entity';
import {MeetingNoteEntity} from '../../entities/meeting-note.entity';
import {IdModule} from '../id/id.module';

/**
 * 周报生成模块
 * 整合所有生成相关的服务和适配器
 */
@Module({
    imports: [
        // 导入 Entity 以使用 Repository
        TypeOrmModule.forFeature([ReportEntity, SystemMetricEntity, ReportItemEntity, MeetingNoteEntity]),
        // 导入 IdModule 以使用 IdService
        IdModule,
    ],
    controllers: [GenerateController],
    providers: [GenerateService, JiraAdapter, SqlAdapter],
    exports: [GenerateService], // 导出供其他模块使用
})
export class GenerateModule {
}
