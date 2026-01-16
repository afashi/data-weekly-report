import { httpClient } from './http-client';
import type { ItemResponse } from '@/types/api';

/**
 * 条目编辑 API
 */
export class ItemAPI {
  /**
   * 更新单行条目
   */
  static async updateItem(
    id: string,
    contentJson: Record<string, any>
  ): Promise<ItemResponse> {
    const response = await httpClient.patch<ItemResponse>(`/items/${id}`, {
      contentJson,
    });
    return response.data;
  }
}
