import {Test, TestingModule} from '@nestjs/testing';
import {NotFoundException} from '@nestjs/common';
import {getRepositoryToken} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {ExportService} from './export.service';
import {ReportEntity} from '../../entities/report.entity';
import {SystemMetricEntity} from '../../entities/system-metric.entity';
import {ReportItemEntity} from '../../entities/report-item.entity';
import {MeetingNoteEntity} from '../../entities/meeting-note.entity';
import * as ExcelJS from 'exceljs';

/**
 * ExportService 单元测试
 * 测试 Excel 导出服务的核心功能
 */
describe('ExportService', () => {
    let service: ExportService;
    let reportRepository: jest.Mocked<Repository<ReportEntity>>;
    let metricRepository: jest.Mocked<Repository<SystemMetricEntity>>;
    let itemRepository: jest.Mocked<Repository<ReportItemEntity>>;
    let noteRepository: jest.Mocked<Repository<MeetingNoteEntity>>;

    // Mock 数据
    const mockReportId = '1234567890';
    const mockReport = {
        id: mockReportId as any,
        weekRange: '2026/01/27-2026/02/02',
        weekNumber: 5,
        createdAt: new Date('2026-02-01T10:00:00Z'),
        isDeleted: false,
    } as ReportEntity;

    const mockMetrics = [
        {
            id: '1001' as any,
            reportId: mockReportId as any,
            metricKey: 'TOTAL_COUNT',
            metricValue: '100',
            statusCode: 'success',
        },
        {
            id: '1002' as any,
            reportId: mockReportId as any,
            metricKey: 'PROCESS_COUNT',
            metricValue: '60',
            statusCode: 'success',
        },
    ] as SystemMetricEntity[];

    const mockDoneItems = [
        {
            id: '2001' as any,
            reportId: mockReportId as any,
            tabType: 'DONE',
            sourceType: 'JIRA',
            parentId: null,
            contentJson: JSON.stringify({
                jiraKey: 'TEST-1',
                title: '完成任务1',
                status: 'Done',
                assignee: 'User A',
            }),
            sortOrder: 1,
            isDeleted: false,
        },
    ] as ReportItemEntity[];

    const mockSelfItems = [
        {
            id: '3001' as any,
            reportId: mockReportId as any,
            tabType: 'SELF',
            sourceType: 'MANUAL',
            parentId: null,
            contentJson: JSON.stringify({
                title: '主任务1',
                assignee: 'User A',
                workDays: '5',
            }),
            sortOrder: 1,
            isDeleted: false,
        },
        {
            id: '3002' as any,
            reportId: mockReportId as any,
            tabType: 'SELF',
            sourceType: 'MANUAL',
            parentId: '3001' as any,
            contentJson: JSON.stringify({
                title: '子任务1-1',
                assignee: 'User A',
                workDays: '2',
            }),
            sortOrder: 2,
            isDeleted: false,
        },
    ] as ReportItemEntity[];

    const mockNote = {
        id: '5001' as any,
        reportId: mockReportId as any,
        content: '会议待办事项1\n会议待办事项2',
    } as MeetingNoteEntity;

    beforeEach(async () => {
        const mockRepositoryFactory = () => ({
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn((entity: any) => entity),
            save: jest.fn(),
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExportService,
                {
                    provide: getRepositoryToken(ReportEntity),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(SystemMetricEntity),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(ReportItemEntity),
                    useFactory: mockRepositoryFactory,
                },
                {
                    provide: getRepositoryToken(MeetingNoteEntity),
                    useFactory: mockRepositoryFactory,
                },
            ],
        }).compile();

        service = module.get<ExportService>(ExportService);
        reportRepository = module.get(getRepositoryToken(ReportEntity));
        metricRepository = module.get(getRepositoryToken(SystemMetricEntity));
        itemRepository = module.get(getRepositoryToken(ReportItemEntity));
        noteRepository = module.get(getRepositoryToken(MeetingNoteEntity));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    /**
     * Task-020-1: 测试模板加载
     * 验证周报不存在时抛出异常
     */
    describe('Template Loading', () => {
        it('should throw NotFoundException when report does not exist', async () => {
            reportRepository.findOne.mockResolvedValue(null);

            await expect(service.exportReport(mockReportId)).rejects.toThrow(
                NotFoundException,
            );

            await expect(service.exportReport(mockReportId)).rejects.toThrow(
                `周报不存在或已删除 - ID: ${mockReportId}`,
            );
        });

        it('should load report data successfully', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue([]);
            itemRepository.find.mockResolvedValue([]);
            noteRepository.findOne.mockResolvedValue(null);

            const buffer = await service.exportReport(mockReportId);

            expect(reportRepository.findOne).toHaveBeenCalledWith({
                where: {id: mockReportId as any, isDeleted: false},
            });
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });

    /**
     * Task-020-2: 测试数据填充
     * 验证 Excel 工作簿生成和数据填充
     */
    describe('Data Population', () => {
        it('should generate valid Excel workbook with all sheets', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue(mockMetrics);
            itemRepository.find.mockResolvedValue([
                ...mockDoneItems,
                ...mockSelfItems,
            ]);
            noteRepository.findOne.mockResolvedValue(mockNote);

            const buffer = await service.exportReport(mockReportId);

            // 验证可以加载生成的 Excel 文件
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            // 验证工作表数量（概览、本周完成、自采数据、后续计划、会议待办）
            expect(workbook.worksheets.length).toBe(5);

            // 验证工作表名称
            expect(workbook.getWorksheet('概览')).toBeDefined();
            expect(workbook.getWorksheet('本周完成')).toBeDefined();
            expect(workbook.getWorksheet('自采数据')).toBeDefined();
            expect(workbook.getWorksheet('后续计划')).toBeDefined();
            expect(workbook.getWorksheet('会议待办')).toBeDefined();
        });

        it('should populate overview sheet correctly', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue(mockMetrics);
            itemRepository.find.mockResolvedValue([]);
            noteRepository.findOne.mockResolvedValue(null);

            const buffer = await service.exportReport(mockReportId);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            const sheet = workbook.getWorksheet('概览');
            expect(sheet).toBeDefined();

            if (sheet) {
                // 验证标题行
                expect(sheet.getRow(1).getCell(1).value).toBe('数据周报');
                expect(sheet.getRow(2).getCell(2).value).toBe(mockReport.weekRange);
                expect(sheet.getRow(3).getCell(2).value).toBe(`第 ${mockReport.weekNumber} 周`);

                // 验证指标数据
                expect(sheet.getRow(7).getCell(1).value).toBe('总计');
                expect(sheet.getRow(7).getCell(2).value).toBe('100');
            }
        });

        it('should populate done sheet correctly', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue([]);
            itemRepository.find.mockResolvedValue(mockDoneItems);
            noteRepository.findOne.mockResolvedValue(null);

            const buffer = await service.exportReport(mockReportId);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            const sheet = workbook.getWorksheet('本周完成');
            expect(sheet).toBeDefined();

            if (sheet) {
                // 验证表头
                expect(sheet.getRow(1).getCell(1).value).toBe('Jira号');
                expect(sheet.getRow(1).getCell(2).value).toBe('任务名称');

                // 验证数据行
                expect(sheet.getRow(2).getCell(1).value).toBe('TEST-1');
                expect(sheet.getRow(2).getCell(2).value).toBe('完成任务1');
            }
        });

        it('should populate self sheet with tree structure', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue([]);
            itemRepository.find.mockResolvedValue(mockSelfItems);
            noteRepository.findOne.mockResolvedValue(null);

            const buffer = await service.exportReport(mockReportId);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            const sheet = workbook.getWorksheet('自采数据');
            expect(sheet).toBeDefined();

            if (sheet) {
                // 验证根节点
                expect(sheet.getRow(2).getCell(1).value).toBe('主任务1');

                // 验证子节点（带缩进）
                expect(sheet.getRow(3).getCell(1).value).toBe('  └─ 子任务1-1');

                // 验证根节点样式（加粗）
                expect(sheet.getRow(2).font?.bold).toBe(true);

                // 验证子节点样式（灰色字体）
                expect(sheet.getRow(3).font?.color?.argb).toBe('FF666666');
            }
        });

        it('should populate notes sheet correctly', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue([]);
            itemRepository.find.mockResolvedValue([]);
            noteRepository.findOne.mockResolvedValue(mockNote);

            const buffer = await service.exportReport(mockReportId);

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            const sheet = workbook.getWorksheet('会议待办');
            expect(sheet).toBeDefined();

            if (sheet) {
                // 验证标题
                expect(sheet.getRow(1).getCell(1).value).toBe('会议待办事项');

                // 验证内容（按行分割）
                expect(sheet.getRow(3).getCell(1).value).toBe('会议待办事项1');
                expect(sheet.getRow(4).getCell(1).value).toBe('会议待办事项2');
            }
        });
    });

    /**
     * Task-020-3: 测试通过
     * 验证性能和边界情况
     */
    describe('Performance and Edge Cases', () => {
        it('should export report within reasonable time', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue(mockMetrics);
            itemRepository.find.mockResolvedValue(mockDoneItems);
            noteRepository.findOne.mockResolvedValue(mockNote);

            const startTime = Date.now();
            await service.exportReport(mockReportId);
            const endTime = Date.now();

            const duration = endTime - startTime;

            // 导出应该在 1 秒内完成（测试环境）
            expect(duration).toBeLessThan(1000);
        });

        it('should handle empty data gracefully', async () => {
            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue([]);
            itemRepository.find.mockResolvedValue([]);
            noteRepository.findOne.mockResolvedValue(null);

            const buffer = await service.exportReport(mockReportId);

            expect(buffer).toBeInstanceOf(Buffer);
            expect(buffer.length).toBeGreaterThan(0);
        });

        it('should handle large dataset efficiently', async () => {
            // 生成大量数据
            const largeItems: ReportItemEntity[] = [];
            for (let i = 0; i < 500; i++) {
                largeItems.push({
                    id: `${3000 + i}` as any,
                    reportId: mockReportId as any,
                    tabType: 'DONE',
                    sourceType: 'JIRA',
                    parentId: null,
                    contentJson: JSON.stringify({
                        jiraKey: `TEST-${i}`,
                        title: `任务${i}`,
                    }),
                    sortOrder: i,
                    isDeleted: false,
                } as ReportItemEntity);
            }

            reportRepository.findOne.mockResolvedValue(mockReport);
            metricRepository.find.mockResolvedValue(mockMetrics);
            itemRepository.find.mockResolvedValue(largeItems);
            noteRepository.findOne.mockResolvedValue(mockNote);

            const startTime = Date.now();
            const buffer = await service.exportReport(mockReportId);
            const endTime = Date.now();

            const duration = endTime - startTime;

            // 500 行数据应该在 2 秒内完成
            expect(duration).toBeLessThan(2000);
            expect(buffer).toBeInstanceOf(Buffer);
        });
    });
});
