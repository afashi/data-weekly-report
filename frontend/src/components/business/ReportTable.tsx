import React, {useState} from 'react';
import {Button, ConfigProvider, Input, InputNumber, message, Popconfirm, Select, Space, Table} from 'antd';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SaveOutlined,
    SyncOutlined
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import type {ReportItem} from '@/types';
import {theme} from '@/styles/theme';

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
    /** 新增一行回调 */
    onAdd?: (item: Partial<ReportItem>) => Promise<void>;
    /** 删除一行回调 */
    onDelete?: (id: string) => Promise<void>;
  /** 表格类型（用于区分 DONE/PLAN） */
  tableType: 'DONE' | 'PLAN';
}

/**
 * 报表表格组件
 * 用于展示 DONE 和 PLAN 标签页的二维表格，支持行内编辑
 *
 * ✅ UI 改进：
 * - 环境状态列使用下拉选择替代自由输入
 * - 统一状态选择器样式（图标+文本）
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

// ✅ 统一的环境状态选项配置（使用图标+文本）
const ENV_STATUS_OPTIONS = [
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

const ReportTable: React.FC<ReportTableProps> = ({
  dataSource,
  loading = false,
  editable = true,
  onSave,
                                                     onAdd,
                                                     onDelete,
                                                     tableType,
}) => {
  const [editingKey, setEditingKey] = useState<string>('');
  const [editingData, setEditingData] = useState<Record<string, any>>({});
    const [localData, setLocalData] = useState<ReportItem[]>(dataSource);
    const [saving, setSaving] = useState(false);

    // 当 dataSource 变化时更新 localData
    React.useEffect(() => {
        setLocalData(dataSource);
    }, [dataSource]);

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
      // 如果正在保存，直接返回
      if (saving) {
          return;
      }

    try {
        setSaving(true);
      if (onSave) {
        const updatedRecord: ReportItem = {
          ...record,
          content: editingData as any,
        };

          // 如果是临时 ID（新增的行），调用 onAdd
          if (record.id.startsWith('temp_')) {
              if (onAdd) {
                  await onAdd(updatedRecord);
                  message.success('添加成功');
              }
          } else {
              // 否则调用 onSave 更新
              await onSave(updatedRecord);
              message.success('保存成功');
          }
      }
      setEditingKey('');
      setEditingData({});
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    } finally {
        setSaving(false);
    }
  };

    /**
     * 删除行
     */
    const deleteRow = async (record: ReportItem) => {
        // 如果是临时 ID，直接从本地数据中删除
        if (record.id.startsWith('temp_')) {
            setLocalData(localData.filter(item => item.id !== record.id));
            message.success('删除成功');
        } else {
            // 调用后端删除 API
            if (onDelete) {
                try {
                    await onDelete(record.id);
                    // 删除成功后从本地数据中移除
                    setLocalData(localData.filter(item => item.id !== record.id));
                } catch (error) {
                    // 错误处理已在 useDeleteItem Hook 中完成
                    console.error('Delete error:', error);
                }
            } else {
                message.warning('删除功能未配置');
            }
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
     * 添加新行
     */
    const addNewRow = () => {
        const tempId = `temp_${Date.now()}`;

        // 根据 tableType 创建不同的默认内容
        const defaultContent: any = {
            jiraKey: '',
            title: '',
            status: 'Open',
            assignee: '',
        };

        // DONE Tab 需要环境状态字段
        if (tableType === 'DONE') {
            defaultContent.devStatus = '';
            defaultContent.testStatus = '';
            defaultContent.verifyStatus = '';
            defaultContent.reviewStatus = '';
            defaultContent.prodStatus = '';
        }

        // PLAN Tab 需要故事点和工作日字段
        if (tableType === 'PLAN') {
            defaultContent.storyPoints = 0;
            defaultContent.workDays = 0;
        }

        const newItem: ReportItem = {
            id: tempId,
            tabType: tableType,
            sourceType: 'MANUAL',
            content: defaultContent,
            sortOrder: localData.length,
        };

        // 添加到本地数据
        setLocalData([...localData, newItem]);

        // 立即进入编辑状态
        setEditingKey(tempId);
        setEditingData(newItem.content);
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
        return (
            <div style={{minHeight: 32, lineHeight: '32px'}}>
                {text || '-'}
            </div>
        );
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
  ];

    // DONE Tab 特有的环境状态列
    if (tableType === 'DONE') {
        columns.push(
            {
                title: '开发环境',
                dataIndex: ['content', 'devStatus'],
                key: 'devStatus',
                width: 120,
                render: (text, record) => renderEditableCell(text, record, 'devStatus', 'select', ENV_STATUS_OPTIONS),
            },
            {
                title: '测试环境',
                dataIndex: ['content', 'testStatus'],
                key: 'testStatus',
                width: 120,
                render: (text, record) => renderEditableCell(text, record, 'testStatus', 'select', ENV_STATUS_OPTIONS),
            },
            {
                title: '验证环境',
                dataIndex: ['content', 'verifyStatus'],
                key: 'verifyStatus',
                width: 120,
                render: (text, record) => renderEditableCell(text, record, 'verifyStatus', 'select', ENV_STATUS_OPTIONS),
            },
            {
                title: '复盘环境',
                dataIndex: ['content', 'reviewStatus'],
                key: 'reviewStatus',
                width: 120,
                render: (text, record) => renderEditableCell(text, record, 'reviewStatus', 'select', ENV_STATUS_OPTIONS),
            },
            {
                title: '生产环境',
                dataIndex: ['content', 'prodStatus'],
                key: 'prodStatus',
                width: 120,
                render: (text, record) => renderEditableCell(text, record, 'prodStatus', 'select', ENV_STATUS_OPTIONS),
            }
        );
    }

    // PLAN Tab 特有的故事点和工作日列
    if (tableType === 'PLAN') {
        columns.push(
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
            }
        );
    }

    // 添加操作列
  if (editable) {
    columns.push({
      title: '操作',
      key: 'action',
        width: 150,
      align: 'center',
        fixed: 'right',
      render: (_text, record) => {
        const editing = isEditing(record);
        return editing ? (
            <Space size="small">
                <Button
                    type="link"
                    size="small"
                    icon={<SaveOutlined/>}
                    onClick={() => saveEdit(record)}
                    loading={saving}
                >
              保存
                </Button>
                <Button
                    type="link"
                    size="small"
                    icon={<CloseOutlined/>}
                    onClick={cancelEdit}
                >
                    取消
                </Button>
            </Space>
        ) : (
            <Space size="small">
                <Button
                    type="link"
                    size="small"
                    icon={<EditOutlined/>}
                    onClick={() => startEdit(record)}
                >
                    编辑
                </Button>
                <Popconfirm
                    title="确定删除这条记录吗？"
                    onConfirm={() => deleteRow(record)}
                    okText="确定"
                    cancelText="取消"
                >
                    <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined/>}
                    >
                        删除
                    </Button>
                </Popconfirm>
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
                  dataSource={localData}
                  loading={loading}
                  rowKey="id"
                  pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showTotal: (total) => `共 ${total} 条`,
                  }}
                  scroll={{x: 1200}}
                  size="middle"
                  style={{borderRadius: theme.borderRadius.md, overflow: 'hidden'}}
              />
          </ConfigProvider>
          {editable && onAdd && (
              <div style={{marginTop: 16, textAlign: 'left'}}>
                  <Button
                      type="dashed"
                      icon={<PlusOutlined/>}
                      onClick={addNewRow}
                  >
                      新增一行
                  </Button>
              </div>
          )}
      </div>
  );
};

export default ReportTable;
