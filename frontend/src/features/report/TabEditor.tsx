import { Tabs, Table, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import { ItemAPI } from '@/services/item-api';
import type { ReportItemDto } from '@/types/api';

interface TabEditorProps {
  items: ReportItemDto[];
    reportId?: string;
  onUpdate?: () => void;
}

interface EditableItem {
  id: string;
  jiraKey: string;
  title: string;
  status: string;
  assignee: string;
  [key: string]: any;
}

/**
 * Tab 编辑器组件
 * 包含 DONE、SELF、PLAN 三个标签页
 */
export default function TabEditor({ items, onUpdate }: TabEditorProps) {
  const [loading, setLoading] = useState(false);

  // 按 tabType 分组数据
  const doneItems = items.filter((item) => item.tabType === 'DONE');
  const selfItems = items.filter((item) => item.tabType === 'SELF');
  const planItems = items.filter((item) => item.tabType === 'PLAN');

  // 转换数据格式
  const transformItems = (items: ReportItemDto[]): EditableItem[] => {
    return items.map((item) => {
      const contentJson = typeof item.contentJson === 'string'
        ? JSON.parse(item.contentJson)
        : item.contentJson;
      return {
        id: item.id,
        ...contentJson,
      };
    });
  };

  // 处理单元格编辑
  const handleCellEdit = async (
    itemId: string,
    field: string,
    value: string,
    originalItem: ReportItemDto
  ) => {
    try {
      setLoading(true);
      const contentJson = typeof originalItem.contentJson === 'string'
        ? JSON.parse(originalItem.contentJson)
        : originalItem.contentJson;
      const updatedContent = {
        ...contentJson,
        [field]: value,
      };
      await ItemAPI.updateItem(itemId, updatedContent);
      message.success('更新成功');
      onUpdate?.();
    } catch (error) {
      message.error('更新失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // DONE 标签页列定义
  const doneColumns: ColumnsType<EditableItem> = [
    {
      title: 'Jira号',
      dataIndex: 'jiraKey',
      key: 'jiraKey',
      width: 120,
      fixed: 'left',
    },
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text, record) => {
        const originalItem = doneItems.find((item) => item.id === record.id);
        return (
          <Input.TextArea
            defaultValue={text}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onBlur={(e) =>
              originalItem &&
              handleCellEdit(record.id, 'title', e.target.value, originalItem)
            }
          />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
    },
    {
      title: '开发环境',
      dataIndex: 'devStatus',
      key: 'devStatus',
      width: 100,
    },
    {
      title: '测试环境',
      dataIndex: 'testStatus',
      key: 'testStatus',
      width: 100,
    },
    {
      title: '验证环境',
      dataIndex: 'verifyStatus',
      key: 'verifyStatus',
      width: 100,
    },
    {
      title: '复盘环境',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 100,
    },
    {
      title: '生产环境',
      dataIndex: 'prodStatus',
      key: 'prodStatus',
      width: 100,
    },
  ];

  // SELF 标签页列定义（树形表格）
  const selfColumns: ColumnsType<EditableItem> = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text, record) => {
        const originalItem = selfItems.find((item) => item.id === record.id);
        return (
          <Input.TextArea
            defaultValue={text}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onBlur={(e) =>
              originalItem &&
              handleCellEdit(record.id, 'title', e.target.value, originalItem)
            }
          />
        );
      },
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
    },
    {
      title: '工期（天）',
      dataIndex: 'workDays',
      key: 'workDays',
      width: 100,
    },
  ];

  // PLAN 标签页列定义
  const planColumns: ColumnsType<EditableItem> = [
    {
      title: 'Jira号',
      dataIndex: 'jiraKey',
      key: 'jiraKey',
      width: 120,
      fixed: 'left',
    },
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 300,
      render: (text, record) => {
        const originalItem = planItems.find((item) => item.id === record.id);
        return (
          <Input.TextArea
            defaultValue={text}
            autoSize={{ minRows: 1, maxRows: 3 }}
            onBlur={(e) =>
              originalItem &&
              handleCellEdit(record.id, 'title', e.target.value, originalItem)
            }
          />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
    },
    {
      title: '负责人',
      dataIndex: 'assignee',
      key: 'assignee',
      width: 100,
    },
    {
      title: '预计工期',
      dataIndex: 'workDays',
      key: 'workDays',
      width: 100,
    },
  ];

  // 构建树形数据（用于 SELF 标签页）
  const buildTreeData = (items: ReportItemDto[]): EditableItem[] => {
    const itemMap = new Map<string, EditableItem & { children?: EditableItem[] }>();
    const rootItems: (EditableItem & { children?: EditableItem[] })[] = [];

    // 第一遍：创建所有节点
    items.forEach((item) => {
      const contentJson = typeof item.contentJson === 'string'
        ? JSON.parse(item.contentJson)
        : item.contentJson;
      const node = {
        id: item.id,
        ...contentJson,
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

  const tabItems = [
    {
      key: 'DONE',
      label: '✅ 本周完成',
      children: (
        <Table
          columns={doneColumns}
          dataSource={transformItems(doneItems)}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={false}
          size="small"
        />
      ),
    },
    {
      key: 'SELF',
      label: '📝 自采数据',
      children: (
        <Table
          columns={selfColumns}
          dataSource={buildTreeData(selfItems)}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
          expandable={{
            defaultExpandAllRows: true,
          }}
        />
      ),
    },
    {
      key: 'PLAN',
      label: '📅 后续计划',
      children: (
        <Table
          columns={planColumns}
          dataSource={transformItems(planItems)}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={false}
          size="small"
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
