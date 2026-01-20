import {Injectable, Logger, NotFoundException, BadRequestException} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {Repository, DataSource} from 'typeorm';
import { ReportItemEntity } from '../../entities/report-item.entity';
import {ReportEntity} from '../../entities/report.entity';
import {
    UpdateItemDto,
    ItemResponseDto,
    UpdateManualItemsDto,
    UpdateManualItemsResponseDto,
    ManualItemDto
} from './dto/items.dto';
import {IdService} from '../id/id.service';

/**
 * 条目管理服务
 * 负责单行条目的编辑功能和批量更新自采数据
 */
@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    @InjectRepository(ReportItemEntity)
    private readonly itemRepository: Repository<ReportItemEntity>,
    @InjectRepository(ReportEntity)
    private readonly reportRepository: Repository<ReportEntity>,
    private readonly idService: IdService,
    private readonly dataSource: DataSource,
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

    /**
     * 批量更新手动条目(SELF 标签页)
     *
     * 实现要点:
     * 1. 验证周报是否存在
     * 2. 删除该周报下所有 SELF 标签页的旧条目
     * 3. 为临时 ID 生成真实 Snowflake ID
     * 4. 处理 parentId 的映射(临时 ID -> 真实 ID)
     * 5. 批量插入新条目
     * 6. 使用事务保证数据一致性
     *
     * @param reportId 周报 ID
     * @param dto 批量更新数据
     * @returns 更新结果(包含 ID 映射表)
     */
    async updateManualItems(
        reportId: string,
        dto: UpdateManualItemsDto,
    ): Promise<UpdateManualItemsResponseDto> {
        this.logger.log(`批量更新手动条目 - 周报 ID: ${reportId}, 条目数量: ${dto.items.length}`);

        // 验证周报是否存在
        const report = await this.reportRepository.findOne({
            where: {id: reportId as any, isDeleted: false},
        });

        if (!report) {
            throw new NotFoundException(`周报不存在或已删除 - ID: ${reportId}`);
        }

        // ID 映射表(临时 ID -> 真实 ID)
        const idMapping: Record<string, string> = {};

        // 使用事务保证数据一致性
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Step 1: 删除该周报下所有 SELF 标签页的旧条目
            await queryRunner.manager.delete(ReportItemEntity, {
                reportId: reportId as any,
                tabType: 'SELF',
            });

            this.logger.log(`已删除旧的 SELF 标签页条目`);

            // Step 2: 为所有临时 ID 生成真实 ID
            for (const item of dto.items) {
                if (!item.id || item.id.startsWith('temp_')) {
                    const realId = this.idService.nextId();
                    const tempId = item.id || `temp_${Date.now()}_${Math.random()}`;
                    idMapping[tempId] = realId.toString();
                } else {
                    // 如果是真实 ID,直接映射为自己
                    idMapping[item.id] = item.id;
                }
            }

            this.logger.log(`ID 映射表生成完成，共 ${Object.keys(idMapping).length} 条`);

            // Step 3: 构建新的条目实体(处理 parentId 映射)
            const newItems: ReportItemEntity[] = dto.items.map((item) => {
                // 获取真实 ID
                const tempId = item.id || `temp_${Date.now()}_${Math.random()}`;
                const realId = idMapping[tempId];

                if (!realId) {
                    throw new BadRequestException(`无法找到条目的 ID 映射 - 临时 ID: ${tempId}`);
                }

                // 处理 parentId 映射
                let realParentId: bigint | null = null;
                if (item.parentId) {
                    const mappedParentId = idMapping[item.parentId];
                    if (!mappedParentId) {
                        throw new BadRequestException(
                            `无法找到父节点的 ID 映射 - 父节点临时 ID: ${item.parentId}`,
                        );
                    }
                    realParentId = BigInt(mappedParentId);
                }

                // 创建实体
                const entity = new ReportItemEntity();
                entity.id = BigInt(realId);
                entity.reportId = BigInt(reportId);
                entity.tabType = 'SELF';
                entity.sourceType = 'MANUAL';
                entity.parentId = realParentId;
                entity.contentJson = JSON.stringify(item.contentJson);
                entity.sortOrder = item.sortOrder;

                return entity;
            });

            // Step 4: 批量插入新条目
            if (newItems.length > 0) {
                await queryRunner.manager.save(ReportItemEntity, newItems);
                this.logger.log(`成功插入 ${newItems.length} 条新条目`);
            }

            // 提交事务
            await queryRunner.commitTransaction();

            this.logger.log(`批量更新手动条目完成 - 周报 ID: ${reportId}`);

            return {
                reportId,
                count: newItems.length,
                idMapping,
            };
        } catch (error) {
            // 回滚事务
            await queryRunner.rollbackTransaction();
            this.logger.error(`批量更新手动条目失败: ${error.message}`, error.stack);
            throw error;
        } finally {
            // 释放查询运行器
            await queryRunner.release();
        }
    }
}
