/**
 * Snowflake ID 生成器（纯 TypeScript 实现）
 *
 * ID 结构（64 bits）：
 * - 1 bit: 未使用（始终为 0）
 * - 41 bits: 时间戳（毫秒级，自定义 epoch 起始时间）
 * - 5 bits: 数据中心 ID (0-31)
 * - 5 bits: 工作机器 ID (0-31)
 * - 12 bits: 序列号（同一毫秒内最多 4096 个 ID）
 *
 * 特点：
 * - 趋势递增（时间戳在高位）
 * - 全局唯一（数据中心 + 机器 + 序列号）
 * - 高性能（单机每秒可生成 400 万个 ID）
 */
export class SnowflakeIdGenerator {
    private sequence = 0n;
    private lastTimestamp = -1n;

    private readonly epoch: bigint;
    private readonly workerId: bigint;
    private readonly datacenterId: bigint;

    // 位移量
    private readonly workerIdBits = 5n;
    private readonly datacenterIdBits = 5n;
    private readonly sequenceBits = 12n;

    // 最大值
    private readonly maxWorkerId = -1n ^ (-1n << this.workerIdBits); // 31
    private readonly maxDatacenterId = -1n ^ (-1n << this.datacenterIdBits); // 31
    private readonly sequenceMask = -1n ^ (-1n << this.sequenceBits); // 4095

    // 左移位数
    private readonly workerIdShift = this.sequenceBits; // 12
    private readonly datacenterIdShift = this.sequenceBits + this.workerIdBits; // 17
    private readonly timestampLeftShift = this.sequenceBits + this.workerIdBits + this.datacenterIdBits; // 22

    constructor(workerId: number, datacenterId: number, epoch: number = Date.UTC(2024, 0, 1)) {
        const workerIdBigInt = BigInt(workerId);
        const datacenterIdBigInt = BigInt(datacenterId);

        // 验证参数
        if (workerIdBigInt > this.maxWorkerId || workerIdBigInt < 0n) {
            throw new Error(`Worker ID 必须在 0-${this.maxWorkerId} 之间`);
        }

        if (datacenterIdBigInt > this.maxDatacenterId || datacenterIdBigInt < 0n) {
            throw new Error(`Datacenter ID 必须在 0-${this.maxDatacenterId} 之间`);
        }

        this.workerId = workerIdBigInt;
        this.datacenterId = datacenterIdBigInt;
        this.epoch = BigInt(epoch);
    }

    /**
     * 生成下一个 ID
     * @returns ID 字符串
     */
    nextId(): string {
        let timestamp = this.timeGen();

        // 时钟回拨检测
        if (timestamp < this.lastTimestamp) {
            throw new Error(
                `时钟回拨检测到，拒绝生成 ID。上次时间戳：${this.lastTimestamp}，当前时间戳：${timestamp}`,
            );
        }

        // 同一毫秒内
        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1n) & this.sequenceMask;

            // 序列号溢出，等待下一毫秒
            if (this.sequence === 0n) {
                timestamp = this.tilNextMillis(this.lastTimestamp);
            }
        } else {
            // 新的毫秒，序列号重置
            this.sequence = 0n;
        }

        this.lastTimestamp = timestamp;

        // 组装 ID
        const id =
            ((timestamp - this.epoch) << this.timestampLeftShift) |
            (this.datacenterId << this.datacenterIdShift) |
            (this.workerId << this.workerIdShift) |
            this.sequence;

        return id.toString();
    }

    /**
     * 解析 Snowflake ID（用于调试）
     * @param id ID 字符串
     * @returns 解析结果
     */
    parseId(id: string): {
        timestamp: Date;
        datacenterId: number;
        workerId: number;
        sequence: number;
    } {
        const bigIntId = BigInt(id);

        const timestamp = Number((bigIntId >> this.timestampLeftShift) + this.epoch);
        const datacenterId = Number((bigIntId >> this.datacenterIdShift) & this.maxDatacenterId);
        const workerId = Number((bigIntId >> this.workerIdShift) & this.maxWorkerId);
        const sequence = Number(bigIntId & this.sequenceMask);

        return {
            timestamp: new Date(timestamp),
            datacenterId,
            workerId,
            sequence,
        };
    }

    /**
     * 获取当前时间戳（毫秒）
     */
    private timeGen(): bigint {
        return BigInt(Date.now());
    }

    /**
     * 等待直到下一毫秒
     */
    private tilNextMillis(lastTimestamp: bigint): bigint {
        let timestamp = this.timeGen();
        while (timestamp <= lastTimestamp) {
            timestamp = this.timeGen();
        }
        return timestamp;
    }
}
