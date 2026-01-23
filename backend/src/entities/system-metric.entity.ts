import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BaseIdEntity} from '../common/entities/base-id.entity';
import {Transform} from 'class-transformer';
import {ReportEntity} from './report.entity';

/**
 * 系统指标表
 * 存储页面顶部的关键统计指标
 */
@Entity({name: 'system_metrics'})
@Index('idx_system_metrics_report_id', ['reportId'])
@Index('uniq_system_metrics_report_key', ['reportId', 'metricKey'], {unique: true})
export class SystemMetricEntity extends BaseIdEntity {
    @Column({name: 'report_id', type: 'bigint', comment: '关联报告 ID'})
    @Transform(({value}) => (value == null ? value : value.toString()), {toPlainOnly: true})
    reportId: string;

    @ManyToOne(() => ReportEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'report_id'})
    report: ReportEntity;

    @Column({
        name: 'metric_key',
        type: 'varchar',
        length: 64,
        comment: '指标标识：TOTAL_COUNT, PROCESS_COUNT, MANUAL_COUNT, VERIFY_ETL, REVIEW_ETL',
    })
    metricKey: string;

    @Column({name: 'metric_value', type: 'varchar', length: 128, comment: '显示值（数值或时间字符串）'})
    metricValue: string;

    @Column({
        name: 'status_code',
        type: 'varchar',
        length: 32,
        comment: '状态标识：loading, success, normal',
    })
    statusCode: string;
}
