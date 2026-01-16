import { Drawer, Input, Button, Space, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { NotesAPI } from '@/services/notes-api';

interface NotesSidebarProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  initialNotes: string;
  onUpdate?: () => void;
}

/**
 * 会议待办侧边栏组件
 * 支持编辑和保存会议待办内容
 */
export default function NotesSidebar({
  open,
  onClose,
  reportId,
  initialNotes,
  onUpdate,
}: NotesSidebarProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 同步初始值
  useEffect(() => {
    setNotes(initialNotes);
    setHasChanges(false);
  }, [initialNotes, open]);

  // 处理内容变化
  const handleChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== initialNotes);
  };

  // 处理保存
  const handleSave = async () => {
    try {
      setLoading(true);
      await NotesAPI.updateNotes(reportId, notes);
      message.success('会议待办已保存');
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      message.error('保存失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('有未保存的更改，确定要关闭吗？')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <Drawer
      title="📝 会议待办"
      placement="right"
      width={500}
      open={open}
      onClose={handleClose}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
          >
            保存
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleClose}>
            关闭
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
          记录本周会议讨论的待办事项、重要决策等内容
        </div>
        <Input.TextArea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="请输入会议待办内容..."
          autoSize={{ minRows: 20, maxRows: 30 }}
          style={{ fontSize: 14, lineHeight: 1.8 }}
        />
      </div>
      {hasChanges && (
        <div
          style={{
            padding: '8px 12px',
            background: '#fff7e6',
            border: '1px solid #ffd591',
            borderRadius: '4px',
            color: '#d46b08',
            fontSize: 12,
          }}
        >
          ⚠️ 有未保存的更改
        </div>
      )}
    </Drawer>
  );
}
