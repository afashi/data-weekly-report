import {
  Controller,
  Patch,
  Param,
  Body,
  Logger,
} from '@nestjs/common';
import { NotesService } from './notes.service';
import { UpdateNotesDto, NotesResponseDto } from './dto/notes.dto';

/**
 * 会议待办 Controller
 * 提供会议待办保存功能
 */
@Controller('notes')
export class NotesController {
  private readonly logger = new Logger(NotesController.name);

  constructor(private readonly notesService: NotesService) {}

  /**
   * PATCH /api/notes/:reportId
   * 更新会议待办
   *
   * @param reportId 周报 ID
   * @param dto 更新数据
   * @returns 更新后的会议待办
   */
  @Patch(':reportId')
  async updateNotes(
    @Param('reportId') reportId: string,
    @Body() dto: UpdateNotesDto,
  ): Promise<NotesResponseDto> {
    this.logger.log(`收到更新会议待办请求 - Report ID: ${reportId}`);

    try {
      const result = await this.notesService.updateNotes(reportId, dto);
      this.logger.log(`会议待办更新成功 - Report ID: ${reportId}`);
      return result;
    } catch (error) {
      this.logger.error(`会议待办更新失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
