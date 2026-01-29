import {httpClient} from './http-client';
import type {ItemResponse, UpdateManualItemsRequest, UpdateManualItemsResponse} from '@/types/api';

/**
 * 条目编辑 API
 */
export class ItemAPI {
    /**
     * 新增条目
     */
    static async createItem(data: {
        reportId: string;
        tabType: 'DONE' | 'SELF' | 'PLAN';
        contentJson: Record<string, any>;
        sortOrder: number;
    }): Promise<ItemResponse> {
        const response = await httpClient.post<ItemResponse>('/items', data);
        return response.data;
    }

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
     * PUT /api/reports/:id/manual-items（符合需求规格的路径）
     * 全量替换指定周报的 SELF 标签页数据
     */
    static async updateManualItems(
        reportId: string,
        items: UpdateManualItemsRequest['items']
    ): Promise<UpdateManualItemsResponse> {
        const response = await httpClient.put<UpdateManualItemsResponse>(
            `/reports/${reportId}/manual-items`,
            {items}
        );
        return response.data;
    }
}
