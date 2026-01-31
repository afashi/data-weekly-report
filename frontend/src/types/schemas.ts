import {z} from 'zod';

/**
 * 基础任务内容 Schema
 * 所有 Tab 类型共享的字段
 */
const BaseTaskContentSchema = z.object({
    jiraKey: z.string().default(''),
    title: z.string().default(''),
    status: z.string().default('Open'),
    assignee: z.string().default(''),
});

/**
 * DONE Tab 任务内容 Schema
 * 包含环境状态字段
 */
export const DoneTaskContentSchema = BaseTaskContentSchema.extend({
    devStatus: z.string().optional().default(''),
    testStatus: z.string().optional().default(''),
    verifyStatus: z.string().optional().default(''),
    reviewStatus: z.string().optional().default(''),
    prodStatus: z.string().optional().default(''),
});

/**
 * PLAN Tab 任务内容 Schema
 * 包含故事点和工作日字段
 */
export const PlanTaskContentSchema = BaseTaskContentSchema.extend({
    storyPoints: z.number().optional().default(0),
    workDays: z.number().optional().default(0),
});

/**
 * SELF Tab 任务内容 Schema
 * 自采数据可能包含更灵活的字段
 */
export const SelfTaskContentSchema = BaseTaskContentSchema.extend({
    description: z.string().optional().default(''),
    progress: z.string().optional().default(''),
    remarks: z.string().optional().default(''),
});

/**
 * 通用任务内容 Schema（联合类型）
 * 用于不确定具体 Tab 类型的场景
 */
export const TaskContentSchema = z.union([
    DoneTaskContentSchema,
    PlanTaskContentSchema,
    SelfTaskContentSchema,
]);

/**
 * TypeScript 类型推导
 */
export type DoneTaskContent = z.infer<typeof DoneTaskContentSchema>;
export type PlanTaskContent = z.infer<typeof PlanTaskContentSchema>;
export type SelfTaskContent = z.infer<typeof SelfTaskContentSchema>;
export type TaskContent = z.infer<typeof TaskContentSchema>;

/**
 * Schema 验证辅助函数
 */
export const validateTaskContent = (
    data: unknown,
    tabType: 'DONE' | 'SELF' | 'PLAN'
): TaskContent => {
    switch (tabType) {
        case 'DONE':
            return DoneTaskContentSchema.parse(data);
        case 'PLAN':
            return PlanTaskContentSchema.parse(data);
        case 'SELF':
            return SelfTaskContentSchema.parse(data);
        default:
            throw new Error(`Unknown tab type: ${tabType}`);
    }
};

/**
 * 安全解析函数（不抛出异常）
 */
export const safeParseTaskContent = (
    data: unknown,
    tabType: 'DONE' | 'SELF' | 'PLAN'
): { success: true; data: TaskContent } | { success: false; error: z.ZodError } => {
    switch (tabType) {
        case 'DONE':
            return DoneTaskContentSchema.safeParse(data);
        case 'PLAN':
            return PlanTaskContentSchema.safeParse(data);
        case 'SELF':
            return SelfTaskContentSchema.safeParse(data);
        default:
            return {
                success: false,
                error: new z.ZodError([
                    {
                        code: 'custom',
                        path: [],
                        message: `Unknown tab type: ${tabType}`,
                    },
                ]),
            };
    }
};
