import {z} from 'zod';

/**
 * 配置文件 Schema 校验
 * 使用 Zod 确保配置文件结构正确
 */

export const serverConfigSchema = z.object({
  port: z.number().min(1).max(65535),
  corsOrigin: z.string().url(),
});

export const databaseConfigSchema = z.object({
  path: z.string().min(1),
});

export const idConfigSchema = z.object({
  workerId: z.number().min(0).max(31),
  datacenterId: z.number().min(0).max(31),
});

export const jiraConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().min(1), // 改为宽松校验，支持用户名格式
  apiToken: z.string().min(1),
  jql: z.object({
    done: z.string().min(1),
    plan: z.string().min(1),
  }),
  fields: z.array(z.string()).min(1),
});

export const externalDbConfigSchema = z.object({
  name: z.string().min(1),
  type: z.literal('postgres'), // 仅支持 PostgreSQL
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string(),
  connectTimeoutMs: z.number().min(0),
  queryTimeoutMs: z.number().min(0),
  ssl: z.boolean(),
});

export const sqlQueriesConfigSchema = z.record(z.string(), z.string());

export const excelConfigSchema = z.object({
  templatePath: z.string().min(1),
  indentSize: z.number().min(0).max(10),
});

export const uiConfigSchema = z.object({
  theme: z.string(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const appConfigSchema = z.object({
  server: serverConfigSchema,
  database: databaseConfigSchema,
  id: idConfigSchema,
  jira: jiraConfigSchema,
  externalDatabases: z.array(externalDbConfigSchema).min(1),
  sqlQueries: sqlQueriesConfigSchema,
  excel: excelConfigSchema,
  ui: uiConfigSchema,
});

export type AppConfigSchema = z.infer<typeof appConfigSchema>;
