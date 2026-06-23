import { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Button, Typography, App } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    AppstoreOutlined,
    LogoutOutlined,
    CodeSandboxOutlined,
    ShopOutlined,
    VideoCameraOutlined,
    FieldTimeOutlined,
    GiftOutlined,
    ReconciliationOutlined,
    CoffeeOutlined,
    AccountBookOutlined,
    TrophyOutlined,
    ContainerOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LOGO_URL = 'https://res.cloudinary.com/dtnmtkqq4/image/upload/v1781900832/FG-logo_xzwezt.png';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const AdminLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { message } = App.useApp();

    const menuItems = [
        {
            key: '/admin',
            icon: <CodeSandboxOutlined />,
            label: 'Dashboard',
            onClick: () => navigate('/admin'),
        },
        {
            key: '/admin/genres',
            icon: <AppstoreOutlined />,
            label: 'Quản lý thể loại',
            onClick: () => navigate('/admin/genres'),
        },
        {
            key: '/admin/theaters',
            icon: <ShopOutlined />,
            label: 'Quản lý rạp',
            onClick: () => navigate('/admin/theaters'),
        },
        {
            key: '/admin/services',
            icon: <CoffeeOutlined />,
            label: 'Quản lý dịch vụ',
            onClick: () => navigate('/admin/services'),
        },
        {
            key: '/admin/movies',
            icon: <VideoCameraOutlined />,
            label: 'Quản lý phim',
            onClick: () => navigate('/admin/movies'),
        },
        {
            key: '/admin/showtimes',
            icon: <FieldTimeOutlined />,
            label: 'Quản lý suất chiếu',
            onClick: () => navigate('/admin/showtimes'),
        },
        {
            key: '/admin/bookings',
            icon: <ContainerOutlined />,
            label: 'Quản lý đặt vé',
            onClick: () => navigate('/admin/bookings'),
        },
        {
            key: '/admin/seats',
            icon: <AppstoreOutlined />,
            label: 'Quản lý ghế',
            onClick: () => navigate('/admin/seats'),
        },
        {
            key: '/admin/redeems',
            icon: <GiftOutlined />,
            label: 'Quản lý quà đổi điểm',
            onClick: () => navigate('/admin/redeems'),
        },
        {
            key: '/admin/redeem-gifts',
            icon: <ReconciliationOutlined />,
            label: 'Quản lý giao dịch đổi quà',
            onClick: () => navigate('/admin/redeem-gifts'),
        },
        {
            key: '/admin/ticket-prices',
            icon: <AccountBookOutlined />,
            label: 'Quản lý giá vé',
            onClick: () => navigate('/admin/ticket-prices'),
        },
        {
            key: '/admin/promotions',
            icon: <TrophyOutlined />,
            label: 'Quản lý khuyến mãi',
            onClick: () => navigate('/admin/promotions'),
        },
    ];

    const handleLogout = () => {
        logout();
        message.success('Đăng xuất thành công!');
    };

    const userMenuItems = [
        {
            key: 'logout',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            onClick: handleLogout,
        },
    ];

    const selectedKeys = [location.pathname];

    return (
        <Layout className="min-h-screen">
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                className="bg-white! border-gray-200! fixed! top-0! left-0! bottom-0! z-100! overflow-y-auto!"
                width={256}
            >
                <div className="flex items-center justify-center h-16 px-4 border-b border-r border-gray-200">
                    <img
                        src={LOGO_URL}
                        alt="MTBS"
                        className="system-logo"
                        style={{ width: collapsed ? 42 : 132, height: collapsed ? 42 : 48 }}
                    />
                </div>

                <Menu
                    mode="inline"
                    selectedKeys={selectedKeys}
                    items={menuItems}
                    className="border-none mt-4"
                />
            </Sider>

            <Layout
                style={{
                    marginLeft: collapsed ? '80px' : '256px',
                    transition: 'margin-left linear .2s',
                }}
            >
                <Header className="bg-white! border-b border-gray-200 px-4 flex items-center justify-between">
                    <div className="flex items-center">
                        <Button
                            type="text"
                            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={() => setCollapsed(!collapsed)}
                            className="text-lg"
                        />
                    </div>

                    <div className="flex items-center gap-5">
                        <Dropdown
                            menu={{ items: userMenuItems }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <div className="flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100">
                                <Avatar
                                    size="small"
                                    icon={<UserOutlined />}
                                    className="bg-blue-500"
                                />
                                <div className="hidden md:block">
                                    <Text className="block text-sm font-medium text-gray-700">
                                        {user?.fullName}
                                    </Text>
                                    <Text className="block text-xs text-gray-500">
                                        {user?.roles}
                                    </Text>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="admin-content-height p-6">
                    <div className="bg-white! rounded-lg shadow-sm border border-gray-200 p-6">
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;
