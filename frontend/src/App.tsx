import {Navigate, Route, Routes} from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ReportPage from './features/report/ReportPage';
import LatestReportResolver from './features/report/LatestReportResolver';

/**
 * 应用主组件
 * 路由配置
 */
function App() {
    return (
        <Routes>
            <Route path="/" element={<MainLayout/>}>
                {/* 根路径重定向到最新周报 */}
                <Route index element={<Navigate to="/latest" replace/>}/>

                {/* 周报详情页 */}
                <Route path="/reports/:reportId" element={<ReportPage/>}/>

                {/* 最新周报（自动解析） */}
                <Route path="/latest" element={<LatestReportResolver/>}/>

                {/* 404 */}
                <Route path="*" element={<div>404 Not Found</div>}/>
            </Route>
        </Routes>
    );
}

export default App;
