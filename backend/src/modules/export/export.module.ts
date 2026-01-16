import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ReportEntity } from '../../entities/report.entity';
import { SystemMetricEntity } from '../../entities/system-metric.entity';
import { ReportItemEntity } from '../../entities/report-item.entity';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';

/**
 * Excel 导出模块
 * 提供周报导出功能
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
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
