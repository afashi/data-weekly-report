import {
  Controller,
  Patch,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { UpdateItemDto, ItemResponseDto } from './dto/items.dto';

/**
 * 条目管理 Controller
 * 提供单行条目编辑功能
 */
@Controller('items')
export class ItemsController {
  private readonly logger = new Logger(ItemsController.name);

  constructor(private readonly itemsService: ItemsService) {}

  /**
   * PATCH /api/items/:id
   * 更新单行条目
   *
   * @param id 条目 ID
   * @param dto 更新数据
   * @returns 更新后的条目
   */
  @Patch(':id')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    this.logger.log(`收到更新条目请求 - ID: ${id}`);

    try {
      const result = await this.itemsService.updateItem(id, dto);
      this.logger.log(`条目更新成功 - ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`条目更新失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
