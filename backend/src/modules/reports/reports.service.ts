import {Injectable, Logger, NotFoundException} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {ReportEntity} from '../../entities/report.entity';
import {SystemMetricEntity} from '../../entities/system-metric.entity';
import {ReportItemEntity} from '../../entities/report-item.entity';
import {MeetingNoteEntity} from '../../entities/meeting-note.entity';
import {IdService} from '../id/id.service';
import {
    GetReportsDto,
    ReportDetailResponseDto,
    ReportListItemDto,
    ReportListResponseDto,
    UpdateManualItemsDto,
} from './dto/reports.dto';

/**
 * 周报管理服务
 * 负责历史周报的查询、详情获取和软删除
 */
@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);

    constructor(
        @InjectRepository(ReportEntity)
        private readonly reportRepository: Repository<ReportEntity>,
        @InjectRepository(SystemMetricEntity)
        private readonly metricRepository: Repository<SystemMetricEntity>,
        @InjectRepository(ReportItemEntity)
        private readonly itemRepository: Repository<ReportItemEntity>,
        @InjectRepository(MeetingNoteEntity)
        private readonly noteRepository: Repository<MeetingNoteEntity>,
        private readonly dataSource: DataSource,
        private readonly idService: IdService,
    ) {
    }

    /**
     * 获取历史周报列表（分页）
     * @param dto 查询参数
     * @returns 周报列表
     */
    async getReports(dto: GetReportsDto): Promise<ReportListResponseDto> {
        const {page = 1, pageSize = 20} = dto;
        const skip = (page - 1) * pageSize;

        this.logger.log(`查询周报列表 - 页码: ${page}, 每页: ${pageSize}`);

        // 查询未删除的周报，按创建时间倒序
        const [reports, total] = await this.reportRepository.findAndCount({
            where: {isDeleted: false},
            order: {createdAt: 'DESC'},
            skip,
            take: pageSize,
        });

        const items: ReportListItemDto[] = reports.map((report) => ({
            id: report.id.toString(),
            weekRange: report.weekRange,
            weekNumber: report.weekNumber,
            createdAt: report.createdAt.toISOString(),
        }));

        const totalPages = Math.ceil(total / pageSize);

        this.logger.log(`查询完成 - 总数: ${total}, 当前页: ${items.length} 条`);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages,
        };
    }

    /**
     * 获取指定周报详情（包含所有关联数据）
     * @param id 周报 ID
     * @returns 周报详情
     */
    async getReportById(id: string): Promise<ReportDetailResponseDto> {
        this.logger.log(`查询周报详情 - ID: ${id}`);

        // 使用 findOne 方法，会正确应用 BaseIdEntity 的 transformer
        const report = await this.reportRepository.findOne({
            where: {
                id: id as any,
                isDeleted: false,
            },
        });

        if (!report) {
            throw new NotFoundException(`周报不存在或已删除 - ID: ${id}`);
        }

        // 并行查询所有关联数据
        const [metrics, items, noteEntity] = await Promise.all([
            this.metricRepository.find({
                where: {reportId: id as any},
                order: {id: 'ASC'},
            }),
            this.itemRepository.find({
                where: {reportId: id as any},
                order: {tabType: 'ASC', sortOrder: 'ASC'},
            }),
            this.noteRepository.findOne({
                where: {reportId: id as any},
            }),
        ]);

        this.logger.log(
            `查询完成 - Metrics: ${metrics.length}, Items: ${items.length}, Notes: ${noteEntity ? '有' : '无'}`,
        );

        // 组装响应数据
        return {
            id: report.id.toString(),
            weekRange: report.weekRange,
            weekNumber: report.weekNumber,
            createdAt: report.createdAt.toISOString(),
            metrics: metrics.map((m) => ({
                id: m.id.toString(),
                metricKey: m.metricKey,
                metricValue: m.metricValue,
                statusCode: m.statusCode,
            })),
            items: items.map((item) => ({
                id: item.id.toString(),
                tabType: item.tabType,
                sourceType: item.sourceType,
                parentId: item.parentId ? item.parentId.toString() : null,
                contentJson: JSON.parse(item.contentJson),
                sortOrder: item.sortOrder,
            })),
            notes: noteEntity?.content || '',
        };
    }

    /**
     * 软删除周报
     * @param id 周报 ID
     */
    async deleteReport(id: string): Promise<void> {
        this.logger.log(`软删除周报 - ID: ${id}`);

        // 使用 findOne 方法，会正确应用 BaseIdEntity 的 transformer
        const report = await this.reportRepository.findOne({
            where: {
                id: id as any,
                isDeleted: false,
            },
        });

        if (!report) {
            throw new NotFoundException(`周报不存在或已删除 - ID: ${id}`);
        }

        // 执行软删除
        report.isDeleted = true;
        await this.reportRepository.save(report);

        this.logger.log(`软删除成功 - ID: ${id}`);
    }

    /**
     * 全量更新自采数据（SELF 标签页的树形数据）
     * @param reportId 周报 ID
     * @param dto 更新数据
     * @returns 更新后的条目列表
     */
    async updateManualItems(reportId: string, dto: UpdateManualItemsDto): Promise<any[]> {
        this.logger.log(`更新自采数据 - 周报ID: ${reportId}, 条目数: ${dto.items.length}`);

        // 使用 findOne 方法验证周报是否存在
        const report = await this.reportRepository.findOne({
            where: {
                id: reportId as any,
                isDeleted: false,
            },
        });

        if (!report) {
            throw new NotFoundException(`周报不存在或已删除 - ID: ${reportId}`);
        }

        // 使用事务确保数据一致性
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. 删除该周报下所有 SELF 标签的 MANUAL 来源条目
            await queryRunner.manager.delete(ReportItemEntity, {
                reportId: reportId as any,
                tabType: 'SELF',
                sourceType: 'MANUAL',
            });

            this.logger.log(`已删除旧的自采数据`);

            // 2. ID 映射表（临时 ID → 真实 Snowflake ID）
            const idMap = new Map<string, string>();

            // 3. 第一遍遍历：为所有条目生成真实 ID
            for (const item of dto.items) {
                const realId = this.idService.nextId().toString();
                if (item.id) {
                    idMap.set(item.id, realId);
                }
            }

            // 4. 第二遍遍历：插入新条目
            const newItems: ReportItemEntity[] = [];
            for (const item of dto.items) {
                const realId = item.id ? idMap.get(item.id) : this.idService.nextId().toString();
                const realParentId = item.parentId ? idMap.get(item.parentId) : null;

                const entity = queryRunner.manager.create(ReportItemEntity, {
                    id: realId as any,
                    reportId: reportId as any,
                    tabType: 'SELF',
                    sourceType: 'MANUAL',
                    parentId: realParentId as any,
                    contentJson: JSON.stringify(item.contentJson),
                    sortOrder: item.sortOrder,
                });

                newItems.push(entity);
            }

            // 批量插入
            await queryRunner.manager.save(ReportItemEntity, newItems);

            this.logger.log(`已插入 ${newItems.length} 条新的自采数据`);

            // 提交事务
            await queryRunner.commitTransaction();

            // 返回更新后的数据
            return newItems.map((item) => ({
                id: item.id.toString(),
                reportId: item.reportId.toString(),
                tabType: item.tabType,
                sourceType: item.sourceType,
                parentId: item.parentId ? item.parentId.toString() : null,
                contentJson: JSON.parse(item.contentJson),
                sortOrder: item.sortOrder,
            }));
        } catch (error) {
            // 回滚事务
            await queryRunner.rollbackTransaction();
            this.logger.error(`更新自采数据失败: ${error.message}`, error.stack);
            throw error;
        } finally {
            // 释放连接
            await queryRunner.release();
        }
    }
}
