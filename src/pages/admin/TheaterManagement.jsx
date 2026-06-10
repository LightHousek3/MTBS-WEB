import { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Input,
    Modal,
    Form,
    Typography,
    Popconfirm,
    App,
    Descriptions,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    EnvironmentOutlined,
    ReloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { theaterAPI } from '../../apis';
import { hasFormChanged, formatDate } from '../../utils/';

const { Title, Text } = Typography;
const { Search } = Input;

const TheaterManagement = () => {
    const [theaters, setTheaters] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [editingTheater, setEditingTheater] = useState(null);
    const [viewingTheater, setViewingTheater] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [originalTheaterData, setOriginalTheaterData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const fetchTheaters = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = { page, limit, search };
            const response = await theaterAPI.getTheaters(params);

            const data = response.data.data || [];
            const total = response.data.meta.totalResults;

            setTheaters(data);
            setPagination({
                total,
                current: page,
                pageSize: limit,
            });
        } catch (error) {
            message.error('Không thể tải danh sách rạp!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTheaters();
    }, []);

    const handleSearch = (value) => {
        // store current keyword and fetch first page for the keyword
        setSearchKeyword(value);
        fetchTheaters(1, pagination?.pageSize || 5, value);
    };

    const handleView = (theater) => {
        setViewingTheater(theater);
        setIsViewModalOpen(true);
    };

    const handleEdit = (theater) => {
        const { coordinates, ...rest } = theater;
        const normalizedData = {
            ...rest,
            longitude: coordinates?.coordinates?.[0],
            latitude: coordinates?.coordinates?.[1],
        };
        setEditingTheater(normalizedData);
        setOriginalTheaterData(normalizedData);
        form.setFieldsValue(normalizedData);
        setIsModalVisible(true);
    };

    const handleDeleteTheater = async (id) => {
        try {
            setLoading(true);
            await theaterAPI.deleteTheater(id);
            fetchTheaters(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
            message.success('Xóa rạp thành công');
        } catch (error) {
            message.error('Lỗi không thể xóa rạp mới!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingTheater(null);
        setOriginalTheaterData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleAddTheater = async (values) => {
        try {
            setLoading(true);
            await theaterAPI.createTheater(values);
            message.success('Thêm rạp mới thành công');
        } catch (error) {
            message.error('Lỗi không thể thêm rạp mới!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTheater = async (values) => {
        try {
            setLoading(true);
            await theaterAPI.updateTheater(editingTheater.id, values);
            message.success('Cập nhật rạp thành công');
        } catch (error) {
            message.error('Lỗi không thể cập nhật rạp!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCoordinates = async (theater) => {
        try {
            setLoading(true);
            await theaterAPI.updateTheaterCoordinates(theater.id);
            fetchTheaters(pagination?.current || 1, pagination?.pageSize || 5);
            message.success(`Đã cập nhật tọa độ cho rạp "${theater.name}" từ địa chỉ`);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Không thể cập nhật tọa độ!';
            message.error(errorMsg);
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            if (editingTheater && !hasFormChanged(originalTheaterData, values)) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }

            const { latitude, longitude, ...rest } = values;
            // Normolize data before creating
            const payload = {
                ...rest,
                coordinates: {
                    type: 'Point',
                    coordinates: [
                        longitude ? Number(longitude) : 0,
                        latitude ? Number(latitude) : 0,
                    ],
                },
            };
            if (editingTheater) {
                // Update theater
                await handleUpdateTheater(payload);
            } else {
                // Add a new theater
                await handleAddTheater(payload);
            }
            setIsModalVisible(false);
            form.resetFields();
            setOriginalTheaterData(null);
            fetchTheaters(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
        });
    };

    const columns = [
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Vị trí',
            dataIndex: 'location',
            width: 150,
            key: 'location',
            sorter: (a, b) => a.location.localeCompare(b.location),
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
            sorter: (a, b) => a.address.localeCompare(b.address),
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
            width: 150,
            sorter: (a, b) => a.phone - b.phone,
        },
        {
            title: 'Tọa độ',
            key: 'coordinates',
            width: 150,
            render: (_, record) => (
                <Space direction="vertical" size="small">
                    {record.coordinates?.coordinates &&
                    Array.isArray(record.coordinates?.coordinates) &&
                    record.coordinates?.coordinates?.length === 2 ? (
                        <>
                            <span style={{ fontSize: 13 }}>
                                Lng: {record.coordinates?.coordinates[0].toFixed(4)}
                            </span>
                            <span style={{ fontSize: 13 }}>
                                Lat: {record.coordinates?.coordinates[1].toFixed(4)}
                            </span>
                        </>
                    ) : (
                        <span style={{ color: '#999', fontSize: 12 }}>Chưa có tọa độ</span>
                    )}
                </Space>
            ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record)}
                    />
                    <Button
                        type="primary"
                        className="bg-blue-500!"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title={
                            <div className="max-w-50!">
                                <p>Cập nhật tọa độ từ địa chỉ?</p>
                                <p style={{ fontSize: 12, color: '#999' }} className="line-clamp-1">
                                    Địa chỉ: {record.address}
                                </p>
                            </div>
                        }
                        onConfirm={() => handleUpdateCoordinates(record)}
                        okText="Cập nhật"
                        cancelText="Hủy"
                    >
                        <Button
                            type="default"
                            className="bg-green-500! text-white!"
                            size="small"
                            icon={<EnvironmentOutlined />}
                            title="Cập nhật tọa độ từ địa chỉ"
                        />
                    </Popconfirm>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa rạp này?"
                        onConfirm={() => handleDeleteTheater(record.id)}
                        okText="Có"
                        cancelText="Không"
                    >
                        <Button type="primary" danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý rạp
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    className="bg-primary"
                >
                    Thêm rạp
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Search
                        placeholder="Tìm kiếm theo tên, vị trí"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={theaters}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
                    }}
                    onChange={(page) => {
                        // Always fetch using the current search keyword so paging + search stay in sync
                        const nextPage = page.current;
                        const nextSize = page.pageSize;
                        if (nextPage !== pagination.current || nextSize !== pagination.pageSize)
                            fetchTheaters(nextPage, nextSize, searchKeyword);
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingTheater ? 'Chỉnh sửa rạp' : 'Thêm rạp mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingTheater ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={600}
            >
                <Form form={form} layout="vertical" name="theaterForm">
                    <Form.Item
                        name="name"
                        label="Tên rạp"
                        rules={[{ required: true, message: 'Vui lòng nhập tên rạp!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="location"
                        label="Vị trí"
                        rules={[{ required: true, message: 'Vui lòng chọn vị trí!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="address"
                        label="Địa chỉ"
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Số điện thoại"
                        normalize={(value) => value.replace(/^\+84/, '0')}
                        rules={[
                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                            {
                                pattern: /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/,
                                message: 'Số điện thoại không đúng định dạng Việt Nam!',
                            },
                        ]}
                    >
                        <Input placeholder="VD: Bắt đầu bằng 0 hoặc +84" />
                    </Form.Item>

                    <Form.Item label="Tọa độ (Tùy chọn)" style={{ marginBottom: 0 }}>
                        <Space.Compact style={{ width: '100%' }}>
                            <Form.Item
                                name="latitude"
                                style={{ marginBottom: 0, width: '50%' }}
                                rules={[
                                    {
                                        pattern: /^-?([1-8]?[0-9]\.{1}\d+|90\.{1}0+)$/,
                                        message: 'Vĩ độ không hợp lệ (-90 đến 90)!',
                                    },
                                ]}
                            >
                                <Input placeholder="Vĩ độ (Latitude)" type="number" step="any" />
                            </Form.Item>
                            <Form.Item
                                name="longitude"
                                style={{ marginBottom: 0, width: '50%' }}
                                rules={[
                                    {
                                        pattern: /^-?((1[0-7]|[1-9])?[0-9]\.{1}\d+|180\.{1}0+)$/,
                                        message: 'Kinh độ không hợp lệ (-180 đến 180)!',
                                    },
                                ]}
                            >
                                <Input placeholder="Kinh độ (Longitude)" type="number" step="any" />
                            </Form.Item>
                        </Space.Compact>
                    </Form.Item>
                </Form>
            </Modal>
            {/* View Theater Detail Modal */}
            <Modal
                title={<Title level={4}>Chi tiết rạp</Title>}
                open={isViewModalOpen}
                onCancel={() => setIsViewModalOpen(false)}
                width={800}
                centered
                footer={[
                    <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                        Đóng
                    </Button>,
                ]}
            >
                {viewingTheater && (
                    <div className="space-y-4! max-h-125! overflow-y-auto! rounded-lg!">
                        <Descriptions bordered column={2}>
                            <Descriptions.Item label="Tên rạp" span={2}>
                                <Text strong>{viewingTheater.name}</Text>
                            </Descriptions.Item>

                            <Descriptions.Item label="Vị trí">
                                {viewingTheater.location}
                            </Descriptions.Item>

                            <Descriptions.Item label="Số điện thoại">
                                {viewingTheater.phone}
                            </Descriptions.Item>

                            <Descriptions.Item label="Địa chỉ" span={2}>
                                {viewingTheater.address}
                            </Descriptions.Item>

                            <Descriptions.Item label="Kinh độ">
                                {viewingTheater.coordinates?.coordinates?.[0] ?? 'Chưa có'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Vĩ độ">
                                {viewingTheater.coordinates?.coordinates?.[1] ?? 'Chưa có'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Google Maps" span={2}>
                                {viewingTheater.coordinates?.coordinates?.length === 2 ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${viewingTheater.coordinates.coordinates[1]},${viewingTheater.coordinates.coordinates[0]}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Xem trên Google Maps
                                    </a>
                                ) : (
                                    '-'
                                )}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {viewingTheater.createdAt
                                    ? formatDate(viewingTheater.createdAt, 'HH:mm dd/MM/yyyy')
                                    : '-'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày cập nhật">
                                {viewingTheater.updatedAt
                                    ? formatDate(viewingTheater.updatedAt, 'HH:mm dd/MM/yyyy')
                                    : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default TheaterManagement;
