import { IsNotEmpty, IsObject } from 'class-validator';

/**
 * 更新条目请求 DTO
 */
export class UpdateItemDto {
  @IsNotEmpty()
  @IsObject()
  contentJson: Record<string, any>;
}

/**
 * 条目响应 DTO
 */
export class ItemResponseDto {
  id: string;
  reportId: string;
  tabType: string;
  sourceType: string;
  parentId: string | null;
  contentJson: Record<string, any>;
  sortOrder: number;
}
