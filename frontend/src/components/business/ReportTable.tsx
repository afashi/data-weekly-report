import React, { useState } from 'react';
import { Table, Input, InputNumber, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReportItem } from '@/types';

/**
 * 报表表格组件属性
 */
interface ReportTableProps {
  /** 表格数据 */
  dataSource: ReportItem[];
  /** 是否加载中 */
  loading?: boolean;
  /** 是否可编辑（默认 true） */
  editable?: boolean;
  /** 保存单行回调 */
  onSave?: (item: ReportItem) => Promise<void>;
  /** 表格类型（用于区分 DONE/PLAN） */
  tableType: 'DONE' | 'PLAN';
}

/**
 * 报表表格组件
 * 用于展示 DONE 和 PLAN 标签页的二维表格，支持行内编辑
 *
 * @example
 * ```tsx
 * <ReportTable
 *   tableType="DONE"
 *   dataSource={doneItems}
 *   onSave={async (item) => {
 *     await updateItem(item.id, item.content);
 *   }}
 * />
 * ```
 */
const ReportTable: React.FC<ReportTableProps> = ({
  dataSource,
  loading = false,
  editable = true,
  onSave,
}) => {
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingData, setEditingData] = useState<Record<string, any>>({});

  /**
   * 判断是否正在编辑
   */
  const isEditing = (record: ReportItem) => record.id === editingKey;

  /**
   * 开始编辑
   */
  const startEdit = (record: ReportItem) => {
    setEditingKey(record.id);
    setEditingData({ ...record.content });
  };

  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    setEditingKey('');
    setEditingData({});
  };

  /**
   * 保存编辑
   */
  const saveEdit = async (record: ReportItem) => {
    try {
      if (onSave) {
        const updatedRecord: ReportItem = {
          ...record,
          content: editingData as any,
        };
        await onSave(updatedRecord);
        message.success('保存成功');
      }
      setEditingKey('');
      setEditingData({});
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    }
  };

  /**
   * 更新编辑数据
   */
  const updateEditingData = (field: string, value: any) => {
    setEditingData({
      ...editingData,
      [field]: value,
    });
  };

  /**
   * 渲染可编辑单元格
   */
  const renderEditableCell = (
    text: any,
    record: ReportItem,
    field: string,
    type: 'text' | 'number' | 'select' = 'text',
    options?: { label: string; value: string }[]
  ) => {
    const editing = isEditing(record);

    if (!editing) {
      return <div style={{ minHeight: 32, lineHeight: '32px' }}>{text}</div>;
    }

    if (type === 'number') {
      return (
        <InputNumber
          value={editingData[field]}
          onChange={(value) => updateEditingData(field, value)}
          style={{ width: '100%' }}
        />
      );
    }

    if (type === 'select' && options) {
      return (
        <Select
          value={editingData[field]}
          onChange={(value) => updateEditingData(field, value)}
          style={{ width: '100%' }}
          options={options}
        />
      );
    }

    return (
      <Input
        value={editingData[field]}
        onChange={(e) => updateEditingData(field, e.target.value)}
      />
    );
  };

  /**
   * 定义表格列
   */
  const columns: ColumnsType<ReportItem> = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_text, _record, index) => index + 1,
    },
    {
      title: 'Jira Key',
      dataIndex: ['content', 'jiraKey'],
      key: 'jiraKey',
      width: 120,
      render: (text, record) => renderEditableCell(text, record, 'jiraKey'),
    },
    {
      title: '任务标题',
      dataIndex: ['content', 'title'],
      key: 'title',
      ellipsis: true,
      render: (text, record) => renderEditableCell(text, record, 'title'),
    },
    {
      title: '状态',
      dataIndex: ['content', 'status'],
      key: 'status',
      width: 100,
      render: (text, record) =>
        renderEditableCell(text, record, 'status', 'select', [
          { label: '待处理', value: 'Open' },
          { label: '进行中', value: 'In Progress' },
          { label: '已完成', value: 'Done' },
        ]),
    },
    {
      title: '负责人',
      dataIndex: ['content', 'assignee'],
      key: 'assignee',
      width: 100,
      render: (text, record) => renderEditableCell(text, record, 'assignee'),
    },
    {
      title: '故事点',
      dataIndex: ['content', 'storyPoints'],
      key: 'storyPoints',
      width: 80,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'storyPoints', 'number'),
    },
    {
      title: '工作日',
      dataIndex: ['content', 'workDays'],
      key: 'workDays',
      width: 80,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'workDays', 'number'),
    },
  ];

  /**
   * 添加操作列（如果可编辑）
   */
  if (editable) {
    columns.push({
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_text, record) => {
        const editing = isEditing(record);
        return editing ? (
          <span>
            <a onClick={() => saveEdit(record)} style={{ marginRight: 8 }}>
              保存
            </a>
            <a onClick={cancelEdit}>取消</a>
          </span>
        ) : (
          <a onClick={() => startEdit(record)}>编辑</a>
        );
      },
    });
  }

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 20,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
      }}
      scroll={{ x: 1200 }}
      size="middle"
    />
  );
};

export default ReportTable;
