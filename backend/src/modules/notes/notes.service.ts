import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeetingNoteEntity } from '../../entities/meeting-note.entity';
import { IdService } from '../id/id.service';
import { UpdateNotesDto, NotesResponseDto } from './dto/notes.dto';

/**
 * 会议待办服务
 * 负责会议待办的保存和更新
 */
@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    @InjectRepository(MeetingNoteEntity)
    private readonly noteRepository: Repository<MeetingNoteEntity>,
    private readonly idService: IdService,
  ) {}

  /**
   * 更新会议待办
   * @param reportId 周报 ID
   * @param dto 更新数据
   * @returns 更新后的会议待办
   */
  async updateNotes(reportId: string, dto: UpdateNotesDto): Promise<NotesResponseDto> {
    this.logger.log(`更新会议待办 - Report ID: ${reportId}`);

    // 查询是否已存在
    let note = await this.noteRepository.findOne({
      where: { reportId: reportId as any },
    });

    if (note) {
      // 更新现有记录
      note.content = dto.content;
      await this.noteRepository.save(note);
      this.logger.log(`会议待办更新成功 - Report ID: ${reportId}`);
    } else {
      // 创建新记录
      const noteId = this.idService.nextId();
      note = this.noteRepository.create({
        id: noteId,
        reportId: reportId as any,
        content: dto.content,
      });
      await this.noteRepository.save(note);
      this.logger.log(`会议待办创建成功 - Report ID: ${reportId}`);
    }

    // 返回更新后的数据
    return {
      id: note.id.toString(),
      reportId: note.reportId.toString(),
      content: note.content,
    };
  }
}
