import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ReportItemEntity } from '../../entities/report-item.entity';

/**
 * 条目管理模块
 * 提供单行条目编辑功能
 */
@Module({
  imports: [TypeOrmModule.forFeature([ReportItemEntity])],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService],
})
export class ItemsModule {}
