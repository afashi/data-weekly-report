import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportItemEntity } from '../../entities/report-item.entity';
import { UpdateItemDto, ItemResponseDto } from './dto/items.dto';

/**
 * 条目管理服务
 * 负责单行条目的编辑功能
 */
@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    @InjectRepository(ReportItemEntity)
    private readonly itemRepository: Repository<ReportItemEntity>,
  ) {}

  /**
   * 更新单行条目
   * @param id 条目 ID
   * @param dto 更新数据
   * @returns 更新后的条目
   */
  async updateItem(id: string, dto: UpdateItemDto): Promise<ItemResponseDto> {
    this.logger.log(`更新条目 - ID: ${id}`);

    // 查询条目
    const item = await this.itemRepository.findOne({
      where: { id: id as any },
    });

    if (!item) {
      throw new NotFoundException(`条目不存在 - ID: ${id}`);
    }

    // 更新 contentJson
    item.contentJson = JSON.stringify(dto.contentJson);
    await this.itemRepository.save(item);

    this.logger.log(`条目更新成功 - ID: ${id}`);

    // 返回更新后的数据
    return {
      id: item.id.toString(),
      reportId: item.reportId.toString(),
      tabType: item.tabType,
      sourceType: item.sourceType,
      parentId: item.parentId ? item.parentId.toString() : null,
      contentJson: JSON.parse(item.contentJson),
      sortOrder: item.sortOrder,
    };
  }
}
