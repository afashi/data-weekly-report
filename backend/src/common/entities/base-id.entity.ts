import {PrimaryColumn} from 'typeorm';
import {Transform} from 'class-transformer';

/**
 * 基础 Entity 类
 * 所有实体都应继承此类
 *
 * 功能：
 * 1. 统一主键字段名为 id
 * 2. 主键类型为 BIGINT（数据库层）
 * 3. 自动序列化为 String（API 层，防止 JS 精度丢失）
 */
export abstract class BaseIdEntity {
    @PrimaryColumn({type: 'bigint', comment: 'Snowflake ID'})
    @Transform(({value}) => (value == null ? value : value.toString()), {
        toPlainOnly: true,
    })
    id: number; // TypeScript 类型改为 number，与 TypeORM 内部处理一致
}
