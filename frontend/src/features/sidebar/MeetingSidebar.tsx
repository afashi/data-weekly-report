import React, { useState, useEffect } from 'react';
import { Drawer, Input, Button, Space, Typography, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Text } = Typography;

/**
 * 会议待办侧边栏组件属性
 */
interface MeetingSidebarProps {
  /** 是否显示侧边栏 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 会议待办内容 */
  content: string;
  /** 周报 ID */
  reportId: string;
  /** 保存回调 */
  onSave?: (reportId: string, content: string) => Promise<void>;
  /** 是否加载中 */
  loading?: boolean;
}

/**
 * 会议待办侧边栏组件
 * 用于编辑和保存会议待办事项
 *
 * @example
 * ```tsx
 * <MeetingSidebar
 *   visible={sidebarVisible}
 *   onClose={() => setSidebarVisible(false)}
 *   content={notes}
 *   reportId={currentReportId}
 *   onSave={async (reportId, content) => {
 *     await updateNotes(reportId, content);
 *   }}
 * />
 * ```
 */
const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  visible,
  onClose,
  content,
  reportId,
  onSave,
  loading = false,
}) => {
  const [editContent, setEditContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * 同步外部内容变化
   */
  useEffect(() => {
    setEditContent(content);
    setHasChanges(false);
  }, [content, visible]);

  /**
   * 处理内容变化
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
    setHasChanges(e.target.value !== content);
  };

  /**
   * 保存会议待办
   */
  const handleSave = async () => {
    if (!onSave) {
      return;
    }

    try {
      setSaving(true);
      await onSave(reportId, editContent);
      message.success('保存成功');
      setHasChanges(false);
    } catch (error) {
      message.error('保存失败');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 关闭前确认
   */
  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm('有未保存的更改，确定要关闭吗？');
      if (!confirmed) {
        return;
      }
    }
    onClose();
  };

  return (
    <Drawer
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            会议待办
          </Title>
          {hasChanges && (
            <Text type="warning" style={{ fontSize: 12 }}>
              (未保存)
            </Text>
          )}
        </Space>
      }
      placement="right"
      width={500}
      open={visible}
      onClose={handleClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button icon={<CloseOutlined />} onClick={handleClose}>
            关闭
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges || loading}
          >
            保存
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
          记录本周会议讨论的待办事项，支持多行文本输入
        </Text>
      </div>
      <TextArea
        value={editContent}
        onChange={handleContentChange}
        placeholder="请输入会议待办事项，每行一条..."
        autoSize={{ minRows: 20, maxRows: 30 }}
        disabled={loading || saving}
        style={{
          fontSize: 14,
          lineHeight: 1.8,
        }}
      />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          提示：失焦时不会自动保存，请点击"保存"按钮
        </Text>
      </div>
    </Drawer>
  );
};

export default MeetingSidebar;
