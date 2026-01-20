import { httpClient } from './http-client';
import type {ItemResponse, UpdateManualItemsRequest, UpdateManualItemsResponse} from '@/types/api';

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

    /**
     * 批量更新手动条目(SELF 标签页)
     * 全量替换指定周报的 SELF 标签页数据
     */
    static async updateManualItems(
        reportId: string,
        items: UpdateManualItemsRequest['items']
    ): Promise<UpdateManualItemsResponse> {
        const response = await httpClient.put<UpdateManualItemsResponse>(
            `/items/reports/${reportId}/manual-items`,
            {items}
        );
        return response.data;
    }
}
