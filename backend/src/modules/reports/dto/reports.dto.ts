import {IsOptional, IsInt, Min, Max, IsArray, IsString, IsObject, ValidateNested} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 获取周报列表请求 DTO
 */
export class GetReportsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

/**
 * 周报列表项 DTO
 */
export class ReportListItemDto {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: string;
}

/**
 * 周报列表响应 DTO
 */
export class ReportListResponseDto {
  items: ReportListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 周报详情响应 DTO（复用 GenerateReportDto 的结构）
 */
export class ReportDetailResponseDto {
  id: string;
  weekRange: string;
  weekNumber: number;
  createdAt: string;
  metrics: Array<{
    id: string;
    metricKey: string;
    metricValue: string;
    statusCode: string;
  }>;
  items: Array<{
    id: string;
    tabType: string;
    sourceType: string;
    parentId: string | null;
    contentJson: Record<string, any>;
    sortOrder: number;
  }>;
  notes: string;
}

/**
 * 手动条目 DTO（用于批量更新）
 */
export class ManualItemDto {
    @IsOptional()
    @IsString()
    id?: string; // 临时 ID（前端生成）或真实 ID

    @IsOptional()
    @IsString()
    parentId?: string | null; // 父节点 ID

    @IsObject()
    contentJson: Record<string, any>; // 业务数据

    @IsInt()
    sortOrder: number; // 排序权重
}

/**
 * 更新自采数据请求 DTO
 */
export class UpdateManualItemsDto {
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => ManualItemDto)
    items: ManualItemDto[];
}

