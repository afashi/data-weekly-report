import {create} from 'zustand';

/**
 * UI 状态管理 Store
 * 使用 Zustand 管理全局 UI 状态
 *
 * ✅ 性能优化：
 * - client-localstorage-schema: 版本化 localStorage 数据
 * - js-cache-storage: 缓存 localStorage 读取结果
 */

// ✅ client-localstorage-schema: localStorage 数据版本化
const STORAGE_VERSION = 1;
const STORAGE_KEY = `ui-store-v${STORAGE_VERSION}`;

// ✅ js-cache-storage: 缓存 localStorage 读取
let cachedReportId: string | null = null;
let hasReadFromStorage = false;

const getStoredReportId = (): string | null => {
    if (hasReadFromStorage) {
        return cachedReportId;
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cachedReportId = data.lastViewedReportId || null;
        }
    } catch (error) {
        console.warn('[UIStore] Failed to read from localStorage:', error);
        cachedReportId = null;
    }

    hasReadFromStorage = true;
    return cachedReportId;
};

const setStoredReportId = (id: string): void => {
    cachedReportId = id;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            lastViewedReportId: id,
            version: STORAGE_VERSION,
        }));
    } catch (error) {
        console.warn('[UIStore] Failed to write to localStorage:', error);
    }
};

interface UIState {
    // 侧边栏状态
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;

    // 最近查看的周报 ID（用于默认值）
    lastViewedReportId: string | null;
    setLastViewedReportId: (id: string) => void;

    // 当前选中的周报 ID (用于版本选择器)
    currentReportId: string | null;
    setCurrentReportId: (id: string | null) => void;

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
    lastViewedReportId: getStoredReportId(),
    setLastViewedReportId: (id) => {
        set({lastViewedReportId: id});
        // ✅ client-localstorage-schema: 持久化到 localStorage（版本化）
        setStoredReportId(id);
    },

    // 当前周报 ID
    currentReportId: null,
    setCurrentReportId: (id) => set({currentReportId: id}),

    // 生成状态
    isGenerating: false,
    setIsGenerating: (value) => set({isGenerating: value}),
}));
