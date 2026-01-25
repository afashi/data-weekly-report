import {Injectable, Logger} from '@nestjs/common';
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

        // 使用事务确保数据一致性
        return await this.dataSource.transaction(async (manager) => {
            // 1. 创建 Report 主记录
            const reportId = this.idService.nextId();
            const report = manager.create(ReportEntity, {
                id: reportId,
                weekRange,
                weekNumber,
                isDeleted: false,
            });
            await manager.save(report);
            this.logger.log(`Report 创建成功 - ID: ${reportId}`);

            // 2. 并行获取所有数据源
            const [jiraDoneTasks, jiraPlanTasks, brvMetrics, revMetrics] = await Promise.all([
                this.jiraAdapter.fetchDoneTasks(),
                this.jiraAdapter.fetchPlanTasks(),
                this.sqlAdapter.fetchBrvMetrics(weekNumber),
                this.sqlAdapter.fetchRevMetrics(weekNumber),
            ]);

            this.logger.log(
                `数据源获取完成 - Jira DONE: ${jiraDoneTasks.length}, PLAN: ${jiraPlanTasks.length}, BRV: ${brvMetrics.length}, REV: ${revMetrics.length}`,
            );

            // 3. 保存系统指标
            const metrics: SystemMetricEntity[] = [];
            const allMetrics = [...brvMetrics, ...revMetrics];

            for (const metric of allMetrics) {
                const metricId = this.idService.nextId();
                const metricEntity = manager.create(SystemMetricEntity, {
                    id: metricId,
                    reportId,
                    metricKey: metric.metricKey,
                    metricValue: metric.metricValue,
                    statusCode: metric.statusCode,
                });
                metrics.push(metricEntity);
            }

            if (metrics.length > 0) {
                await manager.save(metrics);
                this.logger.log(`保存 ${metrics.length} 条系统指标`);
            }

            // 4. 保存 Jira 任务（DONE 标签）
            const doneItems: ReportItemEntity[] = [];
            let sortOrder = 0;

            for (const task of jiraDoneTasks) {
                const itemId = this.idService.nextId();
                const itemEntity = manager.create(ReportItemEntity, {
                    id: itemId,
                    reportId,
                    tabType: 'DONE',
                    sourceType: 'JIRA',
                    parentId: null, // Jira 任务默认为根节点
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                });
                doneItems.push(itemEntity);
            }

            if (doneItems.length > 0) {
                await manager.save(doneItems);
                this.logger.log(`保存 ${doneItems.length} 条 DONE 任务`);
            }

            // 5. 保存 Jira 任务（PLAN 标签）
            const planItems: ReportItemEntity[] = [];
            sortOrder = 0;

            for (const task of jiraPlanTasks) {
                const itemId = this.idService.nextId();
                const itemEntity = manager.create(ReportItemEntity, {
                    id: itemId,
                    reportId,
                    tabType: 'PLAN',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify(task),
                    sortOrder: sortOrder++,
                });
                planItems.push(itemEntity);
            }

            if (planItems.length > 0) {
                await manager.save(planItems);
                this.logger.log(`保存 ${planItems.length} 条 PLAN 任务`);
            }

            // 6. 初始化空的 Meeting Notes（由前端手动填写）
            const noteId = this.idService.nextId();
            const note = manager.create(MeetingNoteEntity, {
                id: noteId,
                reportId,
                content: '', // 初始为空
            });
            await manager.save(note);

            this.logger.log(`周报生成完成 - Report ID: ${reportId}`);

            // 7. 构建响应 DTO
            return this.buildReportResponse(report, metrics, [...doneItems, ...planItems], note);
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
        report: ReportEntity,
        metrics: SystemMetricEntity[],
        items: ReportItemEntity[],
        note: MeetingNoteEntity,
    ): ReportResponseDto {
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
