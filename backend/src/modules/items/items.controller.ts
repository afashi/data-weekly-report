import {Body, Controller, Logger, Param, Patch, Post, Put,} from '@nestjs/common';
import {ItemsService} from './items.service';
import {
    CreateItemDto,
    ItemResponseDto,
    UpdateItemDto,
    UpdateManualItemsDto,
    UpdateManualItemsResponseDto,
} from './dto/items.dto';

/**
 * 条目管理 Controller
 * 提供单行条目编辑和批量更新自采数据功能
 */
@Controller('items')
export class ItemsController {
  private readonly logger = new Logger(ItemsController.name);

  constructor(private readonly itemsService: ItemsService) {}

    /**
     * POST /api/items
     * 新增条目
     *
     * @param dto 新增数据
     * @returns 新增的条目
     */
    @Post()
    async createItem(@Body() dto: CreateItemDto): Promise<ItemResponseDto> {
        this.logger.log(`收到新增条目请求 - 周报 ID: ${dto.reportId}, Tab: ${dto.tabType}`);

        try {
            const result = await this.itemsService.createItem(dto);
            this.logger.log(`条目新增成功 - ID: ${result.id}`);
            return result;
        } catch (error) {
            this.logger.error(`条目新增失败: ${error.message}`, error.stack);
            throw error;
        }
    }

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

    /**
     * PUT /api/reports/:reportId/manual-items
     * 批量更新手动条目(SELF 标签页)
     *
     * 功能说明:
     * - 全量替换指定周报的 SELF 标签页数据
     * - 支持树形结构(通过 parentId 关联)
     * - 自动处理临时 ID 映射(temp_ 开头的 ID 会被替换为真实 Snowflake ID)
     * - 使用事务保证数据一致性
     *
     * @param reportId 周报 ID
     * @param dto 批量更新数据
     * @returns 更新结果(包含 ID 映射表)
     */
    @Put('reports/:reportId/manual-items')
    async updateManualItems(
        @Param('reportId') reportId: string,
        @Body() dto: UpdateManualItemsDto,
    ): Promise<UpdateManualItemsResponseDto> {
        this.logger.log(
            `收到批量更新手动条目请求 - 周报 ID: ${reportId}, 条目数量: ${dto.items.length}`,
        );

        try {
            const result = await this.itemsService.updateManualItems(reportId, dto);
            this.logger.log(
                `批量更新手动条目成功 - 周报 ID: ${reportId}, 成功插入 ${result.count} 条`,
            );
            return result;
        } catch (error) {
            this.logger.error(`批量更新手动条目失败: ${error.message}`, error.stack);
            throw error;
        }
    }
}
