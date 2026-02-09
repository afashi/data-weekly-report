import {Test, TestingModule} from '@nestjs/testing';
import * as fc from 'fast-check';
import {IdService} from './id.service';
import {AppConfig} from '../../config/config.types';

/**
 * IdService 基于属性的测试 (Property-Based Testing)
 * 使用 fast-check 验证 Snowflake ID 生成的不变量
 */
describe('IdService - Property-Based Tests', () => {
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

    /**
     * PBT-001: ID 生成唯一性
     * 属性: 任意两次调用 IdService.nextId() 返回的 ID 必须不同
     * 不变量: ∀ i, j ∈ [1, N], i ≠ j ⇒ id[i] ≠ id[j]
     */
    describe('PBT-001: ID Uniqueness Property', () => {
        it('should generate unique IDs for any batch size', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 100, max: 5000}),
                    (n) => {
                        const ids = service.nextIds(n);
                        const uniqueIds = new Set(ids);
                        return uniqueIds.size === ids.length;
                    },
                ),
                {numRuns: 50}, // 运行 50 次测试
            );
        });

        it('should generate unique IDs across multiple batches', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({min: 10, max: 100}), {minLength: 2, maxLength: 10}),
                    (batchSizes) => {
                        const allIds: string[] = [];

                        // 生成多个批次的 ID
                        for (const size of batchSizes) {
                            const batch = service.nextIds(size);
                            allIds.push(...batch);
                        }

                        // 检查所有 ID 都是唯一的
                        const uniqueIds = new Set(allIds);
                        return uniqueIds.size === allIds.length;
                    },
                ),
                {numRuns: 30},
            );
        });

        it('should generate unique IDs in rapid succession', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 1000, max: 10000}),
                    (n) => {
                        const ids: string[] = [];

                        // 快速连续生成 ID（测试同一毫秒内的序列号机制）
                        for (let i = 0; i < n; i++) {
                            ids.push(service.nextId());
                        }

                        // 检查唯一性
                        const uniqueIds = new Set(ids);
                        return uniqueIds.size === ids.length;
                    },
                ),
                {numRuns: 20},
            );
        });
    });

    /**
     * PBT-002: ID 生成单调性
     * 属性: 后生成的 ID 的时间戳部分必须 ≥ 先生成的 ID
     * 不变量: ∀ i < j, timestamp(id[i]) ≤ timestamp(id[j])
     */
    describe('PBT-002: ID Monotonicity Property', () => {
        it('should generate monotonically increasing IDs', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 100, max: 1000}),
                    (n) => {
                        const ids = service.nextIds(n);

                        // 转换为 BigInt 进行数值比较
                        const bigIntIds = ids.map((id) => BigInt(id));

                        // 检查每个 ID 都大于或等于前一个
                        for (let i = 1; i < bigIntIds.length; i++) {
                            if (bigIntIds[i] <= bigIntIds[i - 1]) {
                                return false;
                            }
                        }

                        return true;
                    },
                ),
                {numRuns: 50},
            );
        });

        it('should maintain monotonicity with parsed timestamps', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 50, max: 500}),
                    (n) => {
                        const ids = service.nextIds(n);

                        // 解析时间戳并检查单调性
                        for (let i = 1; i < ids.length; i++) {
                            const parsed1 = service.parseId(ids[i - 1]);
                            const parsed2 = service.parseId(ids[i]);

                            // 时间戳应该单调递增（或相等，如果在同一毫秒内）
                            if (parsed2.timestamp.getTime() < parsed1.timestamp.getTime()) {
                                return false;
                            }
                        }

                        return true;
                    },
                ),
                {numRuns: 30},
            );
        });
    });

    /**
     * PBT-004: BIGINT 序列化往返一致性
     * 属性: serialize(deserialize(id)) === id
     * 不变量: ∀ id, JSON.parse(JSON.stringify({id})).id === id ∧ typeof id === 'string'
     */
    describe('PBT-004: ID Serialization Round-Trip Property', () => {
        it('should maintain ID integrity through JSON serialization', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 10, max: 100}),
                    (n) => {
                        const ids = service.nextIds(n);

                        // 对每个 ID 进行序列化和反序列化
                        return ids.every((id) => {
                            const serialized = JSON.stringify({id});
                            const deserialized = JSON.parse(serialized);

                            return (
                                deserialized.id === id &&
                                typeof deserialized.id === 'string' &&
                                deserialized.id.length >= 18 &&
                                deserialized.id.length <= 20
                            );
                        });
                    },
                ),
                {numRuns: 50},
            );
        });

        it('should preserve ID format after multiple serialization cycles', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 1, max: 5}),
                    (cycles) => {
                        const id = service.nextId();
                        let current = id;

                        // 多次序列化和反序列化
                        for (let i = 0; i < cycles; i++) {
                            const serialized = JSON.stringify({value: current});
                            const deserialized = JSON.parse(serialized);
                            current = deserialized.value;
                        }

                        // 最终值应该与原始值相同
                        return current === id && typeof current === 'string';
                    },
                ),
                {numRuns: 100},
            );
        });
    });

    /**
     * ID 格式属性测试
     * 验证 ID 格式的各种属性
     */
    describe('ID Format Properties', () => {
        it('should generate IDs as valid numeric strings', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 10, max: 100}),
                    (n) => {
                        const ids = service.nextIds(n);

                        return ids.every((id) => {
                            // 应该是字符串
                            if (typeof id !== 'string') return false;

                            // 应该可以转换为 BigInt
                            try {
                                const bigIntValue = BigInt(id);
                                // 应该是正数
                                if (bigIntValue <= 0n) return false;
                            } catch (e) {
                                return false;
                            }

                            // 应该没有前导零
                            if (id[0] === '0') return false;

                            // 长度应该在合理范围内
                            if (id.length < 18 || id.length > 20) return false;

                            return true;
                        });
                    },
                ),
                {numRuns: 50},
            );
        });

        it('should generate IDs with consistent length distribution', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 100, max: 1000}),
                    (n) => {
                        const ids = service.nextIds(n);
                        const lengths = ids.map((id) => id.length);

                        // 所有长度应该在 18-20 之间
                        return lengths.every((len) => len >= 18 && len <= 20);
                    },
                ),
                {numRuns: 30},
            );
        });
    });

    /**
     * parseId 属性测试
     * 验证 ID 解析的正确性
     */
    describe('parseId Properties', () => {
        it('should parse all generated IDs successfully', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 10, max: 100}),
                    (n) => {
                        const ids = service.nextIds(n);

                        return ids.every((id) => {
                            try {
                                const parsed = service.parseId(id);

                                // 应该包含必要的字段
                                if (!parsed.timestamp || !parsed.instanceId === undefined || !parsed.sequence === undefined) {
                                    return false;
                                }

                                // 时间戳应该是有效的 Date 对象
                                if (!(parsed.timestamp instanceof Date)) {
                                    return false;
                                }

                                // 时间戳应该接近当前时间（允许 10 秒误差）
                                const now = Date.now();
                                const diff = Math.abs(now - parsed.timestamp.getTime());
                                if (diff > 10000) {
                                    return false;
                                }

                                // instanceId 应该在有效范围内
                                if (parsed.instanceId < 0 || parsed.instanceId > 1023) {
                                    return false;
                                }

                                // 序列号应该在有效范围内
                                if (parsed.sequence < 0 || parsed.sequence > 4095) {
                                    return false;
                                }

                                return true;
                            } catch (e) {
                                return false;
                            }
                        });
                    },
                ),
                {numRuns: 50},
            );
        });

        it('should maintain timestamp ordering in parsed IDs', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 50, max: 500}),
                    (n) => {
                        const ids = service.nextIds(n);

                        // 解析所有 ID
                        const parsed = ids.map((id) => service.parseId(id));

                        // 检查时间戳的单调性
                        for (let i = 1; i < parsed.length; i++) {
                            if (parsed[i].timestamp.getTime() < parsed[i - 1].timestamp.getTime()) {
                                return false;
                            }
                        }

                        return true;
                    },
                ),
                {numRuns: 30},
            );
        });
    });

    /**
     * 性能属性测试
     * 验证 ID 生成的性能特性
     */
    describe('Performance Properties', () => {
        it('should generate IDs efficiently regardless of batch size', () => {
            fc.assert(
                fc.property(
                    fc.integer({min: 100, max: 10000}),
                    (n) => {
                        const startTime = Date.now();
                        service.nextIds(n);
                        const endTime = Date.now();

                        const duration = endTime - startTime;

                        // 生成速度应该保持高效（每个 ID < 0.1ms）
                        const avgTimePerId = duration / n;
                        return avgTimePerId < 0.1;
                    },
                ),
                {numRuns: 20},
            );
        });

        it('should maintain consistent performance across multiple runs', () => {
            fc.assert(
                fc.property(
                    fc.array(fc.integer({min: 100, max: 1000}), {minLength: 5, maxLength: 10}),
                    (batchSizes) => {
                        const durations: number[] = [];

                        // 测量每个批次的耗时
                        for (const size of batchSizes) {
                            const startTime = Date.now();
                            service.nextIds(size);
                            const endTime = Date.now();
                            durations.push(endTime - startTime);
                        }

                        // 计算平均耗时和标准差
                        const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;

                        // 平均耗时应该合理（< 100ms）
                        return avgDuration < 100;
                    },
                ),
                {numRuns: 10},
            );
        });
    });
});
