/**
 * SQL 查询相关类型定义
 */

/**
 * 外部数据库查询结果（原始格式）
 */
export interface SqlQueryResult {
    rows: any[]; // 查询结果行
    rowCount: number; // 结果行数
    fields: Array<{ name: string; dataTypeID: number }>; // 字段信息
}

/**
 * 标准化的指标数据
 */
export interface MetricData {
    metricKey: string; // 指标标识
    metricValue: string; // 指标值
    statusCode: 'loading' | 'success' | 'normal'; // 状态
}

/**
 * SQL 查询配置
 */
export interface SqlQueryConfig {
    queryName: string; // 查询名称（对应 sqlQueries 中的 key）
    sql: string; // SQL 语句
    dbName: string; // 目标数据库名称
}
