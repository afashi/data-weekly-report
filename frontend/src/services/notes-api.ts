import { httpClient } from './http-client';
import type { NotesResponse } from '@/types/api';

/**
 * 会议待办 API
 */
export class NotesAPI {
  /**
   * 更新会议待办
   */
  static async updateNotes(
    reportId: string,
    content: string
  ): Promise<NotesResponse> {
    const response = await httpClient.patch<NotesResponse>(
      `/notes/${reportId}`,
      { content }
    );
    return response.data;
  }
}
