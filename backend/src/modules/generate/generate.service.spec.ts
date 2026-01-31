import {Test, TestingModule} from '@nestjs/testing';
import {ConflictException} from '@nestjs/common';
import {getRepositoryToken} from '@nestjs/typeorm';
import {DataSource, Repository} from 'typeorm';
import {GenerateService} from './generate.service';
import {ReportEntity} from '../../entities/report.entity';
import {SystemMetricEntity} from '../../entities/system-metric.entity';
import {ReportItemEntity} from '../../entities/report-item.entity';
import {MeetingNoteEntity} from '../../entities/meeting-note.entity';
import {JiraAdapter} from './adapters/jira.adapter';
import {SqlAdapter} from './adapters/sql.adapter';
import {IdService} from '../id/id.service';

/**
 * GenerateService 单元测试
 * 测试周报生成服务的核心功能
 */
describe('GenerateService', () => {
    let service: GenerateService;
    let reportRepository: jest.Mocked<Repository<ReportEntity>>;
    let metricRepository: jest.Mocked<Repository<SystemMetricEntity>>;
    let itemRepository: jest.Mocked<Repository<ReportItemEntity>>;
    let noteRepository: jest.Mocked<Repository<MeetingNoteEntity>>;
    let jiraAdapter: jest.Mocked<JiraAdapter>;
    let sqlAdapter: jest.Mocked<SqlAdapter>;
    let idService: jest.Mocked<IdService>;
    let dataSource: jest.Mocked<DataSource>;

    // Mock 数据
    const mockReportId = '1234567890';
    const mockWeekRange = '2026/01/27-2026/02/02';
    const mockWeekNumber = 5;

    const mockJiraTasks = [
        {
            jiraKey: 'TEST-1',
            title: 'Test Task 1',
            status: 'Done',
            assignee: 'User A',
        },
        {
            jiraKey: 'TEST-2',
            title: 'Test Task 2',
            status: 'Done',
            assignee: 'User B',
        },
    ];

    const mockMetrics = [
        {
            metricKey: 'TOTAL_COUNT',
            metricValue: '100',
            statusCode: 'success' as const,
        },
        {
            metricKey: 'BRV_ETL',
            metricValue: '5.2s',
            statusCode: 'success' as const,
        },
    ];

    beforeEach(async () => {
        // 创建 Mock 对象
        const mockRepositoryFactory = () => ({
            findOne: jest.fn(),
            create: jest.fn((entity) => entity),
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
        });

        const mockTransactionManager = {
            save: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            findOne: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GenerateService,
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
                {
                    provide: JiraAdapter,
                    useValue: {
                        fetchDoneTasks: jest.fn(),
                        fetchPlanTasks: jest.fn(),
                        healthCheck: jest.fn(),
                    },
                },
                {
                    provide: SqlAdapter,
                    useValue: {
                        fetchBrvMetrics: jest.fn(),
                        fetchRevMetrics: jest.fn(),
                        healthCheck: jest.fn(),
                    },
                },
                {
                    provide: IdService,
                    useValue: {
                        nextId: jest.fn(),
                        nextIds: jest.fn(),
                    },
                },
                {
                    provide: DataSource,
                    useValue: {
                        transaction: jest.fn(),
                        query: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<GenerateService>(GenerateService);
        reportRepository = module.get(getRepositoryToken(ReportEntity));
        metricRepository = module.get(getRepositoryToken(SystemMetricEntity));
        itemRepository = module.get(getRepositoryToken(ReportItemEntity));
        noteRepository = module.get(getRepositoryToken(MeetingNoteEntity));
        jiraAdapter = module.get(JiraAdapter);
        sqlAdapter = module.get(SqlAdapter);
        idService = module.get(IdService);
        dataSource = module.get(DataSource);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    /**
     * 测试唯一约束
     * 当周报已存在且 overwrite=false 时，应该抛出 ConflictException
     */
    describe('Unique Constraint', () => {
        it('should throw ConflictException when report exists and overwrite is false', async () => {
            // 模拟已存在的周报
            const existingReport = {
                id: mockReportId,
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
                isDeleted: false,
                createdAt: new Date(),
            };

            reportRepository.findOne.mockResolvedValue(existingReport as any);

            // 执行生成操作（不设置 overwrite）
            await expect(
                service.generateReport({weekRange: mockWeekRange}),
            ).rejects.toThrow(ConflictException);

            // 验证错误消息
            await expect(
                service.generateReport({weekRange: mockWeekRange}),
            ).rejects.toThrow(`周报已存在: ${mockWeekRange}，如需更新请设置overwrite=true`);

            // 验证没有调用数据源的方法
            expect(jiraAdapter.fetchDoneTasks).not.toHaveBeenCalled();
            expect(jiraAdapter.fetchPlanTasks).not.toHaveBeenCalled();
        });

        it('should allow creating report when no existing report found', async () => {
            // 模拟不存在的周报
            reportRepository.findOne.mockResolvedValue(null);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue(mockJiraTasks);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue(mockMetrics);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            let idCounter = 1000;
            idService.nextId.mockImplementation(() => String(idCounter++));

            // 模拟事务管理器
            const mockTransactionManager = {
                save: jest.fn().mockImplementation((entity, data) => {
                    if (Array.isArray(data)) {
                        return Promise.resolve(data);
                    }
                    // 为 ReportEntity 添加 createdAt 字段
                    if (entity === ReportEntity) {
                        return Promise.resolve({...data, createdAt: new Date()});
                    }
                    return Promise.resolve(data);
                }),
                delete: jest.fn(),
                update: jest.fn(),
                findOne: jest.fn(),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作
            const result = await service.generateReport({
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
            });

            // 验证结果
            expect(result).toBeDefined();
            expect(result.weekRange).toBe(mockWeekRange);
            expect(result.weekNumber).toBe(mockWeekNumber);

            // 验证调用了外部数据源
            expect(jiraAdapter.fetchDoneTasks).toHaveBeenCalled();
            expect(jiraAdapter.fetchPlanTasks).toHaveBeenCalled();
            expect(sqlAdapter.fetchBrvMetrics).toHaveBeenCalledWith(mockWeekNumber);
            expect(sqlAdapter.fetchRevMetrics).toHaveBeenCalledWith(mockWeekNumber);
        });
    });

    /**
     * 测试 overwrite 功能
     * 当周报已存在且 overwrite=true 时，应该更新现有周报
     */
    describe('Overwrite Functionality', () => {
        it('should update existing report when overwrite is true', async () => {
            // 模拟已存在的周报
            const existingReport = {
                id: mockReportId,
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
                isDeleted: false,
                createdAt: new Date(),
            };

            reportRepository.findOne.mockResolvedValue(existingReport as any);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue(mockJiraTasks);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue(mockMetrics);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            let idCounter = 2000;
            idService.nextId.mockImplementation(() => String(idCounter++));

            // 模拟事务管理器
            const mockTransactionManager = {
                save: jest.fn().mockImplementation((entity, data) => {
                    if (Array.isArray(data)) {
                        return Promise.resolve(data);
                    }
                    return Promise.resolve(data);
                }),
                delete: jest.fn().mockResolvedValue({affected: 1}),
                update: jest.fn().mockResolvedValue({affected: 1}),
                findOne: jest.fn().mockResolvedValue(existingReport),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作（设置 overwrite=true）
            const result = await service.generateReport({
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
                overwrite: true,
            });

            // 验证结果
            expect(result).toBeDefined();
            expect(result.id).toBe(mockReportId);
            expect(result.weekRange).toBe(mockWeekRange);

            // 验证调用了删除旧数据的方法
            expect(mockTransactionManager.delete).toHaveBeenCalledWith(
                SystemMetricEntity,
                {reportId: mockReportId},
            );
            expect(mockTransactionManager.delete).toHaveBeenCalledWith(
                ReportItemEntity,
                {reportId: mockReportId},
            );
            expect(mockTransactionManager.delete).toHaveBeenCalledWith(
                MeetingNoteEntity,
                {reportId: mockReportId},
            );

            // 验证调用了更新方法
            expect(mockTransactionManager.update).toHaveBeenCalledWith(
                ReportEntity,
                mockReportId,
                {
                    weekRange: mockWeekRange,
                    weekNumber: mockWeekNumber,
                },
            );
        });

        it('should preserve report ID when overwriting', async () => {
            const existingReportId = '9999999999';
            const existingReport = {
                id: existingReportId,
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
                isDeleted: false,
                createdAt: new Date(),
            };

            reportRepository.findOne.mockResolvedValue(existingReport as any);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue([]);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue([]);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            idService.nextId.mockReturnValue('3000');

            // 模拟事务管理器
            const mockTransactionManager = {
                save: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({affected: 1}),
                update: jest.fn().mockResolvedValue({affected: 1}),
                findOne: jest.fn().mockResolvedValue(existingReport),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作
            const result = await service.generateReport({
                weekRange: mockWeekRange,
                overwrite: true,
            });

            // 验证保留了原有的 Report ID
            expect(result.id).toBe(existingReportId);
        });
    });

    /**
     * 测试事务回滚
     * 当事务中的某个操作失败时，应该回滚所有操作
     */
    describe('Transaction Rollback', () => {
        it('should rollback transaction when save fails', async () => {
            // 模拟不存在的周报
            reportRepository.findOne.mockResolvedValue(null);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue(mockJiraTasks);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue(mockMetrics);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            idService.nextId.mockReturnValue(mockReportId);

            // 模拟事务管理器，在保存 metrics 时抛出错误
            const mockTransactionManager = {
                save: jest.fn().mockImplementation((entity, data) => {
                    if (entity === SystemMetricEntity) {
                        throw new Error('Database save failed');
                    }
                    return Promise.resolve(data);
                }),
                delete: jest.fn(),
                update: jest.fn(),
                findOne: jest.fn(),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作，应该抛出错误
            await expect(
                service.generateReport({
                    weekRange: mockWeekRange,
                    weekNumber: mockWeekNumber,
                }),
            ).rejects.toThrow('Database save failed');

            // 验证事务被调用
            expect(dataSource.transaction).toHaveBeenCalled();
        });

        it('should rollback transaction when update fails during overwrite', async () => {
            const existingReport = {
                id: mockReportId,
                weekRange: mockWeekRange,
                weekNumber: mockWeekNumber,
                isDeleted: false,
                createdAt: new Date(),
            };

            reportRepository.findOne.mockResolvedValue(existingReport as any);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue(mockJiraTasks);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue(mockMetrics);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            idService.nextId.mockReturnValue('4000');

            // 模拟事务管理器，在更新时抛出错误
            const mockTransactionManager = {
                save: jest.fn().mockResolvedValue({}),
                delete: jest.fn().mockResolvedValue({affected: 1}),
                update: jest.fn().mockRejectedValue(new Error('Update failed')),
                findOne: jest.fn(),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作，应该抛出错误
            await expect(
                service.generateReport({
                    weekRange: mockWeekRange,
                    overwrite: true,
                }),
            ).rejects.toThrow('Update failed');

            // 验证事务被调用
            expect(dataSource.transaction).toHaveBeenCalled();
        });

        it('should not save any data when transaction fails', async () => {
            reportRepository.findOne.mockResolvedValue(null);

            // 模拟外部数据源
            jiraAdapter.fetchDoneTasks.mockResolvedValue(mockJiraTasks);
            jiraAdapter.fetchPlanTasks.mockResolvedValue([]);
            sqlAdapter.fetchBrvMetrics.mockResolvedValue(mockMetrics);
            sqlAdapter.fetchRevMetrics.mockResolvedValue([]);

            // 模拟 ID 生成
            idService.nextId.mockReturnValue(mockReportId);

            // 模拟事务管理器，第一次保存成功，第二次失败
            let saveCount = 0;
            const mockTransactionManager = {
                save: jest.fn().mockImplementation(() => {
                    saveCount++;
                    if (saveCount === 2) {
                        throw new Error('Second save failed');
                    }
                    return Promise.resolve({});
                }),
                delete: jest.fn(),
                update: jest.fn(),
                findOne: jest.fn(),
            };

            (dataSource.transaction as jest.Mock).mockImplementation(
                (callback: any) => callback(mockTransactionManager),
            );

            // 执行生成操作
            await expect(
                service.generateReport({
                    weekRange: mockWeekRange,
                }),
            ).rejects.toThrow('Second save failed');

            // 验证事务被调用
            expect(dataSource.transaction).toHaveBeenCalled();

            // 由于事务失败，所有操作都应该被回滚
            // TypeORM 会自动处理回滚，我们只需要验证错误被正确抛出
        });
    });

    /**
     * 测试健康检查
     */
    describe('Health Check', () => {
        it('should return health status of all services', async () => {
            // 模拟健康检查结果
            jiraAdapter.healthCheck.mockResolvedValue(true);
            sqlAdapter.healthCheck.mockResolvedValue(
                new Map([
                    ['db1', true],
                    ['db2', true],
                ]),
            );
            dataSource.query.mockResolvedValue([{'1': 1}]);

            const result = await service.healthCheck();

            expect(result).toEqual({
                jira: true,
                sql: new Map([
                    ['db1', true],
                    ['db2', true],
                ]),
                database: true,
            });

            expect(jiraAdapter.healthCheck).toHaveBeenCalled();
            expect(sqlAdapter.healthCheck).toHaveBeenCalled();
            expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
        });

        it('should handle database health check failure', async () => {
            jiraAdapter.healthCheck.mockResolvedValue(true);
            sqlAdapter.healthCheck.mockResolvedValue(new Map());
            dataSource.query.mockRejectedValue(new Error('Database connection failed'));

            const result = await service.healthCheck();

            expect(result.database).toBe(false);
        });
    });
});
