import {Inject, Injectable} from '@nestjs/common';
import {AppConfig} from '../../config/config.types';
import {Snowflake} from 'nodejs-snowflake';

/**
 * Snowflake ID 生成服务
 * 使用 nodejs-snowflake 库生成全局唯一的 64 位整数 ID
 *
 * ID 结构（64 bits）：
 * - 1 bit: 未使用（始终为 0）
 * - 41 bits: 时间戳（毫秒级，可用约 69 年）
 * - 10 bits: 机器 ID（包含数据中心和工作机器）
 * - 12 bits: 序列号（同一毫秒内最多 4096 个 ID）
 */
@Injectable()
export class IdService {
    private readonly snowflake: Snowflake;

    constructor(@Inject('APP_CONFIG') private readonly config: AppConfig) {
        const {workerId, datacenterId} = this.config.id;

        // 初始化 Snowflake 生成器
        // nodejs-snowflake 使用 instance_id（10位，合并了数据中心和工作机器ID）
        // 计算方式：instance_id = (datacenterId << 5) | workerId
        const instanceId = (datacenterId << 5) | workerId;

        // 自定义起始时间戳（2024-01-01 00:00:00 UTC）
        const customEpoch = new Date('2024-01-01T00:00:00Z').getTime();

        this.snowflake = new Snowflake({
            custom_epoch: customEpoch,
            instance_id: instanceId,
        });

        console.log(
            `✅ Snowflake ID 服务已启动 (Worker: ${workerId}, DC: ${datacenterId}, Instance: ${instanceId})`,
        );
    }

    /**
     * 生成新的唯一 ID
     * @returns ID 字符串（防止 JavaScript 精度丢失）
     */
    nextId(): string {
        const id = this.snowflake.getUniqueID();
        return id.toString();
    }

    /**
     * 批量生成 ID
     * @param count 生成数量
     * @returns ID 字符串数组
     */
    nextIds(count: number): string[] {
        const ids: string[] = [];
        for (let i = 0; i < count; i++) {
            ids.push(this.nextId());
        }
        return ids;
    }

    /**
     * 解析 Snowflake ID（用于调试）
     * @param id ID 字符串
     * @returns 解析结果
     */
    parseId(id: string): {
        timestamp: Date;
        instanceId: number;
        sequence: number;
    } {
        const bigIntId = BigInt(id);
        const customEpoch = BigInt(new Date('2024-01-01T00:00:00Z').getTime());

        // nodejs-snowflake 的位结构
        // 时间戳：41 位（从左起第 1-41 位）
        // 实例 ID：10 位（从左起第 42-51 位）
        // 序列号：12 位（从左起第 52-63 位）

        const timestampShift = 22n; // 10 + 12
        const instanceIdShift = 12n;
        const sequenceMask = 0xfffn; // 4095
        const instanceIdMask = 0x3ffn; // 1023

        const timestamp = Number((bigIntId >> timestampShift) + customEpoch);
        const instanceId = Number((bigIntId >> instanceIdShift) & instanceIdMask);
        const sequence = Number(bigIntId & sequenceMask);

        return {
            timestamp: new Date(timestamp),
            instanceId,
            sequence,
        };
    }
}
