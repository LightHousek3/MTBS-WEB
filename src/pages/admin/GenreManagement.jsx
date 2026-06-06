import { useEffect, useState } from 'react';
import { Table, Card, Button, Space, Input, Modal, Form, Typography, Popconfirm, App } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { genreAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title } = Typography;
const { Search } = Input;

const GenreManagement = () => {
    const [genres, setGenres] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingGenre, setEditingGenre] = useState(null);
    const [originalGenreData, setOriginalGenreData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const fetchGenres = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = { page, limit, search };
            const response = await genreAPI.getGenres(params);

            const content = response.data.data || [];
            const total = response.data.meta.totalResults;
            setGenres(content);
            setPagination({ total, current: page, pageSize: limit });
        } catch (error) {
            message.error('Không thể tải danh sách thể loại!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGenres();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchGenres(1, pagination?.pageSize || 5, value);
    };

    const handleAdd = () => {
        setEditingGenre(null);
        setOriginalGenreData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (genre) => {
        setEditingGenre(genre);
        setOriginalGenreData(genre);
        form.setFieldsValue(genre);
        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await genreAPI.deleteGenre(id);
            message.success('Xóa thể loại thành công!');
            fetchGenres(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
        } catch (error) {
            message.error('Lỗi khi xóa thể loại!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            try {
                const payload = {
                    ...values,
                    name: values.name.trim(),
                };
                if (editingGenre) {
                    // Kiểm tra xem có thay đổi không
                    if (!hasFormChanged(originalGenreData, payload)) {
                        message.warning('Không có thay đổi nào để cập nhật!');
                        return;
                    }
                    setLoading(true);
                    await genreAPI.updateGenre(editingGenre.id, payload);
                    message.success('Cập nhật thể loại thành công!');
                } else {
                    setLoading(true);
                    await genreAPI.createGenre(payload);
                    message.success('Thêm thể loại mới thành công!');
                }
                setIsModalVisible(false);
                form.resetFields();
                setOriginalGenreData(null);
                fetchGenres(pagination?.current || 1, pagination?.pageSize || 5, searchKeyword);
            } catch (error) {
                message.error(error.response?.data?.message);
            } finally {
                setLoading(false);
            }
        });
    };

    const columns = [
        {
            title: 'Tên thể loại',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: (a, b) => new Date(a) - new Date(b),
            render: (createdAt) => <span>{formatDate(createdAt, 'HH:mm dd/MM/yyyy')}</span>,
        },
        {
            title: 'Ngày chỉnh sửa',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: (a, b) => new Date(a) - new Date(b),
            render: (updatedAt) => <span>{formatDate(updatedAt, 'HH:mm dd/MM/yyyy')}</span>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa thể loại này?"
                        onConfirm={() => handleDelete(record.id)}
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
                <Title level={2}>Quản lý thể loại</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    className="bg-primary"
                >
                    Thêm thể loại
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Search
                        placeholder="Tìm kiếm thể loại..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={genres}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} của ${total} thể loại`,
                    }}
                    onChange={(page) => {
                        const nextPage = page.current;
                        const nextSize = page.pageSize;
                        if (nextPage !== pagination.current || nextSize !== pagination.pageSize)
                            fetchGenres(nextPage, nextSize, searchKeyword);
                    }}
                />
            </Card>

            <Modal
                title={editingGenre ? 'Chỉnh sửa thể loại' : 'Thêm thể loại mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingGenre ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={500}
            >
                <Form form={form} layout="vertical" name="genreForm">
                    <Form.Item
                        name="name"
                        label="Tên thể loại"
                        rules={[{ required: true, message: 'Vui lòng nhập tên thể loại!' }]}
                    >
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default GenreManagement;
