import { useMemo, useState } from 'react';
import { Card, Input, Select, Table, Typography } from 'antd';

const { Search } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const applicationMessages = [
    { key: 'FESTIVAL.CREATE_SUCCESS', module: 'Festival', functionName: 'Create Festival', message: 'Tạo festival thành công.' },
    { key: 'FESTIVAL.LIST_SUCCESS', module: 'Festival', functionName: 'View Festival List', message: 'Lấy danh sách festival thành công.' },
    { key: 'FESTIVAL.DETAIL_SUCCESS', module: 'Festival', functionName: 'View Festival Details', message: 'Lấy thông tin festival thành công.' },
    { key: 'FESTIVAL.UPDATE_SUCCESS', module: 'Festival', functionName: 'Update Festival', message: 'Cập nhật festival thành công.' },
    { key: 'FESTIVAL.DELETE_SUCCESS', module: 'Festival', functionName: 'Delete Festival', message: 'Xóa festival thành công.' },

    { key: 'BANNER.CREATE_SUCCESS', module: 'Banner', functionName: 'Create Banner', message: 'Tạo banner thành công.' },
    { key: 'BANNER.LIST_SUCCESS', module: 'Banner', functionName: 'View Banner List', message: 'Lấy danh sách banner thành công.' },
    { key: 'BANNER.UPDATE_SUCCESS', module: 'Banner', functionName: 'Update Banner', message: 'Cập nhật banner thành công.' },
    { key: 'BANNER.DELETE_SUCCESS', module: 'Banner', functionName: 'Delete Banner', message: 'Xóa banner thành công.' },

    { key: 'NEWS.CREATE_SUCCESS', module: 'News', functionName: 'Create News', message: 'Tạo tin tức thành công.' },
    { key: 'NEWS.LIST_SUCCESS', module: 'News', functionName: 'View News List', message: 'Lấy danh sách tin tức thành công.' },
    { key: 'NEWS.DETAIL_SUCCESS', module: 'News', functionName: 'View News Details', message: 'Lấy thông tin tin tức thành công.' },
    { key: 'NEWS.UPDATE_SUCCESS', module: 'News', functionName: 'Update News', message: 'Cập nhật tin tức thành công.' },
    { key: 'NEWS.DELETE_SUCCESS', module: 'News', functionName: 'Delete News', message: 'Xóa tin tức thành công.' },

    { key: 'SCREEN.CREATE_SUCCESS', module: 'Screen', functionName: 'Create Screen', message: 'Tạo phòng chiếu thành công.' },
    { key: 'SCREEN.LIST_SUCCESS', module: 'Screen', functionName: 'View Screen List', message: 'Lấy danh sách phòng chiếu thành công.' },
    { key: 'SCREEN.DETAIL_SUCCESS', module: 'Screen', functionName: 'View Screen Details', message: 'Lấy thông tin phòng chiếu thành công.' },
    { key: 'SCREEN.UPDATE_SUCCESS', module: 'Screen', functionName: 'Update Screen', message: 'Cập nhật phòng chiếu thành công.' },
    { key: 'SCREEN.DELETE_SUCCESS', module: 'Screen', functionName: 'Delete Screen', message: 'Xóa phòng chiếu thành công.' },

    { key: 'CUSTOMER.CHANGE_PASSWORD_SUCCESS', module: 'Customer', functionName: 'Change Password For Customer', message: 'Đổi mật khẩu thành công.' },
    { key: 'CUSTOMER.UPDATE_PROFILE_SUCCESS', module: 'Customer', functionName: 'Update Profile For Customer', message: 'Cập nhật hồ sơ thành công.' },
    { key: 'CUSTOMER.VIEW_PROFILE_SUCCESS', module: 'Customer', functionName: 'View Profile For Customer', message: 'Lấy thông tin hồ sơ thành công.' },
    { key: 'ADMIN.USER_LIST_SUCCESS', module: 'Admin', functionName: 'View User List For Admin', message: 'Lấy danh sách người dùng thành công.' },
    { key: 'ADMIN.USER_STATUS_SUCCESS', module: 'Admin', functionName: 'Change User Status', message: 'Cập nhật trạng thái người dùng thành công.' },
];

const ApplicationMessagesList = () => {
    const [searchText, setSearchText] = useState('');
    const [moduleFilter, setModuleFilter] = useState('all');

    const filteredMessages = useMemo(() => {
        return applicationMessages.filter((item) => {
            const matchesSearch =
                item.key.toLowerCase().includes(searchText.toLowerCase()) ||
                item.functionName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.message.toLowerCase().includes(searchText.toLowerCase());
            const matchesModule = moduleFilter === 'all' || item.module === moduleFilter;
            return matchesSearch && matchesModule;
        });
    }, [moduleFilter, searchText]);

    const columns = [
        { title: 'Function', dataIndex: 'functionName', key: 'functionName', width: 260 },
        { title: 'Module', dataIndex: 'module', key: 'module', width: 120 },
        { title: 'Key', dataIndex: 'key', key: 'key', width: 240 },
        { title: 'Message', dataIndex: 'message', key: 'message' },
    ];

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <Title level={3} className="!mb-1">Application Messages List</Title>
                    <Text type="secondary">Tổng hợp các message cho các function chính trong hệ thống.</Text>
                </div>
            </div>

            <Card className="shadow-sm">
                <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
                    <Search
                        placeholder="Tìm kiếm theo function, key hoặc message"
                        allowClear
                        className="max-w-md"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                    <Select value={moduleFilter} onChange={setModuleFilter} style={{ minWidth: 180 }}>
                        <Option value="all">Tất cả module</Option>
                        <Option value="Festival">Festival</Option>
                        <Option value="Banner">Banner</Option>
                        <Option value="News">News</Option>
                        <Option value="Screen">Screen</Option>
                        <Option value="Customer">Customer</Option>
                        <Option value="Admin">Admin</Option>
                    </Select>
                </div>

                <Table rowKey="key" dataSource={filteredMessages} columns={columns} pagination={{ pageSize: 8, showSizeChanger: false }} bordered />
            </Card>
        </div>
    );
};

export default ApplicationMessagesList;
