import {Test, TestingModule} from '@nestjs/testing';
import {IdService} from './id.service';
import {AppConfig} from '../../config/config.types';

/**
 * IdService 单元测试
 * 测试 Snowflake ID 生成服务的核心功能
 */
describe('IdService', () => {
    let service: IdService;

    // Mock 配置
    const mockConfig: AppConfig = {
        server: {
            port: 3000,
            corsOrigin: 'http://localhost:5173',
        },
        database: {
            path: './data/test.sqlite',
        },
        jira: {
            baseUrl: 'https://test.atlassian.net',
            email: 'test@example.com',
            apiToken: 'test-token',
            jql: {
                done: 'project = TEST AND status = Done',
                plan: 'project = TEST AND status = "To Do"',
            },
            fields: ['summary', 'status', 'assignee'],
        },
        externalDatabases: [
            {
                name: 'test-db',
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                database: 'test',
                username: 'test',
                password: 'test',
                connectTimeoutMs: 5000,
                queryTimeoutMs: 10000,
                ssl: false,
            },
        ],
        sqlQueries: {
            metrics_brv: 'SELECT * FROM metrics',
            etl_status_rev: 'SELECT * FROM etl_status',
        },
        excel: {
            templatePath: './templates/report.xlsx',
            indentSize: 2,
        },
        ui: {
            theme: 'light',
            primaryColor: '#1890ff',
        },
        id: {
            workerId: 1,
            datacenterId: 1,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IdService,
                {
                    provide: 'APP_CONFIG',
                    useValue: mockConfig,
                },
            ],
        }).compile();

        service = module.get<IdService>(IdService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    /**
     * 测试 ID 唯一性
     * 生成大量 ID，确保没有重复
     */
    describe('ID Uniqueness', () => {
        it('should generate unique IDs in a single batch', () => {
            const count = 1000;
            const ids = service.nextIds(count);

            // 使用 Set 检测重复
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);
        });

        it('should generate unique IDs across multiple calls', () => {
            const ids: string[] = [];
            const batchCount = 10;
            const batchSize = 100;

            // 分批生成 ID
            for (let i = 0; i < batchCount; i++) {
                const batch = service.nextIds(batchSize);
                ids.push(...batch);
            }

            // 检查所有 ID 都是唯一的
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(batchCount * batchSize);
        });

        it('should generate unique IDs in rapid succession', () => {
            const ids: string[] = [];
            const count = 5000;

            // 快速连续生成 ID（测试同一毫秒内的序列号机制）
            for (let i = 0; i < count; i++) {
                ids.push(service.nextId());
            }

            // 检查唯一性
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);
        });
    });

    /**
     * 测试 ID 单调性
     * ID 应该随时间递增
     */
    describe('ID Monotonicity', () => {
        it('should generate monotonically increasing IDs', () => {
            const count = 100;
            const ids = service.nextIds(count);

            // 转换为 BigInt 进行数值比较
            const bigIntIds = ids.map((id) => BigInt(id));

            // 检查每个 ID 都大于前一个
            for (let i = 1; i < bigIntIds.length; i++) {
                expect(bigIntIds[i]).toBeGreaterThan(bigIntIds[i - 1]);
            }
        });

        it('should maintain monotonicity across time', async () => {
            const id1 = service.nextId();

            // 等待 10ms
            await new Promise((resolve) => setTimeout(resolve, 10));

            const id2 = service.nextId();

            // 第二个 ID 应该大于第一个
            expect(BigInt(id2)).toBeGreaterThan(BigInt(id1));
        });

        it('should generate increasing IDs even in the same millisecond', () => {
            const ids: string[] = [];
            const count = 100;

            // 在极短时间内生成多个 ID（很可能在同一毫秒内）
            for (let i = 0; i < count; i++) {
                ids.push(service.nextId());
            }

            // 转换为 BigInt
            const bigIntIds = ids.map((id) => BigInt(id));

            // 验证单调递增
            for (let i = 1; i < bigIntIds.length; i++) {
                expect(bigIntIds[i]).toBeGreaterThan(bigIntIds[i - 1]);
            }
        });
    });

    /**
     * 测试 ID 格式
     * ID 应该是有效的数字字符串
     */
    describe('ID Format', () => {
        it('should generate IDs as numeric strings', () => {
            const id = service.nextId();

            // 应该是字符串
            expect(typeof id).toBe('string');

            // 应该可以转换为 BigInt
            expect(() => BigInt(id)).not.toThrow();

            // 应该是正数
            expect(BigInt(id)).toBeGreaterThan(0n);
        });

        it('should generate IDs with reasonable length', () => {
            const id = service.nextId();

            // Snowflake ID 通常是 18-19 位数字
            expect(id.length).toBeGreaterThanOrEqual(18);
            expect(id.length).toBeLessThanOrEqual(20);
        });

        it('should generate IDs without leading zeros', () => {
            const ids = service.nextIds(100);

            ids.forEach((id) => {
                expect(id[0]).not.toBe('0');
            });
        });
    });

    /**
     * 测试 parseId 方法
     * 验证 ID 解析功能
     */
    describe('parseId', () => {
        it('should parse generated ID correctly', () => {
            const id = service.nextId();
            const parsed = service.parseId(id);

            // 应该包含必要的字段
            expect(parsed).toHaveProperty('timestamp');
            expect(parsed).toHaveProperty('instanceId');
            expect(parsed).toHaveProperty('sequence');

            // 时间戳应该是有效的 Date 对象
            expect(parsed.timestamp).toBeInstanceOf(Date);

            // 时间戳应该接近当前时间（允许 1 秒误差）
            const now = Date.now();
            const diff = Math.abs(now - parsed.timestamp.getTime());
            expect(diff).toBeLessThan(1000);

            // instanceId 应该在有效范围内（0-1023，10位）
            // 注意：nodejs-snowflake 的位编码可能与标准 Snowflake 不同
            expect(parsed.instanceId).toBeGreaterThanOrEqual(0);
            expect(parsed.instanceId).toBeLessThanOrEqual(1023);

            // 序列号应该在有效范围内（0-4095）
            expect(parsed.sequence).toBeGreaterThanOrEqual(0);
            expect(parsed.sequence).toBeLessThanOrEqual(4095);
        });

        it('should parse multiple IDs with increasing timestamps', async () => {
            const id1 = service.nextId();
            await new Promise((resolve) => setTimeout(resolve, 10));
            const id2 = service.nextId();

            const parsed1 = service.parseId(id1);
            const parsed2 = service.parseId(id2);

            // 第二个 ID 的时间戳应该大于或等于第一个
            expect(parsed2.timestamp.getTime()).toBeGreaterThanOrEqual(
                parsed1.timestamp.getTime(),
            );
        });
    });

    /**
     * 测试批量生成
     * 验证 nextIds 方法
     */
    describe('nextIds', () => {
        it('should generate correct number of IDs', () => {
            const counts = [1, 10, 100, 1000];

            counts.forEach((count) => {
                const ids = service.nextIds(count);
                expect(ids.length).toBe(count);
            });
        });

        it('should generate all unique IDs in batch', () => {
            const count = 500;
            const ids = service.nextIds(count);

            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(count);
        });

        it('should handle edge cases', () => {
            // 生成 0 个 ID
            expect(service.nextIds(0)).toEqual([]);

            // 生成 1 个 ID
            expect(service.nextIds(1).length).toBe(1);

            // 生成大量 ID
            expect(service.nextIds(5000).length).toBe(5000);
        });
    });

    /**
     * 性能测试
     * 验证 ID 生成性能
     */
    describe('Performance', () => {
        it('should generate IDs quickly', () => {
            const count = 10000;
            const startTime = Date.now();

            service.nextIds(count);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // 生成 10000 个 ID 应该在 1 秒内完成
            expect(duration).toBeLessThan(1000);
        });

        it('should maintain performance under load', () => {
            const iterations = 10;
            const batchSize = 1000;
            const durations: number[] = [];

            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                service.nextIds(batchSize);
                const endTime = Date.now();
                durations.push(endTime - startTime);
            }

            // 平均耗时应该稳定
            const avgDuration =
                durations.reduce((sum, d) => sum + d, 0) / durations.length;
            expect(avgDuration).toBeLessThan(100);
        });
    });
});
