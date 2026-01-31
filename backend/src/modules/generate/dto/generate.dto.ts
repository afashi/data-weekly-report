import {IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

/**
 * 生成周报请求 DTO
 */
export class GenerateReportDto {
    @IsString()
    @IsOptional()
    weekRange?: string; // 可选的周范围，格式：2026/01/12-2026/01/18

    @IsNumber()
    @IsOptional()
    weekNumber?: number; // 可选的周数，如第 3 周

    @IsBoolean()
    @IsOptional()
    overwrite?: boolean; // 是否允许更新现有周报，默认false
}

/**
 * 周报响应 DTO
 */
export class ReportResponseDto {
    @IsString()
    id: string;

    @IsString()
    weekRange: string;

    @IsNumber()
    weekNumber: number;

    @IsString()
    createdAt: string;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => MetricDto)
    metrics: MetricDto[];

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => ReportItemDto)
    items: ReportItemDto[];

    @IsString()
    @IsOptional()
    notes?: string;
}

/**
 * 指标 DTO
 */
export class MetricDto {
    @IsString()
    id: string;

    @IsString()
    metricKey: string;

    @IsString()
    metricValue: string;

    @IsString()
    statusCode: string;
}

/**
 * 报表条目 DTO
 */
export class ReportItemDto {
    @IsString()
    id: string;

    @IsEnum(['DONE', 'SELF', 'PLAN'])
    tabType: 'DONE' | 'SELF' | 'PLAN';

    @IsEnum(['JIRA', 'SQL', 'MANUAL'])
    sourceType: 'JIRA' | 'SQL' | 'MANUAL';

    @IsString()
    @IsOptional()
    parentId?: string;

    @IsString()
    contentJson: string;

    @IsNumber()
    sortOrder: number;
}
