import { useEffect, useState } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Form,
    Image,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { bannerAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const bannerTypes = [
    { value: 'IMAGE', label: 'Ảnh', color: 'blue' },
    { value: 'VIDEO', label: 'Video', color: 'green' },
];

const BannerManagement = () => {
    const [banners, setBanners] = useState([]);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
    const [searchKeyword, setSearchKeyword] = useState('');
    const [editingBanner, setEditingBanner] = useState(null);
    const [viewingBanner, setViewingBanner] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [originalBannerData, setOriginalBannerData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const getBannerTypeLabel = (type) => bannerTypes.find((item) => item.value === type)?.label || type;
    const getBannerTypeColor = (type) => bannerTypes.find((item) => item.value === type)?.color || 'default';

    const normalizeBannerData = (banner) => ({
        type: banner.type || '',
        url: banner.url || '',
    });

    const buildPayload = (values) => ({
        type: values.type,
        url: values.url?.trim(),
    });

    const fetchBanners = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                ...(search ? { search } : {}),
            };
            const response = await bannerAPI.getBanners(params);
            const data = response.data.data || [];
            const meta = response.data.meta || {};
            setBanners(data);
            setPagination({
                current: meta.page || page,
                pageSize: meta.limit || limit,
                total: meta.totalResults || 0,
            });
        } catch (error) {
            message.error('Không thể tải danh sách banner!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchBanners(1, pagination.pageSize || 5, value);
    };

    const handleView = async (record) => {
        try {
            setLoading(true);
            const response = await bannerAPI.getBannerById(record.id);
            setViewingBanner(response.data.data);
            setIsViewModalOpen(true);
        } catch (error) {
            message.error('Không thể tải chi tiết banner!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (banner) => {
        setEditingBanner(banner);
        setOriginalBannerData(normalizeBannerData(banner));
        form.setFieldsValue({
            type: banner.type,
            url: banner.url,
        });
        setIsModalVisible(true);
    };

    const handleDeleteBanner = async (id) => {
        try {
            setLoading(true);
            await bannerAPI.deleteBanner(id);
            message.success('Xóa banner thành công');
            fetchBanners(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
        } catch (error) {
            message.error('Lỗi không thể xóa banner!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingBanner(null);
        setOriginalBannerData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleAddBanner = async (values) => {
        try {
            setLoading(true);
            const payload = buildPayload(values);
            await bannerAPI.createBanner(payload);
            message.success('Thêm banner thành công');
        } catch (error) {
            message.error('Lỗi không thể thêm banner!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBanner = async (values) => {
        try {
            setLoading(true);
            const payload = buildPayload(values);
            await bannerAPI.updateBanner(editingBanner.id, payload);
            message.success('Cập nhật banner thành công');
        } catch (error) {
            message.error('Lỗi không thể cập nhật banner!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            const payload = normalizeBannerData(values);
            if (editingBanner && !hasFormChanged(originalBannerData, payload)) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }
            if (editingBanner) {
                await handleUpdateBanner(values);
            } else {
                await handleAddBanner(values);
            }
            setIsModalVisible(false);
            form.resetFields();
            setOriginalBannerData(null);
            fetchBanners(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
        });
    };

    const columns = [
        {
            title: 'Loại banner',
            dataIndex: 'type',
            key: 'type',
            render: (type) => (
                <Tag color={getBannerTypeColor(type)}>{getBannerTypeLabel(type)}</Tag>
            ),
            width: 140,
        },
        {
            title: 'Preview',
            dataIndex: 'url',
            key: 'preview',
            render: (url, record) =>
                record.type === 'IMAGE' ? (
                    <Image src={url} width={80} height={60} preview={false} />
                ) : (
                    <a href={url} target="_blank" rel="noreferrer">
                        Mở video
                    </a>
                ),
            width: 140,
        },
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            ellipsis: true,
            render: (text) => <Text copyable>{text}</Text>,
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (value) => (value ? formatDate(value, 'HH:mm DD/MM/YYYY') : '-'),
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
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
                        title="Bạn có chắc chắn muốn xóa banner này?"
                        onConfirm={() => handleDeleteBanner(record.id)}
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
                    Quản lý banner
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-primary">
                    Thêm banner
                </Button>
            </div>

            <Card>
                <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
                    <Search
                        placeholder="Tìm kiếm theo URL"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        onSearch={handleSearch}
                        style={{ width: 320 }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={banners}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
                    }}
                    onChange={(page) => {
                        const nextPage = page.current;
                        const nextSize = page.pageSize;
                        if (nextPage !== pagination.current || nextSize !== pagination.pageSize) {
                            fetchBanners(nextPage, nextSize, searchKeyword);
                        }
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingBanner ? 'Chỉnh sửa banner' : 'Thêm banner mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingBanner ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={600}
            >
                <Form form={form} layout="vertical" name="bannerForm">
                    <Form.Item
                        name="type"
                        label="Loại banner"
                        rules={[{ required: true, message: 'Vui lòng chọn loại banner!' }]}
                    >
                        <Select placeholder="Chọn loại banner">
                            {bannerTypes.map((item) => (
                                <Option key={item.value} value={item.value}>
                                    {item.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="url"
                        label="URL"
                        rules={[
                            { required: true, message: 'Vui lòng nhập URL!' },
                            { type: 'url', message: 'URL không hợp lệ!' },
                        ]}
                    >
                        <Input placeholder="Nhập URL banner" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<Title level={4}>Chi tiết banner</Title>}
                open={isViewModalOpen}
                onCancel={() => setIsViewModalOpen(false)}
                width={760}
                centered
                footer={[
                    <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                        Đóng
                    </Button>,
                ]}
            >
                {viewingBanner && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Loại banner" span={2}>
                            <Tag color={getBannerTypeColor(viewingBanner.type)}>
                                {getBannerTypeLabel(viewingBanner.type)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="URL" span={2}>
                            <Text copyable>{viewingBanner.url}</Text>
                        </Descriptions.Item>
                        {viewingBanner.type === 'IMAGE' && (
                            <Descriptions.Item label="Xem trước" span={2}>
                                <Image
                                    src={viewingBanner.url}
                                    alt="banner"
                                    width={160}
                                    height={120}
                                    style={{ objectFit: 'cover', borderRadius: 12 }}
                                    preview={false}
                                />
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Ngày tạo">
                            {viewingBanner.createdAt ? formatDate(viewingBanner.createdAt, 'HH:mm DD/MM/YYYY') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày cập nhật">
                            {viewingBanner.updatedAt ? formatDate(viewingBanner.updatedAt, 'HH:mm DD/MM/YYYY') : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default BannerManagement;
