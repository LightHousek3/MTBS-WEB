import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {App, Button, Card, DatePicker, Descriptions, Form, Image, Input, InputNumber, Modal, Popconfirm, Progress, Select, Space, Table, Tag, Typography, Upload,} from 'antd';
import {DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, UploadOutlined,} from '@ant-design/icons';
import { cloudinaryAPI, promotionAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const DISCOUNT_TYPE_OPTIONS = [
    { value: 'AMOUNT', label: 'Giảm theo số tiền', color: 'gold' },
    { value: 'PERCENT', label: 'Giảm theo phần trăm', color: 'blue' },
];

const PROMOTION_STATUS_OPTIONS = [
    { value: 'UPCOMING', label: 'Sắp diễn ra', color: 'blue' },
    { value: 'ACTIVE', label: 'Đang áp dụng', color: 'green' },
    { value: 'EXPIRED', label: 'Đã hết hạn', color: 'default' },
];

const SEAT_TYPE_OPTIONS = [
    { value: 'STANDARD', label: 'Ghế thường', color: 'blue' },
    { value: 'VIP', label: 'Ghế VIP', color: 'gold' },
    { value: 'SWEETBOX', label: 'Ghế Sweetbox', color: 'magenta' },
];

const MOVIE_TYPE_OPTIONS = [
    { value: '2D', label: 'Phim 2D', color: 'cyan' },
    { value: '3D', label: 'Phim 3D', color: 'purple' },
];

const DAY_TYPE_OPTIONS = [
    { value: 'WEEKDAY', label: 'Ngày thường', color: 'green' },
    { value: 'WEEKEND', label: 'Cuối tuần', color: 'orange' },
];

const SERVICE_TYPE_OPTIONS = [
    { value: 'POPCORN', label: 'Bắp', color: 'gold' },
    { value: 'DRINK', label: 'Nước', color: 'blue' },
    { value: 'COMBO', label: 'Combo', color: 'green' },
    { value: 'OTHER', label: 'Khác', color: 'default' },
];

const sortValues = (values = []) => [...values].sort();

const normalizePromotionValues = (values) => ({
    title: values.title?.trim() || '',
    description: values.description?.trim() || '',
    discountType: values.discountType,
    discountValue: Number(values.discountValue || 0),
    startDate: values.startDate || '',
    endDate: values.endDate || '',
    promotionTickets: {
        typeSeat: sortValues(values.promotionTickets?.typeSeat || []),
        typeMovie: sortValues(values.promotionTickets?.typeMovie || []),
        dayType: sortValues(values.promotionTickets?.dayType || []),
    },
    promotionServices: {
        typeService: sortValues(values.promotionServices?.typeService || []),
    },
});

const buildPayload = (values, imageUrl) => {
    const [startDate, endDate] = values.dateRange || [];

    return {
        title: values.title?.trim(),
        description: values.description?.trim() || '',
        discountType: values.discountType,
        discountValue: Number(values.discountValue),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        imageUrl: imageUrl || null,
        promotionTickets: {
            typeSeat: values.ticketSeatTypes || [],
            typeMovie: values.ticketMovieTypes || [],
            dayType: values.ticketDayTypes || [],
        },
        promotionServices: {
            typeService: values.serviceTypes || [],
        },
    };
};

const mapPromotionToFormValues = (promotion) => ({
    title: promotion.title,
    description: promotion.description || '',
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    dateRange:
        promotion.startDate && promotion.endDate
            ? [dayjs(promotion.startDate), dayjs(promotion.endDate)]
            : [],
    ticketSeatTypes: promotion.promotionTickets?.typeSeat || [],
    ticketMovieTypes: promotion.promotionTickets?.typeMovie || [],
    ticketDayTypes: promotion.promotionTickets?.dayType || [],
    serviceTypes: promotion.promotionServices?.typeService || [],
});

const mapPromotionForCompare = (promotion) =>
    normalizePromotionValues({
        title: promotion.title,
        description: promotion.description || '',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startDate: promotion.startDate ? dayjs(promotion.startDate).toISOString() : '',
        endDate: promotion.endDate ? dayjs(promotion.endDate).toISOString() : '',
        promotionTickets: {
            typeSeat: promotion.promotionTickets?.typeSeat || [],
            typeMovie: promotion.promotionTickets?.typeMovie || [],
            dayType: promotion.promotionTickets?.dayType || [],
        },
        promotionServices: {
            typeService: promotion.promotionServices?.typeService || [],
        },
    });

const getOptionConfig = (options, value) =>
    options.find((item) => item.value === value) || {
        label: value || '-',
        color: 'default',
    };

const renderTagGroup = (values = [], options = []) => {
    if (!values.length) {
        return <Text type="secondary">Không giới hạn</Text>;
    }

    return (
        <Space size={[4, 4]} wrap>
            {values.map((value) => {
                const config = getOptionConfig(options, value);
                return (
                    <Tag color={config.color} key={value}>
                        {config.label}
                    </Tag>
                );
            })}
        </Space>
    );
};

const PromotionManagement = () => {
    const [form] = Form.useForm();
    const { message } = App.useApp();
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [viewingPromotion, setViewingPromotion] = useState(null);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [originalData, setOriginalData] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imageList, setImageList] = useState([]);
    const [previewImage, setPreviewImage] = useState('');
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
    const [isImageMarkedForDeletion, setIsImageMarkedForDeletion] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0,
    });

    const resetImageState = () => {
        setImageFile(null);
        setImageList([]);
        setPreviewImage('');
        setImageUploadProgress(0);
        setUploadedImageUrl(null);
        setIsImageMarkedForDeletion(false);
    };

    const fetchPromotions = async (page = pagination.current, limit = pagination.pageSize) => {
        try {
            setLoading(true);
            const response = await promotionAPI.getPromotions({
                page,
                limit,
                sortBy: 'createdAt:desc',
            });

            setPromotions(response.data.data || []);
            setPagination({
                current: response.data.meta?.page || page,
                pageSize: response.data.meta?.limit || limit,
                total: response.data.meta?.totalResults || 0,
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách khuyến mãi.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPromotions(1, 5);
    }, []);

    const uploadPromotionImage = async (file, onProgress) => {
        const response = await cloudinaryAPI.uploadImage(file, 'promotions', onProgress);
        return response.data.secure_url;
    };

    const openCreateModal = () => {
        setEditingPromotion(null);
        setOriginalData(null);
        form.resetFields();
        resetImageState();
        setModalOpen(true);
    };

    const openEditModal = (promotion) => {
        setEditingPromotion(promotion);
        setOriginalData(mapPromotionForCompare(promotion));
        form.setFieldsValue(mapPromotionToFormValues(promotion));
        setImageFile(null);
        setImageUploadProgress(0);
        setUploadedImageUrl(promotion.imageUrl || null);
        setIsImageMarkedForDeletion(false);
        setPreviewImage(promotion.imageUrl || '');
        setImageList(
            promotion.imageUrl
                ? [
                      {
                          uid: '-1',
                          name: 'promotion-image.jpg',
                          status: 'done',
                          url: promotion.imageUrl,
                      },
                  ]
                : [],
        );
        setModalOpen(true);
    };

    const openDetailModal = async (id) => {
        try {
            setDetailLoading(true);
            setViewingPromotion(null);
            const response = await promotionAPI.getPromotionById(id);
            setViewingPromotion(response.data.data);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải chi tiết khuyến mãi.');
            console.error(error);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            setLoading(true);
            await promotionAPI.deletePromotion(id);
            message.success('Xóa khuyến mãi thành công.');

            const nextPage =
                pagination.current > 1 && promotions.length === 1
                    ? pagination.current - 1
                    : pagination.current;
            fetchPromotions(nextPage, pagination.pageSize);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể xóa khuyến mãi.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = buildPayload(values, editingPromotion?.imageUrl || null);
            const normalizedValues = normalizePromotionValues(payload);
            const hasImageChanged = imageFile !== null || isImageMarkedForDeletion;

            if (editingPromotion && !hasFormChanged(originalData, normalizedValues) && !hasImageChanged) {
                message.warning('Không có thay đổi nào để cập nhật.');
                return;
            }

            setLoading(true);
            setImageUploadProgress(imageFile ? 0 : 100);

            let imageUrl = editingPromotion?.imageUrl || null;
            if (imageFile) {
                imageUrl =
                    uploadedImageUrl || (await uploadPromotionImage(imageFile, setImageUploadProgress));
                setUploadedImageUrl(imageUrl);
            } else if (isImageMarkedForDeletion) {
                imageUrl = null;
            }

            const finalPayload = buildPayload(values, imageUrl);

            if (editingPromotion) {
                await promotionAPI.updatePromotion(editingPromotion.id, finalPayload);
                message.success('Cập nhật khuyến mãi thành công.');
            } else {
                await promotionAPI.createPromotion(finalPayload);
                message.success('Thêm khuyến mãi thành công.');
            }

            setModalOpen(false);
            form.resetFields();
            resetImageState();
            setOriginalData(null);
            fetchPromotions(pagination.current, pagination.pageSize);
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.response?.data?.message || 'Không thể lưu khuyến mãi.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'imageUrl',
            width: 88,
            render: (value) => (
                <Image
                    src={value || 'https://placehold.co/80x80?text=Promo'}
                    alt="promotion"
                    width={56}
                    height={56}
                    style={{ objectFit: 'cover', borderRadius: 8 }}
                />
            ),
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
        },
        {
            title: 'Loại giảm',
            dataIndex: 'discountType',
            key: 'discountType',
            render: (value) => {
                const config = getOptionConfig(DISCOUNT_TYPE_OPTIONS, value);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: 'Giá trị giảm',
            dataIndex: 'discountValue',
            key: 'discountValue',
            render: (value, record) =>
                record.discountType === 'PERCENT'
                    ? `${Number(value || 0)}%`
                    : `${Number(value || 0).toLocaleString('vi-VN')} đ`,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                const config = getOptionConfig(PROMOTION_STATUS_OPTIONS, value);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: 'Thời gian áp dụng',
            key: 'dateRange',
            render: (_, record) => (
                <span>
                    {formatDate(record.startDate, 'HH:mm dd/MM/yyyy')} -{' '}
                    {formatDate(record.endDate, 'HH:mm dd/MM/yyyy')}
                </span>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 140,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record.id)} />
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa khuyến mãi này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        okType="danger"
                        onConfirm={() => handleDelete(record.id)}
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
                    Quản lý khuyến mãi
                </Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchPromotions(1, pagination.pageSize)}>
                        Tải lại
                    </Button>
                    <Button className="bg-primary" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Thêm khuyến mãi
                    </Button>
                </Space>
            </div>

            <Card>
                <Table
                    columns={columns}
                    dataSource={promotions}
                    loading={loading}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
                    }}
                    onChange={(nextPagination) => {
                        fetchPromotions(nextPagination.current, nextPagination.pageSize);
                    }}
                    scroll={{ x: 1100 }}
                />
            </Card>

            <Modal
                title={editingPromotion ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => {
                    if (loading) return;
                    setModalOpen(false);
                    resetImageState();
                }}
                okText={editingPromotion ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={loading}
                cancelButtonProps={{ disabled: loading }}
                closable={!loading}
                maskClosable={!loading}
                keyboard={!loading}
                width={760}
                centered
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề khuyến mãi!' }]}
                    >
                        <Input maxLength={255} />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <TextArea rows={3} maxLength={500} showCount />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="discountType"
                            label="Loại giảm giá"
                            rules={[{ required: true, message: 'Vui lòng chọn loại giảm giá!' }]}
                        >
                            <Select
                                options={DISCOUNT_TYPE_OPTIONS.map(({ value, label }) => ({
                                    value,
                                    label,
                                }))}
                            />
                        </Form.Item>

                        <Form.Item
                            name="discountValue"
                            label="Giá trị giảm"
                            dependencies={['discountType']}
                            rules={[
                                { required: true, message: 'Vui lòng nhập giá trị giảm!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (value == null || value === '') {
                                            return Promise.resolve();
                                        }

                                        if (Number(value) <= 0) {
                                            return Promise.reject(
                                                new Error('Giá trị giảm phải lớn hơn 0.'),
                                            );
                                        }

                                        if (
                                            getFieldValue('discountType') === 'PERCENT' &&
                                            Number(value) > 100
                                        ) {
                                            return Promise.reject(
                                                new Error('Giảm theo phần trăm không được vượt quá 100%.'),
                                            );
                                        }

                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <InputNumber min={1} precision={0} className="w-full" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        name="dateRange"
                        label="Thời gian áp dụng"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian áp dụng!' }]}
                    >
                        <RangePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item name="ticketSeatTypes" label="Áp dụng cho loại ghế">
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Chọn loại ghế"
                                options={SEAT_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                            />
                        </Form.Item>

                        <Form.Item name="ticketMovieTypes" label="Áp dụng cho loại phim">
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Chọn loại phim"
                                options={MOVIE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                            />
                        </Form.Item>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item name="ticketDayTypes" label="Áp dụng cho loại ngày">
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Chọn loại ngày"
                                options={DAY_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                            />
                        </Form.Item>

                        <Form.Item name="serviceTypes" label="Áp dụng cho dịch vụ">
                            <Select
                                mode="multiple"
                                allowClear
                                placeholder="Chọn loại dịch vụ"
                                options={SERVICE_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }))}
                            />
                        </Form.Item>
                    </div>

                    <Form.Item label="Ảnh khuyến mãi">
                        <Upload
                            accept="image/*"
                            maxCount={1}
                            listType="picture"
                            disabled={loading}
                            fileList={imageList}
                            beforeUpload={(file) => {
                                if (loading) {
                                    return Upload.LIST_IGNORE;
                                }
                                setImageFile(file);
                                setImageUploadProgress(0);
                                setUploadedImageUrl(null);
                                setIsImageMarkedForDeletion(false);
                                const previewUrl = URL.createObjectURL(file);
                                setPreviewImage(previewUrl);
                                setImageList([
                                    {
                                        uid: file.uid,
                                        name: file.name,
                                        status: 'done',
                                        url: previewUrl,
                                    },
                                ]);
                                return false;
                            }}
                            onRemove={() => {
                                if (loading) return false;
                                setImageFile(null);
                                setImageUploadProgress(0);
                                setUploadedImageUrl(null);
                                setIsImageMarkedForDeletion(true);
                                setImageList([]);
                                setPreviewImage('');
                            }}
                        >
                            <Button icon={<UploadOutlined />}>
                                {imageList.length > 0 ? 'Chọn lại ảnh' : 'Chọn ảnh'}
                            </Button>
                        </Upload>

                        {previewImage && (
                            <div className="mt-3">
                                <Image
                                    src={previewImage}
                                    alt="preview"
                                    width={220}
                                    style={{ borderRadius: 8 }}
                                />
                            </div>
                        )}

                        {imageFile && (
                            <Progress
                                percent={imageUploadProgress}
                                size="small"
                                status={imageUploadProgress === 100 ? 'success' : 'active'}
                                className="mt-2"
                            />
                        )}
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Chi tiết khuyến mãi"
                open={detailLoading || Boolean(viewingPromotion)}
                onCancel={() => {
                    if (detailLoading) return;
                    setViewingPromotion(null);
                }}
                footer={null}
                width={820}
                centered
                confirmLoading={detailLoading}
            >
                {detailLoading ? (
                    <div className="py-10 text-center">
                        <Text>Đang tải chi tiết khuyến mãi...</Text>
                    </div>
                ) : (
                    viewingPromotion && (
                        <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                                <Image
                                    src={viewingPromotion.imageUrl || 'https://placehold.co/180x180?text=Promo'}
                                    width={160}
                                    height={160}
                                    style={{ objectFit: 'cover', borderRadius: 8 }}
                                />
                                <div className="flex-1 min-w-0">
                                    <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                                        {viewingPromotion.title}
                                    </Title>
                                    <Space wrap>
                                        <Tag color={getOptionConfig(PROMOTION_STATUS_OPTIONS, viewingPromotion.status).color}>
                                            {getOptionConfig(PROMOTION_STATUS_OPTIONS, viewingPromotion.status).label}
                                        </Tag>
                                        <Tag color={getOptionConfig(DISCOUNT_TYPE_OPTIONS, viewingPromotion.discountType).color}>
                                            {getOptionConfig(DISCOUNT_TYPE_OPTIONS, viewingPromotion.discountType).label}
                                        </Tag>
                                    </Space>
                                    <Text className="block mt-3" type="secondary">
                                        {viewingPromotion.description || 'Chưa có mô tả.'}
                                    </Text>
                                </div>
                            </div>

                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Giá trị giảm">
                                    {viewingPromotion.discountType === 'PERCENT'
                                        ? `${Number(viewingPromotion.discountValue || 0)}%`
                                        : `${Number(viewingPromotion.discountValue || 0).toLocaleString('vi-VN')} đ`}
                                </Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    {getOptionConfig(PROMOTION_STATUS_OPTIONS, viewingPromotion.status).label}
                                </Descriptions.Item>
                                <Descriptions.Item label="Bắt đầu">
                                    {formatDate(viewingPromotion.startDate, 'HH:mm dd/MM/yyyy') || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Kết thúc">
                                    {formatDate(viewingPromotion.endDate, 'HH:mm dd/MM/yyyy') || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại ghế áp dụng" span={2}>
                                    {renderTagGroup(
                                        viewingPromotion.promotionTickets?.typeSeat || [],
                                        SEAT_TYPE_OPTIONS,
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại phim áp dụng" span={2}>
                                    {renderTagGroup(
                                        viewingPromotion.promotionTickets?.typeMovie || [],
                                        MOVIE_TYPE_OPTIONS,
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Loại ngày áp dụng" span={2}>
                                    {renderTagGroup(
                                        viewingPromotion.promotionTickets?.dayType || [],
                                        DAY_TYPE_OPTIONS,
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Dịch vụ áp dụng" span={2}>
                                    {renderTagGroup(
                                        viewingPromotion.promotionServices?.typeService || [],
                                        SERVICE_TYPE_OPTIONS,
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày tạo">
                                    {formatDate(viewingPromotion.createdAt, 'HH:mm dd/MM/yyyy') || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Cập nhật">
                                    {formatDate(viewingPromotion.updatedAt, 'HH:mm dd/MM/yyyy') || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="ID" span={2}>
                                    <Text copyable>{viewingPromotion.id || viewingPromotion._id}</Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    )
                )}
            </Modal>
        </div>
    );
};

export default PromotionManagement;
