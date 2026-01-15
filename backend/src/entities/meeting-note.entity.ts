import {Column, Entity, Index, JoinColumn, ManyToOne} from 'typeorm';
import {BaseIdEntity} from '../common/entities/base-id.entity';
import {Transform} from 'class-transformer';
import {ReportEntity} from './report.entity';

/**
 * 会议待办表
 * 存储非结构化的备忘录信息
 */
@Entity({name: 'meeting_notes'})
@Index('idx_meeting_notes_report_id', ['reportId'])
export class MeetingNoteEntity extends BaseIdEntity {
    @Column({name: 'report_id', type: 'bigint', comment: '关联报告 ID'})
    @Transform(({value}) => (value == null ? value : value.toString()), {toPlainOnly: true})
    reportId: string;

    @ManyToOne(() => ReportEntity, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'report_id'})
    report: ReportEntity;

    @Column({name: 'content', type: 'text', comment: '纯文本内容'})
    content: string;
}
