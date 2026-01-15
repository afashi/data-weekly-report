import {Column, CreateDateColumn, Entity, Index} from 'typeorm';
import {BaseIdEntity} from '../common/entities/base-id.entity';

/**
 * 报告主表
 * 存储每次生成的周报版本元数据
 */
@Entity({name: 'reports'})
@Index('idx_reports_is_deleted_created_at', ['isDeleted', 'createdAt'])
export class ReportEntity extends BaseIdEntity {
    @Column({name: 'week_range', type: 'varchar', length: 32, comment: '周周期描述，如 2026/01/12-2026/01/18'})
    weekRange: string;

    @Column({name: 'week_number', type: 'int', comment: '年度周数，如第 3 周'})
    weekNumber: number;

    @CreateDateColumn({name: 'created_at', type: 'datetime', comment: '生成时间'})
    createdAt: Date;

    @Column({name: 'is_deleted', type: 'boolean', default: false, comment: '软删除标记'})
    isDeleted: boolean;
}
