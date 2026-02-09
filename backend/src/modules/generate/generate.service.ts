import {ConflictException, Injectable, Logger} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {endOfWeek, format, getWeek, startOfWeek} from 'date-fns';
import {ReportEntity} from '../../entities/report.entity';
import {SystemMetricEntity} from '../../entities/system-metric.entity';
import {ReportItemEntity} from '../../entities/report-item.entity';
import {MeetingNoteEntity} from '../../entities/meeting-note.entity';
import {JiraAdapter} from './adapters/jira.adapter';
import {SqlAdapter} from './adapters/sql.adapter';
import {IdService} from '../id/id.service';
import {GenerateReportDto, ReportResponseDto} from './dto/generate.dto';

/**
 * 周报生成服务
 * 核心业务逻辑：整合 Jira、SQL 数据源，生成周报
 */
@Injectable()
export class GenerateService {
    private readonly logger = new Logger(GenerateService.name);

    constructor(
        @InjectRepository(ReportEntity)
        private readonly reportRepository: Repository<ReportEntity>,
        @InjectRepository(SystemMetricEntity)
        private readonly metricRepository: Repository<SystemMetricEntity>,
        @InjectRepository(ReportItemEntity)
        private readonly itemRepository: Repository<ReportItemEntity>,
        @InjectRepository(MeetingNoteEntity)
        private readonly noteRepository: Repository<MeetingNoteEntity>,
        private readonly jiraAdapter: JiraAdapter,
        private readonly sqlAdapter: SqlAdapter,
        private readonly idService: IdService,
        private readonly dataSource: DataSource,
    ) {
    }

    /**
     * 生成新周报
     * @param dto 生成参数（可选周范围）
     * @returns 生成的周报数据
     */
    async generateReport(dto: GenerateReportDto = {}): Promise<ReportResponseDto> {
        const now = new Date();
        const weekRange = dto.weekRange || this.calculateWeekRange(now);
        const weekNumber = dto.weekNumber || this.calculateWeekNumber(now);

        this.logger.log(`开始生成周报 - 周范围: ${weekRange}, 周数: ${weekNumber}`);

        // 检查是否已存在同一周期的周报
        const existing = await this.reportRepository.findOne({
            where: {weekRange, isDeleted: false},
        });

        if (existing && !dto.overwrite) {
            throw new ConflictException(`周报已存在: ${weekRange}，如需更新请设置overwrite=true`);
        }

        if (existing && dto.overwrite) {
            this.logger.log(`更新模式 - 现有周报ID: ${existing.id}`);
            // 更新模式：删除旧数据，保留ID
            return await this.updateReport(existing.id, weekRange, weekNumber);
        }

        // 第一阶段：并行获取外部数据（不在事务内）
        const reportId = this.idService.nextId();
        const [jiraDoneTasks, jiraPlanTasks, brvMetrics, revMetrics] = await Promise.all([
            this.jiraAdapter.fetchDoneTasks(),
            this.jiraAdapter.fetchPlanTasks(),
            this.sqlAdapter.fetchBrvMetrics(weekNumber),
            this.sqlAdapter.fetchRevMetrics(weekNumber),
        ]);

        this.logger.log(
            `数据源获取完成 - Jira DONE: ${jiraDoneTasks.length}, PLAN: ${jiraPlanTasks.length}, BRV: ${brvMetrics.length}, REV: ${revMetrics.length}`,
        );

        const metrics: SystemMetricEntity[] = [];
        const allMetrics = [...brvMetrics, ...revMetrics];

        for (const metric of allMetrics) {
            const metricId = this.idService.nextId();
            metrics.push(
                this.metricRepository.create({
                    id: metricId,
                    reportId,
                    metricKey: metric.metricKey,
                    metricValue: metric.metricValue,
                    statusCode: metric.statusCode,
                }),
            );
        }

        const doneItems: ReportItemEntity[] = [];
        let sortOrder = 0;

        for (const task of jiraDoneTasks) {
            const itemId = this.idService.nextId();
            doneItems.push(
                this.itemRepository.create({
                    id: itemId,
                    reportId,
                    tabType: 'DONE',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                }),
            );
        }

        const planItems: ReportItemEntity[] = [];
        sortOrder = 0;

        for (const task of jiraPlanTasks) {
            const itemId = this.idService.nextId();
            planItems.push(
                this.itemRepository.create({
                    id: itemId,
                    reportId,
                    tabType: 'PLAN',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                }),
            );
        }

        const note = this.noteRepository.create({
            id: this.idService.nextId(),
            reportId,
            content: '',
        });
        const reportData = this.reportRepository.create({
            id: reportId,
            weekRange,
            weekNumber,
            isDeleted: false,
        });

        // 第二阶段：事务内快速写入
        return await this.dataSource.transaction(async (manager) => {
            // 1. 创建 Report 主记录
            const report = await manager.save(ReportEntity, reportData);
            this.logger.log(`Report 创建成功 - ID: ${reportId}`);

            // 2. 保存系统指标
            if (metrics.length > 0) {
                await manager.save(SystemMetricEntity, metrics);
                this.logger.log(`保存 ${metrics.length} 条系统指标`);
            }

            // 3. 保存 Jira 任务（DONE 标签）
            if (doneItems.length > 0) {
                await manager.save(ReportItemEntity, doneItems);
                this.logger.log(`保存 ${doneItems.length} 条 DONE 任务`);
            }

            // 4. 保存 Jira 任务（PLAN 标签）
            if (planItems.length > 0) {
                await manager.save(ReportItemEntity, planItems);
                this.logger.log(`保存 ${planItems.length} 条 PLAN 任务`);
            }

            // 5. 初始化空的 Meeting Notes（由前端手动填写）
            await manager.save(MeetingNoteEntity, note);

            this.logger.log(`周报生成完成 - Report ID: ${reportId}`);

            // 6. 构建响应 DTO（使用原始 reportId 而不是 report.id）
            return this.buildReportResponse(reportId, report, metrics, [...doneItems, ...planItems], note);
        });
    }

    /**
     * 健康检查 - 验证所有适配器连接
     */
    async healthCheck(): Promise<{
        jira: boolean;
        sql: Map<string, boolean>;
        database: boolean;
    }> {
        const [jiraOk, sqlStatus] = await Promise.all([
            this.jiraAdapter.healthCheck(),
            this.sqlAdapter.healthCheck(),
        ]);

        // 检查本地数据库连接
        let databaseOk = false;
        try {
            await this.dataSource.query('SELECT 1');
            databaseOk = true;
        } catch (error) {
            this.logger.error(`数据库健康检查失败: ${error.message}`);
        }

        return {
            jira: jiraOk,
            sql: sqlStatus,
            database: databaseOk,
        };
    }

    /**
     * 更新现有周报
     * @param reportId 现有周报ID
     * @param weekRange 周范围
     * @param weekNumber 周数
     * @returns 更新后的周报数据
     */
    private async updateReport(reportId: string, weekRange: string, weekNumber: number): Promise<ReportResponseDto> {
        // 第一阶段：并行获取外部数据（不在事务内）
        const [jiraDoneTasks, jiraPlanTasks, brvMetrics, revMetrics] = await Promise.all([
            this.jiraAdapter.fetchDoneTasks(),
            this.jiraAdapter.fetchPlanTasks(),
            this.sqlAdapter.fetchBrvMetrics(weekNumber),
            this.sqlAdapter.fetchRevMetrics(weekNumber),
        ]);

        this.logger.log(
            `数据源获取完成 - Jira DONE: ${jiraDoneTasks.length}, PLAN: ${jiraPlanTasks.length}, BRV: ${brvMetrics.length}, REV: ${revMetrics.length}`,
        );

        const metrics: SystemMetricEntity[] = [];
        const allMetrics = [...brvMetrics, ...revMetrics];

        for (const metric of allMetrics) {
            const metricId = this.idService.nextId();
            metrics.push(
                this.metricRepository.create({
                    id: metricId,
                    reportId,
                    metricKey: metric.metricKey,
                    metricValue: metric.metricValue,
                    statusCode: metric.statusCode,
                }),
            );
        }

        const allItems: ReportItemEntity[] = [];
        let sortOrder = 0;

        for (const task of jiraDoneTasks) {
            const itemId = this.idService.nextId();
            allItems.push(
                this.itemRepository.create({
                    id: itemId,
                    reportId,
                    tabType: 'DONE',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                }),
            );
        }

        for (const task of jiraPlanTasks) {
            const itemId = this.idService.nextId();
            allItems.push(
                this.itemRepository.create({
                    id: itemId,
                    reportId,
                    tabType: 'PLAN',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                }),
            );
        }

        const note = this.noteRepository.create({
            id: this.idService.nextId(),
            reportId,
            content: '',
        });

        // 第二阶段：事务内快速写入
        return await this.dataSource.transaction(async (manager) => {
            // 1. 删除旧的关联数据
            await manager.delete(SystemMetricEntity, {reportId: reportId as any});
            await manager.delete(ReportItemEntity, {reportId: reportId as any});
            await manager.delete(MeetingNoteEntity, {reportId: reportId as any});

            this.logger.log(`已删除旧数据 - Report ID: ${reportId}`);

            // 2. 更新Report主记录的时间戳
            await manager.update(ReportEntity, reportId as any, {
                weekRange,
                weekNumber,
            });

            const report = await manager.findOne(ReportEntity, {
                where: {id: reportId as any},
            });

            if (!report) {
                throw new Error(`周报不存在 - ID: ${reportId}`);
            }

            // 3. 保存系统指标
            if (metrics.length > 0) {
                await manager.save(SystemMetricEntity, metrics);
                this.logger.log(`保存 ${metrics.length} 条系统指标`);
            }

            // 4. 保存 Jira 任务（DONE 和 PLAN）
            if (allItems.length > 0) {
                await manager.save(ReportItemEntity, allItems);
                this.logger.log(`保存 ${allItems.length} 条任务`);
            }

            // 5. 初始化空的 Meeting Notes
            await manager.save(MeetingNoteEntity, note);

            this.logger.log(`周报更新完成 - Report ID: ${reportId}`);

            // 6. 构建响应 DTO（使用原始 reportId 而不是 report.id）
            return this.buildReportResponse(reportId, report, metrics, allItems, note);
        });
    }

    /**
     * 计算周范围字符串
     * @param date 基准日期
     * @returns 格式：2026/01/12-2026/01/18
     */
    private calculateWeekRange(date: Date): string {
        const start = startOfWeek(date, {weekStartsOn: 1}); // 周一开始
        const end = endOfWeek(date, {weekStartsOn: 1}); // 周日结束
        return `${format(start, 'yyyy/MM/dd')}-${format(end, 'yyyy/MM/dd')}`;
    }

    /**
     * 计算年度周数
     * @param date 基准日期
     * @returns 周数（1-53）
     */
    private calculateWeekNumber(date: Date): number {
        return getWeek(date, {weekStartsOn: 1});
    }

    /**
     * 构建响应 DTO
     */
    private buildReportResponse(
        reportId: string,
        report: ReportEntity,
        metrics: SystemMetricEntity[],
        items: ReportItemEntity[],
        note: MeetingNoteEntity,
    ): ReportResponseDto {
        return {
            id: reportId,
            weekRange: report.weekRange,
            weekNumber: report.weekNumber,
            createdAt: report.createdAt.toISOString(),
            metrics: metrics.map((m) => ({
                id: m.id.toString(),
                metricKey: m.metricKey,
                metricValue: m.metricValue,
                statusCode: m.statusCode,
            })),
            items: items.map((i) => ({
                id: i.id.toString(),
                tabType: i.tabType,
                sourceType: i.sourceType,
                parentId: i.parentId?.toString(),
                contentJson: i.contentJson,
                sortOrder: i.sortOrder,
            })),
            notes: note.content,
        };
    }
}
