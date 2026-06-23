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
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { newsAPI } from '../../apis';
import { hasFormChanged, formatDate } from '../../utils/';

const { Title, Text } = Typography;
const { Search, TextArea } = Input;

const NewsManagement = () => {
    const [newsItems, setNewsItems] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [editingNews, setEditingNews] = useState(null);
    const [viewingNews, setViewingNews] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [originalNewsData, setOriginalNewsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const fetchNews = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                ...(search ? { search } : {}),
            };
            const response = await newsAPI.getNewsList(params);
            const data = response.data.data || [];
            const total = response.data.meta?.totalResults || 0;
            setNewsItems(data);
            setPagination({
                total,
                current: page,
                pageSize: limit,
            });
        } catch (error) {
            message.error('Không thể tải danh sách tin tức!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchNews(1, pagination?.pageSize || 5, value);
    };

    const handleView = async (record) => {
        try {
            setLoading(true);
            const response = await newsAPI.getNewsById(record.id);
            setViewingNews(response.data.data);
            setIsViewModalOpen(true);
        } catch (error) {
            message.error('Không thể tải chi tiết tin tức!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (news) => {
        setEditingNews(news);
        setOriginalNewsData(news);
        form.setFieldsValue(news);
        setIsModalVisible(true);
    };

    const handleDeleteNews = async (id) => {
        try {
            setLoading(true);
            await newsAPI.deleteNews(id);
            message.success('Xóa tin tức thành công');
            fetchNews(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
        } catch (error) {
            message.error('Lỗi không thể xóa tin tức!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingNews(null);
        setOriginalNewsData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleAddNews = async (values) => {
        try {
            setLoading(true);
            await newsAPI.createNews(values);
            message.success('Thêm tin tức thành công');
        } catch (error) {
            message.error('Lỗi không thể thêm tin tức!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNews = async (values) => {
        try {
            setLoading(true);
            await newsAPI.updateNews(editingNews.id, values);
            message.success('Cập nhật tin tức thành công');
        } catch (error) {
            message.error('Lỗi không thể cập nhật tin tức!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            if (editingNews && !hasFormChanged(originalNewsData, values)) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }

            if (editingNews) {
                await handleUpdateNews(values);
            } else {
                await handleAddNews(values);
            }

            setIsModalVisible(false);
            form.resetFields();
            setOriginalNewsData(null);
            fetchNews(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
        });
    };

    const columns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            sorter: (a, b) => a.title.localeCompare(b.title),
        },
        {
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (img) => <img src={img} alt="news" style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }} />,
            width: 120,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => handleView(record)} />
                    <Button
                        type="primary"
                        className="bg-blue-500!"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa tin tức này?"
                        onConfirm={() => handleDeleteNews(record.id)}
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
                    Quản lý tin tức
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-primary">
                    Thêm tin tức
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Search
                        placeholder="Tìm kiếm theo tiêu đề"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        onSearch={handleSearch}
                        style={{ width: 320 }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={newsItems}
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
                            fetchNews(nextPage, nextSize, searchKeyword);
                        }
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingNews ? 'Chỉnh sửa tin tức' : 'Thêm tin tức mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingNews ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={600}
            >
                <Form form={form} layout="vertical" name="newsForm">
                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
                    >
                        <Input placeholder="Nhập tiêu đề tin tức" />
                    </Form.Item>
                    <Form.Item
                        name="image"
                        label="URL ảnh"
                        rules={[
                            { required: true, message: 'Vui lòng nhập URL ảnh!' },
                            { type: 'url', message: 'URL ảnh không hợp lệ!' },
                        ]}
                    >
                        <Input placeholder="Nhập URL ảnh tin tức" />
                    </Form.Item>
                    <Form.Item
                        name="content"
                        label="Nội dung"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                    >
                        <TextArea rows={4} placeholder="Nhập nội dung tin tức" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<Title level={4}>Chi tiết tin tức</Title>}
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
                {viewingNews && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Tiêu đề" span={2}>
                            <Text strong>{viewingNews.title}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ảnh" span={2}>
                            <img
                                src={viewingNews.image}
                                alt={viewingNews.title}
                                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 12 }}
                            />
                        </Descriptions.Item>
                        <Descriptions.Item label="Nội dung" span={2}>
                            <Text>{viewingNews.content}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                            {viewingNews.createdAt ? formatDate(viewingNews.createdAt, 'HH:mm dd/MM/yyyy') : '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày cập nhật">
                            {viewingNews.updatedAt ? formatDate(viewingNews.updatedAt, 'HH:mm dd/MM/yyyy') : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default NewsManagement;
