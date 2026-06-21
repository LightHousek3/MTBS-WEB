import { useEffect, useState } from 'react';
import {
    Table,
    Card,
    Button,
    Space,
    Modal,
    Form,
    Typography,
    Popconfirm,
    Select,
    TimePicker,
    InputNumber,
    Tag,
    App,
    Descriptions,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    ReloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { ticketPriceAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title, Text } = Typography;
const { Option } = Select;

// Constants matching database schema enums
const SEAT_TYPES = [
    { value: 'STANDARD', label: 'Ghế thường', color: 'blue' },
    { value: 'VIP', label: 'Ghế VIP', color: 'gold' },
    { value: 'SWEETBOX', label: 'Ghế đôi Sweetbox', color: 'pink' },
];

const MOVIE_TYPES = [
    { value: '2D', label: 'Phim 2D', color: 'cyan' },
    { value: '3D', label: 'Phim 3D', color: 'purple' },
];

const DAY_TYPES = [
    { value: 'WEEKDAY', label: 'Ngày thường', color: 'green' },
    { value: 'WEEKEND', label: 'Cuối tuần', color: 'orange' },
];

const getSeatTypeLabel = (value) => SEAT_TYPES.find((t) => t.value === value)?.label || value;
const getSeatTypeColor = (value) => SEAT_TYPES.find((t) => t.value === value)?.color || 'default';

const getMovieTypeLabel = (value) => MOVIE_TYPES.find((t) => t.value === value)?.label || value;
const getMovieTypeColor = (value) => MOVIE_TYPES.find((t) => t.value === value)?.color || 'default';

const getDayTypeLabel = (value) => DAY_TYPES.find((t) => t.value === value)?.label || value;
const getDayTypeColor = (value) => DAY_TYPES.find((t) => t.value === value)?.color || 'default';

// Helper to normalize values for modification check
const normalizeForCompare = (values) => ({
    typeSeat: values.typeSeat,
    typeMovie: values.typeMovie,
    dayType: values.dayType,
    price: values.price,
    startTime: values.startTime ? (typeof values.startTime === 'string' ? values.startTime : values.startTime.format('HH:mm')) : '',
    endTime: values.endTime ? (typeof values.endTime === 'string' ? values.endTime : values.endTime.format('HH:mm')) : '',
});

const TicketPriceManagement = () => {
    const [ticketPrices, setTicketPrices] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filterSeat, setFilterSeat] = useState('ALL');
    const [filterMovie, setFilterMovie] = useState('ALL');
    const [filterDay, setFilterDay] = useState('ALL');

    // Modals
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingPrice, setEditingPrice] = useState(null);
    const [originalPriceData, setOriginalPriceData] = useState(null);
    const [viewingPrice, setViewingPrice] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    const [form] = Form.useForm();
    const { message } = App.useApp();

    const fetchTicketPrices = async (page = 1, limit = 5, overrideFilters = {}) => {
        try {
            setLoading(true);
            const seat = 'typeSeat' in overrideFilters ? overrideFilters.typeSeat : filterSeat;
            const movie = 'typeMovie' in overrideFilters ? overrideFilters.typeMovie : filterMovie;
            const day = 'dayType' in overrideFilters ? overrideFilters.dayType : filterDay;

            const params = {
                page,
                limit,
                ...(seat && seat !== 'ALL' && { typeSeat: seat }),
                ...(movie && movie !== 'ALL' && { typeMovie: movie }),
                ...(day && day !== 'ALL' && { dayType: day }),
            };
            const response = await ticketPriceAPI.getTicketPrices(params);

            const content = response.data.data || [];
            const total = response.data.meta?.totalResults || 0;
            setTicketPrices(content);
            setPagination({ total, current: page, pageSize: limit });
        } catch (error) {
            message.error('Không thể tải danh sách giá vé!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketPrices(1, 5, { typeSeat: 'ALL', typeMovie: 'ALL', dayType: 'ALL' });
    }, []);

    const handleFilterSeat = (value) => {
        const val = value || 'ALL';
        setFilterSeat(val);
        fetchTicketPrices(1, pagination?.pageSize || 5, { typeSeat: val });
    };

    const handleFilterMovie = (value) => {
        const val = value || 'ALL';
        setFilterMovie(val);
        fetchTicketPrices(1, pagination?.pageSize || 5, { typeMovie: val });
    };

    const handleFilterDay = (value) => {
        const val = value || 'ALL';
        setFilterDay(val);
        fetchTicketPrices(1, pagination?.pageSize || 5, { dayType: val });
    };

    const handleReload = () => {
        setFilterSeat('ALL');
        setFilterMovie('ALL');
        setFilterDay('ALL');
        fetchTicketPrices(1, pagination?.pageSize || 5, { typeSeat: 'ALL', typeMovie: 'ALL', dayType: 'ALL' });
    };

    const handleAdd = () => {
        setEditingPrice(null);
        setOriginalPriceData(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record) => {
        const formValues = {
            typeSeat: record.typeSeat,
            typeMovie: record.typeMovie,
            dayType: record.dayType,
            price: record.price,
            startTime: record.startTime ? dayjs(record.startTime, 'HH:mm') : null,
            endTime: record.endTime ? dayjs(record.endTime, 'HH:mm') : null,
        };
        setEditingPrice(record);
        setOriginalPriceData(normalizeForCompare(formValues));
        form.setFieldsValue(formValues);
        setIsModalVisible(true);
    };

    const handleView = (record) => {
        setViewingPrice(record);
        setIsViewModalOpen(true);
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await ticketPriceAPI.deleteTicketPrice(id);
            message.success('Xóa cấu hình giá vé thành công!');

            const nextPage = pagination.current > 1 && ticketPrices.length === 1
                ? pagination.current - 1
                : pagination.current;
            fetchTicketPrices(nextPage, pagination?.pageSize || 5);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa giá vé!');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            try {
                const payload = {
                    typeSeat: values.typeSeat,
                    typeMovie: values.typeMovie,
                    dayType: values.dayType,
                    price: values.price,
                    startTime: values.startTime.format('HH:mm'),
                    endTime: values.endTime.format('HH:mm'),
                };

                const compareData = normalizeForCompare(values);

                if (editingPrice) {
                    if (!hasFormChanged(originalPriceData, compareData)) {
                        message.warning('Không có thay đổi nào để cập nhật!');
                        return;
                    }
                    setLoading(true);
                    await ticketPriceAPI.updateTicketPrice(editingPrice.id, payload);
                    message.success('Cập nhật giá vé thành công!');
                } else {
                    setLoading(true);
                    await ticketPriceAPI.createTicketPrice(payload);
                    message.success('Thêm cấu hình giá vé mới thành công!');
                }

                setIsModalVisible(false);
                form.resetFields();
                setOriginalPriceData(null);
                fetchTicketPrices(pagination?.current || 1, pagination?.pageSize || 5);
            } catch (error) {
                message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
            } finally {
                setLoading(false);
            }
        });
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setOriginalPriceData(null);
    };

    const columns = [
        {
            title: 'Loại ghế',
            dataIndex: 'typeSeat',
            key: 'typeSeat',
            render: (typeSeat) => (
                <Tag color={getSeatTypeColor(typeSeat)}>{getSeatTypeLabel(typeSeat)}</Tag>
            ),
        },
        {
            title: 'Loại phim',
            dataIndex: 'typeMovie',
            key: 'typeMovie',
            render: (typeMovie) => (
                <Tag color={getMovieTypeColor(typeMovie)}>{getMovieTypeLabel(typeMovie)}</Tag>
            ),
        },
        {
            title: 'Loại ngày',
            dataIndex: 'dayType',
            key: 'dayType',
            render: (dayType) => (
                <Tag color={getDayTypeColor(dayType)}>{getDayTypeLabel(dayType)}</Tag>
            ),
        },
        {
            title: 'Khung giờ',
            key: 'timeFrame',
            render: (_, record) => (
                <span>{record.startTime} - {record.endTime}</span>
            ),
        },
        {
            title: 'Giá vé',
            dataIndex: 'price',
            key: 'price',
            sorter: (a, b) => a.price - b.price,
            render: (price) => (
                <span className="font-semibold text-red-500">
                    {price?.toLocaleString('vi-VN')} đ
                </span>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
            render: (createdAt) => <span>{formatDate(createdAt, 'HH:mm dd/MM/yyyy')}</span>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 140,
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
                        title="Bạn có chắc chắn muốn xóa cấu hình giá vé này?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Có"
                        cancelText="Không"
                        okType="danger"
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
                    Quản lý cấu hình giá vé
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    className="bg-primary"
                >
                    Thêm cấu hình giá vé
                </Button>
            </div>

            <Card>
                <div className="mb-4 flex gap-4 flex-wrap items-center">
                    <Select
                        placeholder="Lọc loại ghế"
                        allowClear
                        style={{ width: 180 }}
                        onChange={handleFilterSeat}
                        value={filterSeat}
                    >
                        <Option value="ALL">Tất cả loại ghế</Option>
                        {SEAT_TYPES.map((type) => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Lọc loại phim"
                        allowClear
                        style={{ width: 150 }}
                        onChange={handleFilterMovie}
                        value={filterMovie}
                    >
                        <Option value="ALL">Tất cả loại phim</Option>
                        {MOVIE_TYPES.map((type) => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Lọc loại ngày"
                        allowClear
                        style={{ width: 150 }}
                        onChange={handleFilterDay}
                        value={filterDay}
                    >
                        <Option value="ALL">Tất cả loại ngày</Option>
                        {DAY_TYPES.map((type) => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                    <Button icon={<ReloadOutlined />} onClick={handleReload}>
                        Tải lại
                    </Button>
                </div>

                <Table
                    columns={columns}
                    dataSource={ticketPrices}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} cấu hình`,
                    }}
                    onChange={(page) => {
                        const nextPage = page.current;
                        const nextSize = page.pageSize;
                        if (nextPage !== pagination.current || nextSize !== pagination.pageSize) {
                            fetchTicketPrices(nextPage, nextSize, {
                                typeSeat: filterSeat,
                                typeMovie: filterMovie,
                                dayType: filterDay,
                            });
                        }
                    }}
                />
            </Card>

            <Modal
                title={editingPrice ? 'Chỉnh sửa cấu hình giá vé' : 'Thêm cấu hình giá vé mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                okText={editingPrice ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                centered
                confirmLoading={isModalVisible && loading}
                width={550}
            >
                <Form form={form} layout="vertical" name="ticketPriceForm">
                    <Form.Item
                        name="typeSeat"
                        label="Loại ghế"
                        rules={[{ required: true, message: 'Vui lòng chọn loại ghế!' }]}
                    >
                        <Select placeholder="Chọn loại ghế">
                            {SEAT_TYPES.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="typeMovie"
                        label="Loại phim"
                        rules={[{ required: true, message: 'Vui lòng chọn loại phim!' }]}
                    >
                        <Select placeholder="Chọn loại phim">
                            {MOVIE_TYPES.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="dayType"
                        label="Loại ngày"
                        rules={[{ required: true, message: 'Vui lòng chọn loại ngày!' }]}
                    >
                        <Select placeholder="Chọn loại ngày">
                            {DAY_TYPES.map((type) => (
                                <Option key={type.value} value={type.value}>
                                    {type.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="price"
                        label="Giá vé (VNĐ)"
                        rules={[
                            { required: true, message: 'Vui lòng nhập giá vé!' },
                            {
                                validator(_, value) {
                                    if (value == null) return Promise.resolve();
                                    if (value <= 0) {
                                        return Promise.reject(new Error('Giá vé phải lớn hơn 0 VNĐ!'));
                                    }
                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <InputNumber
                            placeholder="VD: 75000"
                            className="w-full"
                            min={1}
                            formatter={(value) =>
                                value ? Number(value).toLocaleString('vi-VN') : ''
                            }
                            step={5000}
                            parser={(value) => value.replace(/\D/g, '')}
                            addonAfter="VNĐ"
                        />
                    </Form.Item>

                    <div className="flex gap-4">
                        <Form.Item
                            name="startTime"
                            label="Giờ bắt đầu"
                            rules={[{ required: true, message: 'Vui lòng chọn giờ bắt đầu!' }]}
                            className="flex-1"
                        >
                            <TimePicker format="HH:mm" className="w-full" placeholder="Chọn giờ" />
                        </Form.Item>

                        <Form.Item
                            name="endTime"
                            label="Giờ kết thúc"
                            className="flex-1"
                            rules={[
                                { required: true, message: 'Vui lòng chọn giờ kết thúc!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || !getFieldValue('startTime')) {
                                            return Promise.resolve();
                                        }
                                        const start = getFieldValue('startTime');
                                        if (value.isBefore(start) || value.isSame(start)) {
                                            return Promise.reject(new Error('Giờ kết thúc phải sau giờ bắt đầu!'));
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <TimePicker format="HH:mm" className="w-full" placeholder="Chọn giờ" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={<Title level={4}>Chi tiết cấu hình giá vé</Title>}
                open={isViewModalOpen}
                onCancel={() => setIsViewModalOpen(false)}
                width={600}
                centered
                footer={[
                    <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                        Đóng
                    </Button>,
                ]}
            >
                {viewingPrice && (
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="Loại ghế">
                            <Tag color={getSeatTypeColor(viewingPrice.typeSeat)}>
                                {getSeatTypeLabel(viewingPrice.typeSeat)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Loại phim">
                            <Tag color={getMovieTypeColor(viewingPrice.typeMovie)}>
                                {getMovieTypeLabel(viewingPrice.typeMovie)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Loại ngày">
                            <Tag color={getDayTypeColor(viewingPrice.dayType)}>
                                {getDayTypeLabel(viewingPrice.dayType)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Khung giờ">
                            <Text strong>{viewingPrice.startTime} - {viewingPrice.endTime}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Giá vé">
                            <Text className="font-semibold text-red-500">
                                {viewingPrice.price?.toLocaleString('vi-VN')} đ
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                            {formatDate(viewingPrice.createdAt, 'HH:mm dd/MM/yyyy')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày cập nhật">
                            {formatDate(viewingPrice.updatedAt, 'HH:mm dd/MM/yyyy')}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default TicketPriceManagement;
