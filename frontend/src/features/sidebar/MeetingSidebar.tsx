import React, {useState, useEffect, useCallback} from 'react';
import {Drawer, Input, Button, Space, Typography, Spin} from 'antd';
import {SaveOutlined, CloseOutlined, CheckOutlined} from '@ant-design/icons';
import {useUpdateNotes} from '@/hooks';
import {debounce} from 'lodash-es';

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
}

/**
 * 会议待办侧边栏组件
 *
 * 功能需求：
 * 1. Drawer 侧边栏容器（Ant Design Drawer）
 * 2. TextArea 编辑器（支持多行文本）
 * 3. 自动保存逻辑（防抖 500ms）
 * 4. 保存中加载状态
 * 5. 保存成功/失败提示
 */
const MeetingSidebar: React.FC<MeetingSidebarProps> = ({
  visible,
  onClose,
  content,
  reportId,
}) => {
  const [editContent, setEditContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);

    // 更新会议待办 Hook
    const {mutate: updateNotes, isPending: isSaving} = useUpdateNotes();

  /**
   * 同步外部内容变化
   */
  useEffect(() => {
    setEditContent(content);
    setHasChanges(false);
  }, [content, visible]);

    /**
     * 防抖保存函数（500ms）
     * 使用 useCallback 避免每次渲染都创建新函数
     */
        // eslint-disable-next-line react-hooks/exhaustive-deps
    const debouncedSave = useCallback(
            debounce((reportId: string, content: string) => {
                updateNotes(
                    {reportId, content},
                    {
                        onSuccess: () => {
                            setLastSavedTime(new Date());
                            setHasChanges(false);
                        },
                    }
                );
            }, 500),
            [updateNotes]
        );

  /**
   * 处理内容变化
   * 自动触发防抖保存
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setEditContent(newContent);
      setHasChanges(newContent !== content);

      // 触发自动保存
      if (newContent !== content) {
          debouncedSave(reportId, newContent);
      }
  };

  /**
   * 手动保存按钮
   * 立即保存，不等待防抖
   */
  const handleManualSave = () => {
      // 取消防抖中的保存
      debouncedSave.cancel();

      // 立即保存
      updateNotes(
          {reportId, content: editContent},
          {
              onSuccess: () => {
                  setLastSavedTime(new Date());
                  setHasChanges(false);
              },
          }
      );
  };

  /**
   * 关闭前确认
   */
  const handleClose = () => {
      if (hasChanges && !isSaving) {
          const confirmed = window.confirm('有未保存的更改正在保存中，确定要关闭吗？');
      if (!confirmed) {
        return;
      }
    }
      // 取消防抖中的保存
      debouncedSave.cancel();
    onClose();
  };

    /**
     * 格式化最后保存时间
     */
    const formatLastSavedTime = () => {
        if (!lastSavedTime) return '';
        const now = new Date();
        const diff = Math.floor((now.getTime() - lastSavedTime.getTime()) / 1000);
        if (diff < 60) return '刚刚保存';
        if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前保存`;
        return lastSavedTime.toLocaleTimeString();
    };

  return (
    <Drawer
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            会议待办
          </Title>
            {isSaving && <Spin size="small"/>}
            {!isSaving && lastSavedTime && (
                <Space>
                    <CheckOutlined style={{color: '#52c41a'}}/>
                    <Text type="success" style={{fontSize: 12}}>
                        {formatLastSavedTime()}
                    </Text>
                </Space>
            )}
            {hasChanges && !isSaving && (
            <Text type="warning" style={{ fontSize: 12 }}>
                (有未保存的更改)
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
            onClick={handleManualSave}
            loading={isSaving}
            disabled={!hasChanges}
          >
              立即保存
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">
            记录本周会议讨论的待办事项，支持多行文本输入。编辑后会自动保存（500ms 防抖）。
        </Text>
      </div>
      <TextArea
        value={editContent}
        onChange={handleContentChange}
        placeholder="请输入会议待办事项，每行一条..."
        autoSize={{ minRows: 20, maxRows: 30 }}
        disabled={isSaving}
        style={{
          fontSize: 14,
          lineHeight: 1.8,
        }}
      />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
            💡 提示：编辑后会自动保存，也可点击"立即保存"按钮手动保存
        </Text>
      </div>
    </Drawer>
  );
};

export default MeetingSidebar;
