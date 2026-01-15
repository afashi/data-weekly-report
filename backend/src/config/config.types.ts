// 配置文件类型定义
export interface ServerConfig {
    port: number;
    corsOrigin: string;
}

export interface DatabaseConfig {
    path: string;
}

export interface IdConfig {
    workerId: number;
    datacenterId: number;
}

export interface JiraFieldMapping {
    summary: string;
    status: string;
    assignee: string;
    customfield_10016?: string;
    customfield_10017?: string;
}

export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    jql: {
        done: string;
        plan: string;
    };
    fields: string[];
}

export interface ExternalDbConfig {
    name: string;
    type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    connectTimeoutMs: number;
    queryTimeoutMs: number;
    ssl: boolean;
}

export interface SqlQueriesConfig {
    metrics_brv: string;
    etl_status_rev: string;

    [key: string]: string;
}

export interface ExcelConfig {
    templatePath: string;
    indentSize: number;
}

export interface UiConfig {
    theme: string;
    primaryColor: string;
}

export interface AppConfig {
    server: ServerConfig;
    database: DatabaseConfig;
    id: IdConfig;
    jira: JiraConfig;
    externalDatabases: ExternalDbConfig[];
    sqlQueries: SqlQueriesConfig;
    excel: ExcelConfig;
    ui: UiConfig;
}
