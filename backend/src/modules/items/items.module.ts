import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ReportItemEntity } from '../../entities/report-item.entity';
import {ReportEntity} from '../../entities/report.entity';
import {IdModule} from '../id/id.module';

/**
 * 条目管理模块
 * 提供单行条目编辑和批量更新自采数据功能
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([ReportItemEntity, ReportEntity]),
        IdModule, // 导入 IdModule 以使用 IdService
    ],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
