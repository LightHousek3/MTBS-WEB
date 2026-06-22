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
    Select,
    Upload,
    InputNumber,
    Image,
    Tag,
    App,
    Descriptions,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    UploadOutlined,
    ReloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { cloudinaryAPI, serviceAPI, theaterAPI } from '../../apis';
import { formatDate } from '../../utils';
import { hasFormChanged, hasNewFile } from '../../utils/formUtils';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [theaters, setTheaters] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pagination, setPagination] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filterTheater, setFilterTheater] = useState(null);
    const [filterType, setFilterType] = useState(null);
    const [editingService, setEditingService] = useState(null);
    const [originalServiceData, setOriginalServiceData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [previewImage, setPreviewImage] = useState('');
    const [viewingService, setViewingService] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const { message } = App.useApp();
    const [form] = Form.useForm();

    const serviceTypes = [
        { value: 'POPCORN', label: 'Bắp', color: 'gold' },
        { value: 'DRINK', label: 'Nước', color: 'blue' },
        { value: 'COMBO', label: 'Combo', color: 'green' },
        { value: 'OTHER', label: 'Khác', color: 'default' },
    ];

    const serviceStatus = [
        { value: 'AVAILABLE', color: 'green' },
        { value: 'INACTIVE', color: 'red' },
    ];

    const getServiceTypeLabel = (type) => {
        return serviceTypes.find((t) => t.value === type)?.label || type;
    };

    const getServiceTypeColor = (type) => {
        return serviceTypes.find((t) => t.value === type)?.color || 'default';
    };

    const getServiceStatusColor = (status) => {
        return serviceStatus.find((s) => s.value === status)?.color || 'default';
    };

    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            setLoading(true);

            const [serviceRes, theaterRes] = await Promise.all([
                serviceAPI.getServices({
                    page: 1,
                    limit: 5,
                    populate: 'theater:name-address',
                }),
                theaterAPI.getTheaters({
                    page: 1,
                    limit: 100,
                }),
            ]);
            console.log('serviceRes', serviceRes);
            const serviceData = serviceRes.data.data || [];

            setServices(serviceData);

            setPagination({
                total: serviceRes.data.meta.totalResults,
                current: 1,
                pageSize: 5,
                totalPages: serviceRes.data.meta.totalPages,
            });
            setTheaters(theaterRes.data.data || []);
        } catch (error) {
            message.error('Không thể tải dữ liệu');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async (page = 1, limit = 5, search = '', theater = null, type = null) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                populate: 'theater:name-address',
                ...(search && { search }),
                ...(theater && { theater }),
                ...(type && { type }),
            };
            const response = await serviceAPI.getServices(params);
            const service = response.data.data || [];
            const total = response.data.meta.totalResults;
            const totalPages = response.data.meta.totalPages;
            setServices(service);
            setPagination({
                total,
                current: page,
                pageSize: limit,
                totalPages,
            });
        } catch (error) {
            message.error('Không thể tải danh sách dịch vụ!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleViewService = async (record) => {
        try {
            setLoading(true);
            const response = await serviceAPI.getServiceById(record.id);
            const service = response.data.data;
            setViewingService(service);
            setIsViewModalOpen(true);
        } catch (error) {
            message.error('Không thể tải chi tiết dịch vụ!');
            console.log(error.response?.data?.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchServices(1, pagination?.pageSize || 10, value, filterTheater, filterType);
    };

    const handleFilterTheater = (value) => {
        setFilterTheater(value);
        fetchServices(1, pagination?.pageSize || 10, searchKeyword, value, filterType);
    };

    const handleFilterType = (value) => {
        setFilterType(value);
        fetchServices(1, pagination?.pageSize || 10, searchKeyword, filterTheater, value);
    };

    const handleEdit = (service) => {
        const { theater, ...rest } = service;
        const normalizedData = {
            ...rest,
            theater: theater.id,
        };
        setEditingService(normalizedData);
        setOriginalServiceData(normalizedData);
        form.setFieldsValue(normalizedData);

        if (service.imageUrl) {
            setPreviewImage(service.imageUrl);
            setFileList([
                {
                    uid: '-1',
                    name: 'image.png',
                    status: 'done',
                    url: service.imageUrl,
                },
            ]);
        }
        setIsModalVisible(true);
    };

    const handleDeleteService = async (id) => {
        try {
            setLoading(true);
            await serviceAPI.deleteService(id);
            fetchServices(
                pagination?.current,
                pagination?.pageSize,
                searchKeyword,
                filterTheater,
                filterType,
            );
            message.success('Xóa dịch vụ thành công');
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi không thể xóa dịch vụ!');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingService(null);
        setOriginalServiceData(null);
        form.resetFields();
        setFileList([]);
        setPreviewImage('');
        setIsModalVisible(true);
    };

    const handleAddService = async (values) => {
        try {
            setLoading(true);
            if (fileList) {
                const file = fileList[0].originFileObj;
                const response = await cloudinaryAPI.uploadImage(file, 'services');
                values.imageUrl = response.data.secure_url;
            }

            await serviceAPI.createService(values);
            message.success('Thêm dịch vụ mới thành công');
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi không thể thêm dịch vụ mới!');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateService = async (values, hasFileChanged) => {
        try {
            setLoading(true);

            if (hasFileChanged) {
                const file = fileList[0]?.originFileObj;
                const response = await cloudinaryAPI.uploadImage(file, 'services');
                values.imageUrl = response.data.secure_url;
            }
            console.log('values', values);
            await serviceAPI.updateService(editingService.id, values);
            message.success('Cập nhật dịch vụ thành công');
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi không thể cập nhật dịch vụ!');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            // Create
            if ((!editingService && !fileList) || fileList.length === 0) {
                message.error('Vui lòng chọn ảnh dịch vụ!');
                return false;
            }

            // Check if data changed
            const hasFileChanged = hasNewFile(fileList, originalServiceData?.imageUrl);
            const hasDataChanged = hasFormChanged(originalServiceData, values, ['imageUrl']);

            if (editingService && !hasDataChanged && !hasFileChanged) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }
            if (editingService) {
                await handleUpdateService(values, hasFileChanged);
            } else {
                await handleAddService(values);
            }
            setIsModalVisible(false);
            form.resetFields();
            setFileList([]);
            setPreviewImage('');
            setOriginalServiceData(null);
            fetchServices(
                pagination?.current,
                pagination?.pageSize,
                searchKeyword,
                filterTheater,
                filterType,
            );
        });
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setFileList([]);
        setPreviewImage('');
        setOriginalServiceData(null);
    };

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
        if (newFileList.length > 0) {
            const file = newFileList[0];
            if (file.originFileObj) {
                const reader = new FileReader();
                reader.onload = (e) => setPreviewImage(e.target.result);
                reader.readAsDataURL(file.originFileObj);
            }
        } else {
            setPreviewImage('');
        }
    };

    const uploadProps = {
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('Chỉ được upload file ảnh!');
                return Upload.LIST_IGNORE;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('Ảnh phải nhỏ hơn 5MB!');
                return Upload.LIST_IGNORE;
            }
            return false;
        },
        fileList,
        onChange: handleUploadChange,
        maxCount: 1,
    };

    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'imageUrl',
            key: 'imageUrl',
            width: 80,
            render: (imageUrl) => (
                <Image
                    src={imageUrl || 'https://via.placeholder.com/50'}
                    alt="service"
                    width={50}
                    height={50}
                    style={{ objectFit: 'cover', borderRadius: 4 }}
                />
            ),
        },
        {
            title: 'Tên dịch vụ',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Rạp',
            dataIndex: 'theater',
            key: 'theater',
            sorter: (a, b) => a.theater.name.localeCompare(b.theater.name),
            render: (theater) => <span>{theater.name}</span>,
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type) => (
                <Tag color={getServiceTypeColor(type)}>{getServiceTypeLabel(type)}</Tag>
            ),
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            width: 120,
            sorter: (a, b) => a.price - b.price,
            render: (price) => (
                <span className="font-semibold text-red-500">
                    {price?.toLocaleString('vi-VN')} đ
                </span>
            ),
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            sorter: (a, b) => a.quantity - b.quantity,
            render: (quantity) => (
                <span className={quantity > 0 ? 'text-green-600' : 'text-red-600'}>{quantity}</span>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 100,
            render: (status) => <Tag color={getServiceStatusColor(status)}>{status}</Tag>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 120,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewService(record)}
                    />
                    <Button
                        type="primary"
                        className="bg-blue-500!"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa dịch vụ này?"
                        onConfirm={() => handleDeleteService(record.id)}
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
                    Quản lý dịch vụ
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    className="bg-primary"
                >
                    Thêm dịch vụ
                </Button>
            </div>

            <Card>
                <div className="mb-4 flex gap-4 flex-wrap">
                    <Search
                        placeholder="Tìm kiếm theo tên"
                        allowClear
                        enterButton={<SearchOutlined />}
                        size="middle"
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                    />
                    <Select
                        placeholder="Lọc theo rạp"
                        allowClear
                        style={{ width: 200 }}
                        onChange={handleFilterTheater}
                        value={filterTheater}
                    >
                        {theaters.map((theater) => (
                            <Option key={theater.id} value={theater.id}>
                                {theater.name}
                            </Option>
                        ))}
                    </Select>
                    <Select
                        placeholder="Lọc theo loại"
                        allowClear
                        style={{ width: 150 }}
                        onChange={handleFilterType}
                        value={filterType}
                    >
                        {serviceTypes.map((type) => (
                            <Option key={type.value} value={type.value}>
                                {type.label}
                            </Option>
                        ))}
                    </Select>
                </div>

                <Table
                    columns={columns}
                    dataSource={services}
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
                            fetchServices(
                                nextPage,
                                nextSize,
                                searchKeyword,
                                filterTheater,
                                filterType,
                            );
                    }}
                />
            </Card>

            <Modal
                title={editingService ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={handleModalCancel}
                okText={editingService ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                centered
                confirmLoading={isModalVisible && loading}
                width={700}
            >
                <div data-lenis-prevent>
                    <Form
                        form={form}
                        layout="vertical"
                        name="serviceForm"
                        className="max-h-125 overflow-y-auto"
                    >
                        <Form.Item
                            name="theater"
                            label="Rạp"
                            rules={[{ required: true, message: 'Vui lòng chọn rạp!' }]}
                        >
                            <Select placeholder="Chọn rạp" showSearch optionFilterProp="children">
                                {theaters.map((theater) => (
                                    <Option key={theater.id} value={theater.id}>
                                        {theater.name} - {theater.address}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="name"
                            label="Tên dịch vụ"
                            rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ!' }]}
                        >
                            <Input placeholder="VD: Bắp rang bơ lớn" />
                        </Form.Item>
                        <div className="flex gap-4">
                            <Form.Item
                                name="type"
                                label="Loại dịch vụ"
                                rules={[{ required: true, message: 'Vui lòng chọn loại dịch vụ!' }]}
                            >
                                <Select placeholder="Chọn loại dịch vụ" style={{ width: '150px' }}>
                                    {serviceTypes.map((type) => (
                                        <Option key={type.value} value={type.value}>
                                            <Tag color={type.color}>{type.label}</Tag>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="status"
                                label="Trạng thái"
                                rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                            >
                                <Select placeholder="Chọn trạng thái" style={{ width: '150px' }}>
                                    {serviceStatus.map((status) => (
                                        <Option key={status.value} value={status.value}>
                                            <Tag color={status.color}>{status.value}</Tag>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>

                        <div className="flex gap-4">
                            <Form.Item
                                name="price"
                                label="Giá (VNĐ)"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập giá!' },
                                    {
                                        validator(_, value) {
                                            if (value == null) return Promise.resolve();

                                            if (value <= 0)
                                                return Promise.reject(
                                                    new Error('Giá phải lớn hơn 0!'),
                                                );

                                            return Promise.resolve();
                                        },
                                    },
                                ]}
                                className="flex-1"
                            >
                                <InputNumber
                                    placeholder="VD: 50000"
                                    className="w-full"
                                    min={0}
                                    formatter={(value) =>
                                        value ? Number(value).toLocaleString('vi-VN') : ''
                                    }
                                    step={1000}
                                    parser={(value) => value.replace(/\D/g, '')}
                                    addonAfter="VNĐ"
                                />
                            </Form.Item>

                            <Form.Item
                                name="quantity"
                                label="Số lượng"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập số lượng!' },
                                    {
                                        type: 'number',
                                        min: 0,
                                        message: 'Số lượng phải lớn hơn hoặc bằng 0!',
                                    },
                                ]}
                                className="flex-1"
                            >
                                <InputNumber placeholder="VD: 100" style={{ width: '100%' }} />
                            </Form.Item>
                        </div>

                        <Form.Item name="description" label="Mô tả">
                            <TextArea rows={3} placeholder="Mô tả chi tiết về dịch vụ..." />
                        </Form.Item>

                        <Form.Item label="Ảnh dịch vụ">
                            <Upload {...uploadProps} listType="picture">
                                <Button icon={<UploadOutlined />}>Chọn ảnh</Button>
                            </Upload>
                            {previewImage && (
                                <div className="mt-3">
                                    <Image
                                        src={previewImage}
                                        alt="preview"
                                        width={200}
                                        style={{ borderRadius: 8 }}
                                    />
                                </div>
                            )}
                        </Form.Item>
                    </Form>
                </div>
            </Modal>
            <Modal
                title={<Title level={4}>Chi tiết dịch vụ</Title>}
                open={isViewModalOpen}
                onCancel={() => setIsViewModalOpen(false)}
                width={900}
                centered
                footer={[
                    <Button key="close" onClick={() => setIsViewModalOpen(false)}>
                        Đóng
                    </Button>,
                ]}
            >
                {viewingService && (
                    <Descriptions bordered column={2}>
                        <Descriptions.Item label="Ảnh dịch vụ" span={2}>
                            <Image src={viewingService.imageUrl} width={100} height={100} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Tên dịch vụ" span={2}>
                            <Text strong>{viewingService.name}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Rạp">
                            {viewingService.theater?.name}
                        </Descriptions.Item>
                        <Descriptions.Item label="Địa chỉ rạp">
                            {viewingService.theater?.address}
                        </Descriptions.Item>
                        <Descriptions.Item label="Loại">
                            <Tag color={getServiceTypeColor(viewingService.type)}>
                                {getServiceTypeLabel(viewingService.type)}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getServiceStatusColor(viewingService.status)}>
                                {viewingService.status}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Giá">
                            {viewingService.price?.toLocaleString('vi-VN')} đ
                        </Descriptions.Item>
                        <Descriptions.Item label="Số lượng">
                            {viewingService.quantity}
                        </Descriptions.Item>
                        <Descriptions.Item label="Mô tả" span={2}>
                            {viewingService.description || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                            {formatDate(viewingService.createdAt, 'HH:mm dd/MM/yyyy')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày cập nhật">
                            {formatDate(viewingService.updatedAt, 'HH:mm dd/MM/yyyy')}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default ServiceManagement;
