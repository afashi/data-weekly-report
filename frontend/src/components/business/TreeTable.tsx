import React, {useState} from 'react';
import {Button, ConfigProvider, Input, InputNumber, message, Select, Space, Table} from 'antd';
import {CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined, PlusOutlined, SyncOutlined} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import type {ReportItem} from '@/types';
import {theme} from '@/styles/theme';

/**
 * 树形表格组件属性
 */
interface TreeTableProps {
  /** 表格数据（树形结构） */
  dataSource: ReportItem[];
  /** 是否加载中 */
  loading?: boolean;
  /** 是否可编辑（默认 true） */
  editable?: boolean;
  /** 保存全量数据回调 */
  onSave?: (items: ReportItem[]) => Promise<void>;
}

/**
 * 树形表格组件
 * 用于展示 SELF 标签页的树形表格，支持主任务-子任务两层结构
 * 采用全量提交模式，编辑后需点击"保存全部"按钮
 *
 * ✅ UI 改进：
 * - 使用图标+文本组合替代 emoji，确保跨平台一致性
 * - 统一状态选择器样式
 *
 * @example
 * ```tsx
 * <TreeTable
 *   dataSource={selfItems}
 *   onSave={async (items) => {
 *     await updateManualItems(reportId, items);
 *   }}
 * />
 * ```
 */

// ✅ 统一的状态选项配置（使用图标+文本）
const STATUS_OPTIONS = [
  {
    label: (
      <Space size={4}>
        <CheckCircleOutlined style={{ color: '#52c41a' }} />
        <span>已完成</span>
      </Space>
    ),
    value: 'done'
  },
  {
    label: (
      <Space size={4}>
        <SyncOutlined style={{ color: '#1890ff' }} />
        <span>进行中</span>
      </Space>
    ),
    value: 'doing'
  },
  {
    label: (
      <Space size={4}>
        <ClockCircleOutlined style={{ color: '#faad14' }} />
        <span>待处理</span>
      </Space>
    ),
    value: 'pending'
  },
];

const TreeTable: React.FC<TreeTableProps> = ({
  dataSource,
  loading = false,
  editable = true,
  onSave,
}) => {
  const [data, setData] = useState<ReportItem[]>(dataSource);
  const [hasChanges, setHasChanges] = useState(false);

  /**
   * 更新数据项
   */
  const updateItem = (id: string, field: string, value: any) => {
    const updateRecursive = (items: ReportItem[]): ReportItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            content: {
              ...item.content,
              [field]: value,
            },
          };
        }
        if (item.children) {
          return {
            ...item,
            children: updateRecursive(item.children),
          };
        }
        return item;
      });
    };

    setData(updateRecursive(data));
    setHasChanges(true);
  };

  /**
   * 添加子任务
   */
  const addChild = (parentId: string) => {
    const newChild: ReportItem = {
      id: `temp_${Date.now()}`,
      tabType: 'SELF',
      sourceType: 'MANUAL',
      parentId,
      content: {
        jiraKey: '',
        title: '',
        status: 'In Progress',
        assignee: '',
        storyPoints: 0,
        workDays: 0,
      },
      sortOrder: 0,
    };

    const addRecursive = (items: ReportItem[]): ReportItem[] => {
      return items.map((item) => {
        if (item.id === parentId) {
          return {
            ...item,
            children: [...(item.children || []), newChild],
          };
        }
        if (item.children) {
          return {
            ...item,
            children: addRecursive(item.children),
          };
        }
        return item;
      });
    };

    setData(addRecursive(data));
    setHasChanges(true);
  };

    /**
     * 添加主任务
     */
    const addMainTask = () => {
        const newTask: ReportItem = {
            id: `temp_${Date.now()}`,
            tabType: 'SELF',
            sourceType: 'MANUAL',
            content: {
                jiraKey: '',
                title: '',
                status: 'In Progress',
                assignee: '',
                storyPoints: 0,
                workDays: 0,
            },
            sortOrder: data.length,
        };

        setData([...data, newTask]);
        setHasChanges(true);
    };

  /**
   * 删除任务
   */
  const deleteItem = (id: string) => {
    const deleteRecursive = (items: ReportItem[]): ReportItem[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.children) {
            return {
              ...item,
              children: deleteRecursive(item.children),
            };
          }
          return item;
        });
    };

    setData(deleteRecursive(data));
    setHasChanges(true);
  };

  /**
   * 保存全部
   */
  const saveAll = async () => {
    try {
      if (onSave) {
        await onSave(data);
        message.success('保存成功');
        setHasChanges(false);
      }
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    }
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
    if (!editable) {
      return <div style={{ minHeight: 32, lineHeight: '32px' }}>{text}</div>;
    }

    if (type === 'number') {
      return (
        <InputNumber
          value={text}
          onChange={(value) => updateItem(record.id, field, value)}
          style={{ width: '100%' }}
        />
      );
    }

    if (type === 'select' && options) {
      return (
        <Select
          value={text}
          onChange={(value) => updateItem(record.id, field, value)}
          style={{ width: '100%' }}
          options={options}
        />
      );
    }

    return (
      <Input
        value={text}
        onChange={(e) => updateItem(record.id, field, e.target.value)}
      />
    );
  };

  /**
   * 定义表格列
   */
  const columns: ColumnsType<ReportItem> = [
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
      title: '开发',
      dataIndex: ['content', 'devStatus'],
      key: 'devStatus',
      width: 100,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'devStatus', 'select', STATUS_OPTIONS),
    },
    {
      title: '测试',
      dataIndex: ['content', 'testStatus'],
      key: 'testStatus',
      width: 100,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'testStatus', 'select', STATUS_OPTIONS),
    },
    {
      title: '验证',
      dataIndex: ['content', 'verifyStatus'],
      key: 'verifyStatus',
      width: 100,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'verifyStatus', 'select', STATUS_OPTIONS),
    },
    {
      title: '复盘',
      dataIndex: ['content', 'reviewStatus'],
      key: 'reviewStatus',
      width: 100,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'reviewStatus', 'select', STATUS_OPTIONS),
    },
    {
      title: '生产',
      dataIndex: ['content', 'prodStatus'],
      key: 'prodStatus',
      width: 100,
      align: 'center',
      render: (text, record) =>
        renderEditableCell(text, record, 'prodStatus', 'select', STATUS_OPTIONS),
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
      fixed: 'right',
      render: (_text, record) => {
        const isParent = !record.parentId;
        return (
          <Space size="small">
            {isParent && (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => addChild(record.id)}
              >
                添加子任务
              </Button>
            )}
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => deleteItem(record.id)}
            >
              删除
            </Button>
          </Space>
        );
      },
    });
  }

  return (
      <div>
          <ConfigProvider
              theme={{
                  components: {
                      Table: {
                          headerBg: '#fafafa',
                          headerColor: theme.colors.textPrimary,
                          rowHoverBg: '#f5f5f5',
                          borderColor: theme.colors.border,
                          borderRadius: theme.borderRadius.md,
                      },
                  },
              }}
          >
              <Table
                  columns={columns}
                  dataSource={data}
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                  expandable={{
                      defaultExpandAllRows: true,
                  }}
                  scroll={{x: 1400}}
                  size="middle"
                  style={{borderRadius: theme.borderRadius.md, overflow: 'hidden'}}
              />
          </ConfigProvider>
          {editable && (
              <div style={{marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Button
                      type="dashed"
                      icon={<PlusOutlined/>}
                      onClick={addMainTask}
                  >
                      添加主任务
                  </Button>
                  {hasChanges && (
                      <Button type="primary" onClick={saveAll}>
                          保存全部
                      </Button>
                  )}
              </div>
          )}
    </div>
  );
};

export default TreeTable;
