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
    @PrimaryColumn({
        type: 'bigint',
        comment: 'Snowflake ID',
        transformer: {
            // 从数据库读取时,确保转为字符串
            from: (value: any) => (value == null ? value : String(value)),
            // 写入数据库时,确保以字符串形式存储
            to: (value: any) => (value == null ? value : String(value)),
        },
    })
    @Transform(({value}) => (value == null ? value : value.toString()), {
        toPlainOnly: true,
    })
    id: string; // TypeScript 类型为 string,防止 JavaScript 精度丢失(BIGINT 超过 53 位)
}
