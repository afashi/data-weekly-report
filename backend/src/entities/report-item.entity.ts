import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BaseIdEntity} from '../common/entities/base-id.entity';
import {Transform} from 'class-transformer';
import {ReportEntity} from './report.entity';

/**
 * 报表条目表
 * 存储三个核心 Tab 页的详细数据行，支持树形结构
 */
@Entity({name: 'report_items'})
@Index('idx_report_items_report_tab', ['reportId', 'tabType'])
@Index('idx_report_items_parent', ['parentId'])
@Index('idx_report_items_sort', ['reportId', 'tabType', 'sortOrder'])
export class ReportItemEntity extends BaseIdEntity {
    @Column({name: 'report_id', type: 'bigint', comment: '关联报告 ID'})
    @Transform(({value}) => (value == null ? value : value.toString()), {toPlainOnly: true})
    reportId: number;

    @ManyToOne(() => ReportEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'report_id'})
    report: ReportEntity;

    @Column({
        name: 'tab_type',
        type: 'varchar',
        length: 16,
        comment: '标签类型：DONE (本周完成), SELF (自采), PLAN (后续计划)',
    })
    tabType: 'DONE' | 'SELF' | 'PLAN';

    @Column({
        name: 'source_type',
        type: 'varchar',
        length: 16,
        comment: '数据来源：JIRA, SQL, MANUAL',
    })
    sourceType: 'JIRA' | 'SQL' | 'MANUAL';

    @Column({
        name: 'parent_id',
        type: 'bigint',
        nullable: true,
        comment: '父节点 ID（用于自采数据的任务层级，根节点为 NULL）',
    })
    @Transform(({value}) => (value == null ? value : value.toString()), {toPlainOnly: true})
    parentId: number | null;

    @Column({
        name: 'content_json',
        type: 'text',
        comment: '业务数据 JSON（包含任务名、Jira号、工期、各环境状态、负责人等）',
    })
    contentJson: string;

    @Column({name: 'sort_order', type: 'int', comment: '排序权重'})
    sortOrder: number;
}
