import {message, Tabs} from 'antd';
import {useState} from 'react';
import ReportTable from '@/components/business/ReportTable';
import TreeTable from '@/components/business/TreeTable';
import {ItemAPI} from '@/services/item-api';
import type {ReportItemDto} from '@/types/api';
import type {ReportItem} from '@/types';

interface TabEditorProps {
  items: ReportItemDto[];
    reportId?: string;
  onUpdate?: () => void;
}

/**
 * Tab 编辑器组件
 * 包含 DONE、SELF、PLAN 三个标签页
 * 复用 ReportTable 和 TreeTable 业务组件
 */
export default function TabEditor({items, reportId, onUpdate}: TabEditorProps) {
  const [loading, setLoading] = useState(false);

  // 按 tabType 分组数据
  const doneItems = items.filter((item) => item.tabType === 'DONE');
  const selfItems = items.filter((item) => item.tabType === 'SELF');
  const planItems = items.filter((item) => item.tabType === 'PLAN');

    // 转换数据格式为 ReportItem
    const transformToReportItem = (item: ReportItemDto): ReportItem => {
        const contentJson = typeof item.contentJson === 'string'
            ? JSON.parse(item.contentJson)
            : item.contentJson;
        return {
            id: item.id,
            tabType: item.tabType,
            sourceType: item.sourceType,
            parentId: item.parentId,
            content: contentJson,
            sortOrder: item.sortOrder,
        };
    };

  // 构建树形数据（用于 SELF 标签页）
    const buildTreeData = (items: ReportItemDto[]): ReportItem[] => {
        const itemMap = new Map<string, ReportItem & { children?: ReportItem[] }>();
        const rootItems: (ReportItem & { children?: ReportItem[] })[] = [];

    // 第一遍：创建所有节点
    items.forEach((item) => {
      const node = {
          ...transformToReportItem(item),
        children: [],
      };
      itemMap.set(item.id, node);
    });

    // 第二遍：构建树形结构
    items.forEach((item) => {
      const node = itemMap.get(item.id);
      if (node) {
        if (item.parentId) {
          const parent = itemMap.get(item.parentId);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(node);
          } else {
            rootItems.push(node);
          }
        } else {
          rootItems.push(node);
        }
      }
    });

    return rootItems;
  };

    // 处理单行保存（DONE/PLAN Tab）
    const handleSaveItem = async (item: ReportItem) => {
        try {
            setLoading(true);
            await ItemAPI.updateItem(item.id, item.content);
            onUpdate?.();
        } finally {
            setLoading(false);
        }
    };

    // 处理新增一行（DONE/PLAN Tab）
    const handleAddItem = async (item: Partial<ReportItem>) => {
        try {
            setLoading(true);
            if (reportId && item.content) {
                // 调用后端 API 新增条目
                await ItemAPI.createItem({
                    reportId,
                    tabType: item.tabType as 'DONE' | 'PLAN',
                    contentJson: item.content,
                    sortOrder: item.sortOrder || 0,
                });
                message.success('添加成功');
                // 刷新数据
                onUpdate?.();
            }
        } catch (error) {
            message.error('添加失败');
            console.error('Add item error:', error);
        } finally {
            setLoading(false);
        }
    };

    // 处理全量保存（SELF Tab）
    const handleSaveTree = async (items: ReportItem[]) => {
        try {
            setLoading(true);
            if (reportId) {
                // 转换为 ManualItemDto 格式
                const manualItems = items.map((item) => ({
                    id: item.id,
                    parentId: item.parentId,
                    contentJson: item.content,
                    sortOrder: item.sortOrder,
                }));
                await ItemAPI.updateManualItems(reportId, manualItems);
                onUpdate?.();
            }
        } finally {
            setLoading(false);
        }
    };

  const tabItems = [
    {
      key: 'DONE',
      label: '✅ 本周完成',
      children: (
          <ReportTable
              tableType="DONE"
              dataSource={doneItems.map(transformToReportItem)}
          loading={loading}
              onSave={handleSaveItem}
              onAdd={handleAddItem}
        />
      ),
    },
    {
      key: 'SELF',
      label: '📝 自采数据',
      children: (
          <TreeTable
          dataSource={buildTreeData(selfItems)}
          loading={loading}
          onSave={handleSaveTree}
        />
      ),
    },
    {
      key: 'PLAN',
      label: '📅 后续计划',
      children: (
          <ReportTable
              tableType="PLAN"
              dataSource={planItems.map(transformToReportItem)}
          loading={loading}
              onSave={handleSaveItem}
              onAdd={handleAddItem}
        />
      ),
    },
  ];

  return (
    <Tabs
      defaultActiveKey="DONE"
      items={tabItems}
      style={{ background: '#fff', padding: '16px', borderRadius: '8px' }}
    />
  );
}
