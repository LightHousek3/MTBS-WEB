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
    Upload,
} from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, EyeOutlined, UploadOutlined } from '@ant-design/icons';
import { bannerAPI, cloudinaryAPI } from '../../apis';
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
    const [bannerFile, setBannerFile] = useState(null);
    const [bannerList, setBannerList] = useState([]);
    const [previewBanner, setPreviewBanner] = useState('');
    const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
    const [uploadedBannerAsset, setUploadedBannerAsset] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const getBannerTypeLabel = (type) => bannerTypes.find((item) => item.value === type)?.label || type;
    const getBannerTypeColor = (type) => bannerTypes.find((item) => item.value === type)?.color || 'default';

    const normalizeBannerData = (banner) => ({
        type: banner.type || '',
    });

    const buildPayload = (values) => ({
        type: values.type,
    });

    const uploadBannerAsset = async (file, type, onProgress) => {
        const resourceType = type === 'VIDEO' ? 'video' : 'image';
        const response = await cloudinaryAPI.upload(file, {
            resourceType,
            folder: 'banners',
            onProgress,
        });

        return {
            url: response.data.secure_url,
            publicId: response.data.public_id,
        };
    };

    const resetBannerState = () => {
        setBannerFile(null);
        setBannerList([]);
        setPreviewBanner('');
        setBannerUploadProgress(0);
        setUploadedBannerAsset(null);
    };

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
        });
        setBannerFile(null);
        setBannerUploadProgress(0);
        setUploadedBannerAsset(banner.url ? { url: banner.url } : null);
        setPreviewBanner(banner.url || '');
        setBannerList(
            banner.url
                ? [
                      {
                          uid: '-1',
                          name: 'banner',
                          status: 'done',
                          url: banner.url,
                      },
                  ]
                : [],
        );
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
        resetBannerState();
        setIsModalVisible(true);
    };

    const handleSaveBanner = async (values) => {
        try {
            setLoading(true);
            let payload = buildPayload(values);

            if (!bannerFile) {
                throw new Error('Vui lòng chọn tệp banner từ máy!');
            }

            const asset =
                uploadedBannerAsset ||
                (await uploadBannerAsset(bannerFile, values.type, setBannerUploadProgress));
            setUploadedBannerAsset(asset);
            payload.url = asset.url;

            if (editingBanner) {
                await bannerAPI.updateBanner(editingBanner.id, payload);
                message.success('Cập nhật banner thành công');
            } else {
                await bannerAPI.createBanner(payload);
                message.success('Thêm banner thành công');
            }
        } catch (error) {
            if (error.message) {
                message.error(error.message);
            } else {
                message.error('Lỗi không thể lưu banner!');
            }
            console.error(error.response?.data?.message || error.message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            try {
                const payload = normalizeBannerData(values);
                const hasBannerChanges = bannerFile !== null;

                if (
                    editingBanner &&
                    !hasFormChanged(originalBannerData, payload) &&
                    !hasBannerChanges
                ) {
                    message.warning('Không có thay đổi nào để cập nhật!');
                    return;
                }

                await handleSaveBanner(values);
                setIsModalVisible(false);
                form.resetFields();
                setOriginalBannerData(null);
                resetBannerState();
                fetchBanners(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
            } catch (error) {
                // error already handled in handleSaveBanner
            }
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
                onCancel={() => {
                    setIsModalVisible(false);
                    resetBannerState();
                }}
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
                        <Select
                            placeholder="Chọn loại banner"
                            onChange={() => {
                                setBannerFile(null);
                                setBannerList([]);
                                setPreviewBanner('');
                                setUploadedBannerAsset(null);
                                setBannerUploadProgress(0);
                            }}
                        >
                            {bannerTypes.map((item) => (
                                <Option key={item.value} value={item.value}>
                                    {item.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Tệp banner">
                        <Upload
                            accept={form.getFieldValue('type') === 'VIDEO' ? 'video/*' : 'image/*'}
                            maxCount={1}
                            listType={form.getFieldValue('type') === 'VIDEO' ? 'text' : 'picture'}
                            disabled={loading}
                            fileList={bannerList}
                            beforeUpload={(file) => {
                                if (loading) {
                                    return Upload.LIST_IGNORE;
                                }
                                setBannerFile(file);
                                setBannerUploadProgress(0);
                                setUploadedBannerAsset(null);
                                const previewUrl = URL.createObjectURL(file);
                                setPreviewBanner(previewUrl);
                                setBannerList([
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
                                setBannerFile(null);
                                setBannerUploadProgress(0);
                                setUploadedBannerAsset(null);
                                setBannerList([]);
                                setPreviewBanner('');
                                return true;
                            }}
                        >
                            <Button icon={<UploadOutlined />}>
                                {bannerList.length > 0 ? 'Chọn lại tệp' : 'Chọn tệp từ máy'}
                            </Button>
                        </Upload>
                        <div style={{ marginTop: 8 }}>
                            <small>
                                Chọn file banner từ máy và upload trực tiếp.
                            </small>
                        </div>
                        {bannerUploadProgress > 0 && bannerUploadProgress < 100 && (
                            <div style={{ marginTop: 8 }}>
                                Đang upload: {bannerUploadProgress}%
                            </div>
                        )}
                        {previewBanner && (
                            <div style={{ marginTop: 16 }}>
                                {form.getFieldValue('type') === 'VIDEO' ? (
                                    <video
                                        src={previewBanner}
                                        controls
                                        style={{ width: '100%', maxHeight: 240, borderRadius: 12 }}
                                    />
                                ) : (
                                    <Image
                                        src={previewBanner}
                                        alt="Preview"
                                        width={280}
                                        style={{ borderRadius: 12 }}
                                    />
                                )}
                            </div>
                        )}
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
