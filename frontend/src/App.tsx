import {Navigate, Route, Routes} from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';

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
                <Route path="/reports/:reportId" element={<div>Report Page (TODO)</div>}/>

                {/* 最新周报（自动解析） */}
                <Route path="/latest" element={<div>Latest Report Resolver (TODO)</div>}/>

                {/* 404 */}
                <Route path="*" element={<div>404 Not Found</div>}/>
            </Route>
        </Routes>
    );
}

export default App;
