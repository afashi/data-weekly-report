import React, {useEffect, useState} from 'react';
import {Modal, Progress, Space, Typography} from 'antd';
import {CheckCircleOutlined, LoadingOutlined, SyncOutlined} from '@ant-design/icons';

const {Text} = Typography;

/**
 * 生成阶段定义
 */
interface GenerateStage {
    key: string;
    label: string;
    duration: number; // 预计耗时（毫秒）
}

/**
 * 周报生成进度条组件
 *
 * 功能：
 * 1. 显示周报生成的各个阶段
 * 2. 模拟进度条动画（因为后端是单次 API 调用）
 * 3. 提供友好的用户反馈
 *
 * @example
 * ```tsx
 * <GenerateProgress
 *   visible={isGenerating}
 *   onComplete={() => console.log('生成完成')}
 * />
 * ```
 */
interface GenerateProgressProps {
    /** 是否显示进度条 */
    visible: boolean;
    /** 生成完成回调 */
    onComplete?: () => void;
}

/**
 * 生成阶段配置
 * 模拟后端生成的各个步骤
 */
const GENERATE_STAGES: GenerateStage[] = [
    {key: 'init', label: '初始化周报生成任务', duration: 500},
    {key: 'jira', label: '正在从 Jira 获取任务数据', duration: 2000},
    {key: 'database', label: '正在从数据库获取指标数据', duration: 1500},
    {key: 'process', label: '正在处理和转换数据', duration: 1000},
    {key: 'save', label: '正在保存周报数据', duration: 800},
    {key: 'complete', label: '周报生成完成！', duration: 200},
];

export const GenerateProgress: React.FC<GenerateProgressProps> = ({
                                                                      visible,
                                                                      onComplete,
                                                                  }) => {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [progress, setProgress] = useState(0);

    // 计算总耗时
    const totalDuration = GENERATE_STAGES.reduce((sum, stage) => sum + stage.duration, 0);

    // 重置状态
    useEffect(() => {
        if (visible) {
            setCurrentStageIndex(0);
            setProgress(0);
        }
    }, [visible]);

    // 模拟进度推进
    useEffect(() => {
        if (!visible) return;

        const currentStage = GENERATE_STAGES[currentStageIndex];
        if (!currentStage) return;

        // 计算当前阶段的进度增量
        const stageProgress = (currentStage.duration / totalDuration) * 100;
        const startProgress = GENERATE_STAGES.slice(0, currentStageIndex).reduce(
            (sum, stage) => sum + (stage.duration / totalDuration) * 100,
            0
        );

        // 平滑进度条动画
        const steps = 20; // 动画步数
        const stepDuration = currentStage.duration / steps;
        const progressIncrement = stageProgress / steps;

        let currentStep = 0;
        const timer = setInterval(() => {
            currentStep++;
            const newProgress = startProgress + progressIncrement * currentStep;
            setProgress(Math.min(newProgress, 100));

            if (currentStep >= steps) {
                clearInterval(timer);
                // 进入下一阶段
                if (currentStageIndex < GENERATE_STAGES.length - 1) {
                    setCurrentStageIndex(currentStageIndex + 1);
                } else {
                    // 所有阶段完成
                    setTimeout(() => {
                        onComplete?.();
                    }, 500);
                }
            }
        }, stepDuration);

        return () => clearInterval(timer);
    }, [visible, currentStageIndex, totalDuration, onComplete]);

    const currentStage = GENERATE_STAGES[currentStageIndex];
    const isComplete = currentStageIndex === GENERATE_STAGES.length - 1 && progress >= 99;

    return (
        <Modal
            open={visible}
            title="正在生成周报"
            footer={null}
            closable={false}
            maskClosable={false}
            width={500}
            centered
        >
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                {/* 进度条 */}
                <Progress
                    percent={Math.round(progress)}
                    status={isComplete ? 'success' : 'active'}
                    strokeColor={{
                        '0%': '#108ee9',
                        '100%': '#87d068',
                    }}
                />

                {/* 当前阶段提示 */}
                <Space>
                    {isComplete ? (
                        <CheckCircleOutlined style={{color: '#52c41a', fontSize: 18}}/>
                    ) : (
                        <SyncOutlined spin style={{color: '#1890ff', fontSize: 18}}/>
                    )}
                    <Text strong style={{fontSize: 16}}>
                        {currentStage?.label}
                    </Text>
                </Space>

                {/* 阶段列表 */}
                <Space direction="vertical" size="small" style={{width: '100%', paddingLeft: 8}}>
                    {GENERATE_STAGES.map((stage, index) => {
                        const isCurrentStage = index === currentStageIndex;
                        const isPastStage = index < currentStageIndex;
                        const isFutureStage = index > currentStageIndex;

                        return (
                            <Space key={stage.key} size="small">
                                {isPastStage && (
                                    <CheckCircleOutlined style={{color: '#52c41a'}}/>
                                )}
                                {isCurrentStage && (
                                    <LoadingOutlined style={{color: '#1890ff'}}/>
                                )}
                                {isFutureStage && (
                                    <div
                                        style={{
                                            width: 14,
                                            height: 14,
                                            borderRadius: '50%',
                                            border: '2px solid #d9d9d9',
                                        }}
                                    />
                                )}
                                <Text
                                    type={isFutureStage ? 'secondary' : undefined}
                                    style={{
                                        fontWeight: isCurrentStage ? 'bold' : 'normal',
                                    }}
                                >
                                    {stage.label}
                                </Text>
                            </Space>
                        );
                    })}
                </Space>
            </Space>
        </Modal>
    );
};

export default GenerateProgress;
