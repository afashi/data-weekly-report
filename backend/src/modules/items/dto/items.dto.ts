import {IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

/**
 * 新增条目请求 DTO
 */
export class CreateItemDto {
    @IsNotEmpty()
    @IsString()
    reportId: string;

    @IsNotEmpty()
    @IsEnum(['DONE', 'SELF', 'PLAN'])
    tabType: 'DONE' | 'SELF' | 'PLAN';

    @IsNotEmpty()
    @IsObject()
    contentJson: Record<string, any>;

    @IsNumber()
    sortOrder: number;
}

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

/**
 * 手动条目 DTO
 * 用于批量更新自采数据(SELF 标签页)
 */
export class ManualItemDto {
    /**
     * 条目 ID
     * 可选字段，如果是 temp_ 开头则是临时 ID，需要生成真实 ID
     */
    @IsOptional()
    @IsString()
    id?: string;

    /**
     * 父节点 ID
     * 如果为 null 或 undefined 则是根节点
     * 如果是 temp_ 开头则是临时 ID，需要映射为真实 ID
     */
    @IsOptional()
    @IsString()
    parentId?: string | null;

    /**
     * 业务数据 JSON
     */
    @IsNotEmpty()
    @IsObject()
    contentJson: Record<string, any>;

    /**
     * 排序权重
     * 同级节点按此字段升序排列
     */
    @IsNumber()
    sortOrder: number;
}

/**
 * 批量更新手动条目请求 DTO
 */
export class UpdateManualItemsDto {
    /**
     * 手动条目数组
     * 支持树形结构(通过 parentId 关联)
     */
    @IsArray()
    @ValidateNested({each: true})
    @Type(() => ManualItemDto)
    items: ManualItemDto[];
}

/**
 * 批量更新手动条目响应 DTO
 */
export class UpdateManualItemsResponseDto {
    /**
     * 周报 ID
     */
    reportId: string;

    /**
     * 更新成功的条目数量
     */
    count: number;

    /**
     * ID 映射表(临时 ID -> 真实 ID)
     */
    idMapping: Record<string, string>;
}
