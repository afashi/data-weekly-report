import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportEntity } from '../../entities/report.entity';
import { SystemMetricEntity } from '../../entities/system-metric.entity';
import { ReportItemEntity } from '../../entities/report-item.entity';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';

/**
 * 周报管理模块
 * 提供历史周报查询、详情获取和删除功能
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportEntity,
      SystemMetricEntity,
      ReportItemEntity,
      MeetingNoteEntity,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
