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
    InputNumber,
    Select,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    ReloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { screenAPI, theaterAPI } from '../../apis';
import { hasFormChanged, formatDate } from '../../utils/';

const { Title, Text } = Typography;
const { Search } = Input;

const ScreenManagement = () => {
    const [screens, setScreens] = useState([]);
    const [theaters, setTheaters] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [editingScreen, setEditingScreen] = useState(null);
    const [viewingScreen, setViewingScreen] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [originalScreenData, setOriginalScreenData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const fetchScreens = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                ...(search ? { search } : {}),
            };
            const response = await screenAPI.getScreens(params);

            const data = response.data.data || [];
            const total = response.data.meta.totalResults;

            setScreens(data);
            setPagination({
                total,
                current: page,
                pageSize: limit,
            });
        } catch (error) {
            message.error('Không thể tải danh sách phòng chiếu!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTheaters = async () => {
        try {
            const response = await theaterAPI.getTheaters({ page: 1, limit: 100 });
            const data = response.data.data || [];
            setTheaters(data);
        } catch (error) {
            console.log(error.response?.data?.message);
        }
    };

    useEffect(() => {
        fetchScreens();
        fetchTheaters();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchScreens(1, pagination?.pageSize || 5, value);
    };

    const handleView = async (record) => {
        try {
            setLoading(true);
            const response = await screenAPI.getScreenById(record.id);
            const screen = response.data.data;
            setViewingScreen(screen);
            setIsViewModalOpen(true);
        } catch (error) {
            message.error('Không thể tải chi tiết phòng chiếu!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const normalizeScreenForForm = (screen) => ({
        ...screen,
        theater: screen.theater?._id || screen.theater?.id || screen.theater,
    });

    const handleEdit = (screen) => {
        const normalizedScreen = normalizeScreenForForm(screen);
        setEditingScreen(normalizedScreen);
        setOriginalScreenData(normalizedScreen);
        form.setFieldsValue(normalizedScreen);
        setIsModalVisible(true);
    };

    const handleDeleteScreen = async (id) => {
        try {
            setLoading(true);
            await screenAPI.deleteScreen(id);
            fetchScreens(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
            message.success('Xóa phòng chiếu thành công');
        } catch (error) {
            message.error('Lỗi không thể xóa phòng chiếu!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingScreen(null);
        setOriginalScreenData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleAddScreen = async (values) => {
        try {
            setLoading(true);
            await screenAPI.createScreen(values);
            message.success('Thêm phòng chiếu mới thành công');
        } catch (error) {
            message.error('Lỗi không thể thêm phòng chiếu mới!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScreen = async (values) => {
        try {
            setLoading(true);
            await screenAPI.updateScreen(editingScreen.id, values);
            message.success('Cập nhật phòng chiếu thành công');
        } catch (error) {
            message.error('Lỗi không thể cập nhật phòng chiếu!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            if (editingScreen && !hasFormChanged(originalScreenData, values)) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }

            if (editingScreen) {
                await handleUpdateScreen(values);
            } else {
                await handleAddScreen(values);
            }

            setIsModalVisible(false);
            form.resetFields();
            setOriginalScreenData(null);
            fetchScreens(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
        });
    };

    const columns = [
        {
            title: 'Tên phòng chiếu',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Sức chứa',
            dataIndex: 'seatCapacity',
            key: 'seatCapacity',
            width: 100,
            sorter: (a, b) => a.seatCapacity - b.seatCapacity,
        },
        {
            title: 'Rạp chiếu',
            dataIndex: 'theater',
            key: 'theater',
            width: 150,
            render: (theaterId) => {
                const theater = theaters.find(t => t.id === theaterId);
                return <Text>{theater?.name || '-'}</Text>;
            },
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
                        title="Bạn có chắc chắn muốn xóa phòng chiếu này?"
                        onConfirm={() => handleDeleteScreen(record.id)}
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
                    Quản lý phòng chiếu
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    className="bg-primary"
                >
                    Thêm phòng chiếu
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Search
                        placeholder="Tìm kiếm theo tên phòng chiếu"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={screens}
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
                        const nextPage = page.current;
                        const nextSize = page.pageSize;
                        if (nextPage !== pagination.current || nextSize !== pagination.pageSize)
                            fetchScreens(nextPage, nextSize, searchKeyword);
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingScreen ? 'Chỉnh sửa phòng chiếu' : 'Thêm phòng chiếu mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingScreen ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={600}
            >
                <Form form={form} layout="vertical" name="screenForm">
                    <Form.Item
                        name="name"
                        label="Tên phòng chiếu"
                        rules={[{ required: true, message: 'Vui lòng nhập tên phòng chiếu!' }]}
                    >
                        <Input placeholder="VD: Phòng A, Screen 1" />
                    </Form.Item>

                    <Form.Item
                        name="theater"
                        label="Rạp chiếu"
                        rules={[{ required: true, message: 'Vui lòng chọn rạp chiếu!' }]}
                    >
                        <Select placeholder="Chọn rạp chiếu">
                            {theaters.map((theater) => (
                                <Select.Option key={theater.id} value={theater.id}>
                                    {theater.name}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="seatCapacity"
                        label="Sức chứa (số ghế)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập sức chứa!' },
                            {
                                type: 'number',
                                min: 1,
                                message: 'Sức chứa phải lớn hơn 0!',
                            },
                        ]}
                    >
                        <InputNumber min={1} placeholder="VD: 100" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* View Screen Detail Modal */}
            <Modal
                title={<Title level={4}>Chi tiết phòng chiếu</Title>}
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
                {viewingScreen && (
                    <div className="space-y-4! max-h-125! overflow-y-auto! rounded-lg!">
                        <Descriptions bordered column={2}>
                            <Descriptions.Item label="Tên phòng chiếu" span={2}>
                                <Text strong>{viewingScreen.name}</Text>
                            </Descriptions.Item>

                            <Descriptions.Item label="Sức chứa">
                                {viewingScreen.seatCapacity}
                            </Descriptions.Item>

                                    <Descriptions.Item label="Rạp chiếu">
                                {theaters.find(t => t.id === (viewingScreen.theater?._id || viewingScreen.theater?.id || viewingScreen.theater))?.name || '-'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {viewingScreen.createdAt
                                    ? formatDate(viewingScreen.createdAt, 'HH:mm dd/MM/yyyy')
                                    : '-'}
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày cập nhật">
                                {viewingScreen.updatedAt
                                    ? formatDate(viewingScreen.updatedAt, 'HH:mm dd/MM/yyyy')
                                    : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ScreenManagement;
