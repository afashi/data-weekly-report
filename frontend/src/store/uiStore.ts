import {create} from 'zustand';

/**
 * UI 状态管理 Store
 * 使用 Zustand 管理全局 UI 状态
 */
interface UIState {
    // 侧边栏状态
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;

    // 最近查看的周报 ID（用于默认值）
    lastViewedReportId: string | null;
    setLastViewedReportId: (id: string) => void;

    // 加载状态
    isGenerating: boolean;
    setIsGenerating: (value: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    // 侧边栏
    isSidebarOpen: false,
    toggleSidebar: () => set((state) => ({isSidebarOpen: !state.isSidebarOpen})),
    openSidebar: () => set({isSidebarOpen: true}),
    closeSidebar: () => set({isSidebarOpen: false}),

    // 最近查看的周报
    lastViewedReportId: null,
    setLastViewedReportId: (id) => {
        set({lastViewedReportId: id});
        // 持久化到 localStorage
        localStorage.setItem('lastViewedReportId', id);
    },

    // 生成状态
    isGenerating: false,
    setIsGenerating: (value) => set({isGenerating: value}),
}));

// 初始化：从 localStorage 读取
const storedReportId = localStorage.getItem('lastViewedReportId');
if (storedReportId) {
    useUIStore.setState({lastViewedReportId: storedReportId});
}
