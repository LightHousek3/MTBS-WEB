import { useEffect, useMemo, useState } from 'react';
import { App, Avatar, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { EditOutlined, LockOutlined, ReloadOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { apiClient } from '../../config';

const { Title, Text } = Typography;
const { Search } = Input;

const USER_STATUS_OPTIONS = [
    { label: 'Đang hoạt động', value: 'ACTIVE', color: 'green' },
    { label: 'Chưa kích hoạt', value: 'INACTIVE', color: 'orange' },
    { label: 'Bị khóa', value: 'BLOCKED', color: 'red' },
];

const getStatusConfig = (status) => USER_STATUS_OPTIONS.find((item) => item.value === status) || { label: status || '-', color: 'default' };

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
    const [selectedUser, setSelectedUser] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusForm] = Form.useForm();
    const { message } = App.useApp();

    const fetchUsers = async (page = 1, limit = 10, search = '') => {
        try {
            setLoading(true);
            const response = await apiClient.get('/users', {
                params: {
                    page,
                    limit,
                    ...(search ? { search } : {}),
                },
            });
            const data = response.data.data || [];
            const meta = response.data.meta || {};
            setUsers(data);
            setPagination({
                current: meta.page || page,
                pageSize: meta.limit || limit,
                total: meta.totalResults || 0,
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchUsers(1, pagination.pageSize, value);
    };

    const openDetail = (user) => {
        setSelectedUser(user);
        setIsDetailModalOpen(true);
    };

    const openStatusModal = (user) => {
        if (user.role === 'ADMIN') {
            message.warning('Không thể đổi trạng thái cho tài khoản admin');
            return;
        }
        setSelectedUser(user);
        statusForm.setFieldsValue({ status: user.status });
        setIsStatusModalOpen(true);
    };

    const handleStatusUpdate = async () => {
        try {
            if (selectedUser?.role === 'ADMIN') {
                message.warning('Không thể đổi trạng thái cho tài khoản admin');
                return;
            }
            const values = await statusForm.validateFields();
            await apiClient.patch(`/users/${selectedUser.id || selectedUser._id}/status`, { status: values.status });
            message.success('Cập nhật trạng thái người dùng thành công');
            setIsStatusModalOpen(false);
            fetchUsers(pagination.current, pagination.pageSize, searchKeyword);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái');
        }
    };

    const columns = useMemo(
        () => [
            {
                title: 'Avatar',
                dataIndex: 'avatar',
                key: 'avatar',
                width: 80,
                render: (avatar) => (
                    <Avatar
                        size="small"
                        src={avatar || undefined}
                        icon={!avatar && <UserOutlined />}
                    />
                ),
            },
            {
                title: 'Họ tên',
                dataIndex: 'fullName',
                key: 'fullName',
                render: (_, record) => `${record.firstName || ''} ${record.lastName || ''}`.trim(),
            },
            {
                title: 'Email',
                dataIndex: 'email',
                key: 'email',
            },
            {
                title: 'Vai trò',
                dataIndex: 'role',
                key: 'role',
                render: (role) => <Tag color={role === 'ADMIN' ? 'blue' : 'default'}>{role}</Tag>,
            },
            {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (status) => {
                    const config = getStatusConfig(status);
                    return <Tag color={config.color}>{config.label}</Tag>;
                },
            },
            {
                title: 'Thao tác',
                key: 'action',
                render: (_, record) => (
                    <Space size="small">
                        <Button size="small" icon={<UserOutlined />} onClick={() => openDetail(record)}>
                            Xem
                        </Button>
                        <Button
                        type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openStatusModal(record)}
                            disabled={record.role === 'ADMIN'}
                        >
                            Đổi trạng thái
                        </Button>
                    </Space>
                ),
            },
        ],
        [message],
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý người dùng
                </Title>
                <Button icon={<ReloadOutlined />} onClick={() => fetchUsers(pagination.current, pagination.pageSize, searchKeyword)}>
                    Tải lại
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Search
                        placeholder="Tìm theo tên hoặc email"
                        allowClear
                        enterButton={<SearchOutlined />}
                        onSearch={handleSearch}
                        style={{ width: 320 }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey={(record) => record.id || record._id}
                    loading={loading}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                    }}
                    onChange={(page) => fetchUsers(page.current, page.pageSize, searchKeyword)}
                />
            </Card>

            <Modal
                title="Chi tiết người dùng"
                open={isDetailModalOpen}
                onCancel={() => setIsDetailModalOpen(false)}
                footer={null}
                centered
                width={720}
            >
                {selectedUser && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Avatar" span={2}>
                            <Avatar
                                size={72}
                                src={selectedUser.avatar || undefined}
                                icon={!selectedUser.avatar && <UserOutlined />}
                            />
                        </Descriptions.Item>
                        <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                        <Descriptions.Item label="Số điện thoại">{selectedUser.phone || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ">{selectedUser.address || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Tuổi">{selectedUser.age || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Giới tính">{selectedUser.gender || '-'}</Descriptions.Item>
                        <Descriptions.Item label="Vai trò">{selectedUser.role}</Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getStatusConfig(selectedUser.status).color}>{getStatusConfig(selectedUser.status).label}</Tag>
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>

            <Modal
                title="Đổi trạng thái người dùng"
                open={isStatusModalOpen}
                onCancel={() => setIsStatusModalOpen(false)}
                onOk={handleStatusUpdate}
                okText="Cập nhật"
                cancelText="Hủy"
                centered
            >
                <Form form={statusForm} layout="vertical">
                    <Form.Item name="status" label="Trạng thái" rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}> 
                        <Select options={USER_STATUS_OPTIONS.map(({ label, value }) => ({ label, value }))} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;
