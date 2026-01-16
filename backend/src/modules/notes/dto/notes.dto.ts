import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 更新会议待办请求 DTO
 */
export class UpdateNotesDto {
  @IsNotEmpty()
  @IsString()
  content: string;
}

/**
 * 会议待办响应 DTO
 */
export class NotesResponseDto {
  id: string;
  reportId: string;
  content: string;
}
