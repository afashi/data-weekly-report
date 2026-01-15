import {Inject, Injectable, Logger, OnModuleDestroy} from '@nestjs/common';
import {Pool, PoolClient} from 'pg';
import {ExternalDbConfig, SqlQueriesConfig} from '../../../config/config.types';
import {MetricData} from '../types/sql.types';

/**
 * SQL 适配器
 * 负责从外部 PostgreSQL 数据库查询指标数据
 */
@Injectable()
export class SqlAdapter implements OnModuleDestroy {
    private readonly logger = new Logger(SqlAdapter.name);
    private readonly pools: Map<string, Pool> = new Map(); // 数据库连接池
    private readonly sqlQueries: SqlQueriesConfig;

    constructor(
        @Inject('APP_CONFIG')
        private readonly appConfig: {
            externalDatabases: ExternalDbConfig[];
            sqlQueries: SqlQueriesConfig;
        },
    ) {
        this.sqlQueries = appConfig.sqlQueries;
        this.initializePools();
    }

    /**
     * 查询 BRV 指标数据（示例：验证环境 ETL 状态）
     * @returns 标准化的指标数据
     */
    async fetchBrvMetrics(): Promise<MetricData[]> {
        const queryName = 'metrics_brv';
        const sql = this.sqlQueries[queryName];

        if (!sql) {
            throw new Error(`SQL 查询配置不存在: ${queryName}`);
        }

        this.logger.log(`开始执行 BRV 指标查询: ${queryName}`);
        const result = await this.executeQuery(this.getDefaultDbName(), sql);

        // 转换查询结果为指标数据
        return this.normalizeMetrics(queryName, result.rows);
    }

    /**
     * 查询 REV 指标数据（示例：评审环境 ETL 状态）
     * @returns 标准化的指标数据
     */
    async fetchRevMetrics(): Promise<MetricData[]> {
        const queryName = 'etl_status_rev';
        const sql = this.sqlQueries[queryName];

        if (!sql) {
            throw new Error(`SQL 查询配置不存在: ${queryName}`);
        }

        this.logger.log(`开始执行 REV 指标查询: ${queryName}`);
        const result = await this.executeQuery(this.getDefaultDbName(), sql);

        return this.normalizeMetrics(queryName, result.rows);
    }

    /**
     * 健康检查 - 测试所有数据库连接
     * @returns 健康状态映射
     */
    async healthCheck(): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        for (const [dbName, pool] of this.pools.entries()) {
            try {
                const client = await pool.connect();
                await client.query('SELECT 1');
                client.release();
                results.set(dbName, true);
                this.logger.log(`数据库 ${dbName} 健康检查成功`);
            } catch (error) {
                results.set(dbName, false);
                this.logger.error(`数据库 ${dbName} 健康检查失败: ${error.message}`);
            }
        }

        return results;
    }

    /**
     * 模块销毁时关闭所有连接池
     */
    async onModuleDestroy(): Promise<void> {
        this.logger.log('开始关闭所有数据库连接池');

        for (const [dbName, pool] of this.pools.entries()) {
            try {
                await pool.end();
                this.logger.log(`数据库连接池已关闭 - ${dbName}`);
            } catch (error) {
                this.logger.error(`关闭数据库连接池失败 - ${dbName}: ${error.message}`);
            }
        }

        this.pools.clear();
    }

    /**
     * 初始化所有数据库连接池
     */
    private initializePools(): void {
        for (const dbConfig of this.appConfig.externalDatabases) {
            const pool = new Pool({
                host: dbConfig.host,
                port: dbConfig.port,
                database: dbConfig.database,
                user: dbConfig.username,
                password: dbConfig.password,
                max: 10, // 最大连接数
                idleTimeoutMillis: 30000, // 空闲超时
                connectionTimeoutMillis: dbConfig.connectTimeoutMs,
                ssl: dbConfig.ssl ? {rejectUnauthorized: false} : false,
                statement_timeout: dbConfig.queryTimeoutMs, // 查询超时
            });

            // 连接错误处理
            pool.on('error', (err: Error) => {
                this.logger.error(`数据库 ${dbConfig.name} 连接池错误: ${err.message}`, err.stack);
            });

            this.pools.set(dbConfig.name, pool);
            this.logger.log(`数据库连接池已创建 - ${dbConfig.name} (${dbConfig.host}:${dbConfig.port})`);
        }
    }

    /**
     * 执行 SQL 查询
     * @param dbName 数据库名称
     * @param sql SQL 语句
     * @returns 查询结果
     */
    private async executeQuery(dbName: string, sql: string): Promise<{ rows: any[]; rowCount: number }> {
        const pool = this.pools.get(dbName);
        if (!pool) {
            throw new Error(`数据库连接池不存在: ${dbName}`);
        }

        let client: PoolClient | null = null;

        try {
            client = await pool.connect();
            this.logger.debug(`执行 SQL 查询 - 数据库: ${dbName}`);

            const result = await client.query(sql);
            this.logger.log(`SQL 查询成功 - 返回 ${result.rowCount} 行`);

            return {
                rows: result.rows,
                rowCount: result.rowCount || 0,
            };
        } catch (error) {
            this.logger.error(`SQL 查询失败 - 数据库: ${dbName}, 错误: ${error.message}`, error.stack);
            throw new Error(`SQL 查询失败: ${error.message}`);
        } finally {
            if (client) {
                client.release();
            }
        }
    }

    /**
     * 标准化指标数据
     * @param queryName 查询名称
     * @param rows 原始查询结果
     * @returns 标准化的指标列表
     */
    private normalizeMetrics(queryName: string, rows: any[]): MetricData[] {
        if (rows.length === 0) {
            this.logger.warn(`查询 ${queryName} 返回空结果`);
            return [];
        }

        // 假设查询结果格式：{ metric_key: string, metric_value: string, status: string }
        return rows.map((row) => ({
            metricKey: row.metric_key || queryName.toUpperCase(),
            metricValue: row.metric_value?.toString() || '0',
            statusCode: this.mapStatus(row.status),
        }));
    }

    /**
     * 映射数据库状态到系统状态码
     * @param status 数据库状态字段
     * @returns 系统状态码
     */
    private mapStatus(status: string | undefined): 'loading' | 'success' | 'normal' {
        if (!status) return 'normal';

        const statusLower = status.toLowerCase();
        if (statusLower.includes('success') || statusLower.includes('ok')) {
            return 'success';
        }
        if (statusLower.includes('loading') || statusLower.includes('pending')) {
            return 'loading';
        }
        return 'normal';
    }

    /**
     * 获取默认数据库名称（第一个配置的数据库）
     */
    private getDefaultDbName(): string {
        if (this.appConfig.externalDatabases.length === 0) {
            throw new Error('未配置外部数据库');
        }
        return this.appConfig.externalDatabases[0].name;
    }
}
