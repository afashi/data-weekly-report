import {Outlet} from 'react-router-dom';
import {Layout} from 'antd';

const {Header, Content} = Layout;

/**
 * 主布局组件
 * 包含：Header（顶部导航）+ Content（内容区）+ Drawer（侧边栏）
 */
export default function MainLayout() {
    return (
        <Layout style={{minHeight: '100vh'}}>
            {/* 顶部导航栏 */}
            <Header
                style={{
                    background: '#fff',
                    padding: '0 24px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{fontSize: 18, fontWeight: 600, color: '#1677ff'}}>
                    📊 数据周报自动化系统
                </div>
            </Header>

            {/* 内容区 */}
            <Content style={{padding: '24px', background: '#f5f5f5'}}>
                <Outlet/>
            </Content>
        </Layout>
    );
}
