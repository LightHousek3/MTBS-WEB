import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
    App,
    Button,
    Card,
    DatePicker,
    Descriptions,
    Form,
    Image,
    Input,
    Modal,
    Popconfirm,
    Space,
    Table,
    Typography,
    Upload,
} from 'antd';
import {
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
    SearchOutlined,
    EyeOutlined,
    UploadOutlined,
} from '@ant-design/icons';
import { festivalAPI, cloudinaryAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title, Text } = Typography;
const { Search, TextArea } = Input;

const getFestivalImageUrl = (festival) => festival?.image || festival?.imageUrl || '';

const FestivalManagement = () => {
    const [festivals, setFestivals] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 5, total: 0 });
    const [searchKeyword, setSearchKeyword] = useState('');
    const [editingFestival, setEditingFestival] = useState(null);
    const [viewingFestival, setViewingFestival] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [originalFestivalData, setOriginalFestivalData] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [imageList, setImageList] = useState([]);
    const [previewImage, setPreviewImage] = useState('');
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [uploadedImageAsset, setUploadedImageAsset] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const { message } = App.useApp();

    const hasDuplicateFestivalTitle = (title, ignoreId = null) => {
        const normalizedTitle = title?.trim().toLowerCase();
        if (!normalizedTitle) return false;

        return festivals.some((festival) => festival.id !== ignoreId && (festival.title || '').trim().toLowerCase() === normalizedTitle);
    };

    const normalizeFestivalData = (festival) => ({
        title: festival.title || '',
        image: getFestivalImageUrl(festival),
        content: festival.content || '',
        startTime: festival.startTime ? dayjs(festival.startTime).toISOString() : '',
        endTime: festival.endTime ? dayjs(festival.endTime).toISOString() : '',
    });

    const mapFestivalToFormValues = (festival) => ({
        title: festival.title || '',
        imageUrl: getFestivalImageUrl(festival),
        content: festival.content || '',
        startTime: festival.startTime ? dayjs(festival.startTime) : null,
        endTime: festival.endTime ? dayjs(festival.endTime) : null,
    });

    const buildPayload = (values, imageUrl) => ({
        title: values.title?.trim(),
        image: imageUrl || values.imageUrl?.trim() || uploadedImageAsset?.url || '',
        content: values.content?.trim(),
        startTime: values.startTime?.toISOString(),
        endTime: values.endTime?.toISOString(),
    });

    const uploadFestivalImage = async (file, onProgress) => {
        const response = await cloudinaryAPI.uploadImage(file, 'festivals', onProgress);
        return {
            url: response.data.secure_url,
            publicId: response.data.public_id,
        };
    };

    const resetImageState = () => {
        setImageFile(null);
        setImageList([]);
        setPreviewImage('');
        setImageUploadProgress(0);
        setUploadedImageAsset(null);
    };

    const fetchFestivals = async (page = 1, limit = 5, search = '') => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                ...(search ? { search } : {}),
            };
            const response = await festivalAPI.getFestivals(params);
            const data = response.data.data || [];
            const meta = response.data.meta || {};
            setFestivals(data);
            setPagination({
                current: meta.page || page,
                pageSize: meta.limit || limit,
                total: meta.totalResults || 0,
            });
        } catch (error) {
            message.error('Không thể tải danh sách chương trình khuyến mãi!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFestivals();
    }, []);

    const handleSearch = (value) => {
        setSearchKeyword(value);
        fetchFestivals(1, pagination.pageSize || 5, value);
    };

    const handleView = async (record) => {
        try {
            setLoading(true);
            const response = await festivalAPI.getFestivalById(record.id);
            setViewingFestival(response.data.data);
            setIsViewModalOpen(true);
        } catch (error) {
            message.error('Không thể tải chi tiết chương trình!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (festival) => {
        const normalized = normalizeFestivalData(festival);
        setEditingFestival(festival);
        setOriginalFestivalData(normalized);
        form.setFieldsValue(mapFestivalToFormValues(festival));
        const existingImageUrl = getFestivalImageUrl(festival);
        setImageFile(null);
        setImageUploadProgress(0);
        setUploadedImageAsset(existingImageUrl ? { url: existingImageUrl } : null);
        setPreviewImage(existingImageUrl);
        setImageList(
            existingImageUrl
                ? [
                      {
                          uid: '-1',
                          name: 'festival-image',
                          status: 'done',
                          url: existingImageUrl,
                      },
                  ]
                : [],
        );
        setIsModalVisible(true);
    };

    const handleDeleteFestival = async (id) => {
        try {
            setLoading(true);
            await festivalAPI.deleteFestival(id);
            fetchFestivals(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
            message.success('Xóa chương trình thành công');
        } catch (error) {
            message.error('Lỗi không thể xóa chương trình!');
            console.error(error.response?.data?.message || error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingFestival(null);
        setOriginalFestivalData(null);
        form.resetFields();
        resetImageState();
        setIsModalVisible(true);
    };

    const handleAddFestival = async (values) => {
        try {
            setLoading(true);
            if (!imageFile && !uploadedImageAsset && !values.imageUrl?.trim()) {
                throw new Error('Vui lòng chọn ảnh chương trình hoặc dán URL ảnh');
            }

            const normalizedTitle = values.title?.trim();
            if (hasDuplicateFestivalTitle(normalizedTitle)) {
                message.error('Tiêu đề chương trình đã tồn tại. Vui lòng đổi tên khác.');
                return false;
            }

            let imageAsset = uploadedImageAsset;
            if (imageFile) {
                imageAsset = await uploadFestivalImage(imageFile, setImageUploadProgress);
                setUploadedImageAsset(imageAsset);
            }

            const payload = buildPayload(values, imageAsset?.url);
            await festivalAPI.createFestival(payload);
            message.success('Thêm chương trình thành công');
            return true;
        } catch (error) {
            message.error(error.message || 'Lỗi không thể thêm chương trình!');
            console.error(error.response?.data?.message || error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateFestival = async (values) => {
        try {
            setLoading(true);
            const normalizedTitle = values.title?.trim();
            if (hasDuplicateFestivalTitle(normalizedTitle, editingFestival?.id)) {
                message.error('Tiêu đề chương trình đã tồn tại. Vui lòng đổi tên khác.');
                return false;
            }

            let imageAsset = uploadedImageAsset;
            if (imageFile) {
                imageAsset = await uploadFestivalImage(imageFile, setImageUploadProgress);
                setUploadedImageAsset(imageAsset);
            }

            const payload = buildPayload(values, imageAsset?.url);
            await festivalAPI.updateFestival(editingFestival.id, payload);
            message.success('Cập nhật chương trình thành công');
            return true;
        } catch (error) {
            message.error(error.message || 'Lỗi không thể cập nhật chương trình!');
            console.error(error.response?.data?.message || error.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleModalOk = () => {
        form.validateFields().then(async (values) => {
            if (editingFestival && !hasFormChanged(originalFestivalData, normalizeFestivalData(values)) && !imageFile) {
                message.warning('Không có thay đổi nào để cập nhật!');
                return;
            }

            const success = editingFestival ? await handleUpdateFestival(values) : await handleAddFestival(values);
            if (!success) {
                return;
            }

            setIsModalVisible(false);
            form.resetFields();
            setOriginalFestivalData(null);
            fetchFestivals(pagination.current || 1, pagination.pageSize || 5, searchKeyword);
        });
    };

    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (img, record) => (
                <Image
                    src={img || record?.imageUrl || record?.image || 'https://placehold.co/70x70?text=No+Image'}
                    alt="festival"
                    width={70}
                    preview={false}
                    style={{ borderRadius: 8 }}
                />
            ),
            width: 100,
            fixed: 'left',
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            sorter: (a, b) => a.title.localeCompare(b.title),
        },
        {
            title: 'Ngày bắt đầu',
            dataIndex: 'startTime',
            key: 'startTime',
            width: 180,
            render: (value) => (value ? formatDate(value, 'HH:mm DD/MM/YYYY') : '-'),
            sorter: (a, b) => new Date(a.startTime) - new Date(b.startTime),
        },
        {
            title: 'Ngày kết thúc',
            dataIndex: 'endTime',
            key: 'endTime',
            width: 180,
            render: (value) => (value ? formatDate(value, 'HH:mm DD/MM/YYYY') : '-'),
            sorter: (a, b) => new Date(a.endTime) - new Date(b.endTime),
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
                        title="Bạn có chắc chắn muốn xóa chương trình này?"
                        onConfirm={() => handleDeleteFestival(record.id)}
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
                    Quản lý sự kiện
                </Title>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-primary">
                    Thêm chương trình
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
                    dataSource={festivals}
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
                            fetchFestivals(nextPage, nextSize, searchKeyword);
                        }
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title={editingFestival ? 'Chỉnh sửa chương trình' : 'Thêm chương trình mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => setIsModalVisible(false)}
                okText={editingFestival ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={isModalVisible && loading}
                centered
                width={640}
            >
                <Form form={form} layout="vertical" name="festivalForm">
                    <Form.Item
                        name="title"
                        label="Tiêu đề"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
                    >
                        <Input placeholder="Nhập tiêu đề sự kiện" />
                    </Form.Item>

                    <Form.Item name="imageUrl" label="Hoặc dán URL ảnh" rules={[{ type: 'url', message: 'URL ảnh không hợp lệ!' }]}>
                        <Input placeholder="Ví dụ: https://images.unsplash.com/...." />
                    </Form.Item>

                    <Form.Item label="Ảnh chương trình">
                        <Upload
                            accept="image/*"
                            maxCount={1}
                            listType="picture"
                            showUploadList={false}
                            disabled={loading}
                            fileList={imageList}
                            beforeUpload={(file) => {
                                if (loading) return Upload.LIST_IGNORE;
                                setImageFile(file);
                                setImageUploadProgress(0);
                                setUploadedImageAsset(null);
                                const preview = URL.createObjectURL(file);
                                setPreviewImage(preview);
                                setImageList([
                                    {
                                        uid: file.uid,
                                        name: file.name,
                                        status: 'done',
                                        url: preview,
                                    },
                                ]);
                                return false;
                            }}
                            onRemove={() => {
                                if (loading) return false;
                                setImageFile(null);
                                setImageUploadProgress(0);
                                setUploadedImageAsset(null);
                                setImageList([]);
                                setPreviewImage('');
                                return true;
                            }}
                        >
                            <Button icon={<UploadOutlined />}>
                                {imageList.length > 0 ? 'Chọn lại ảnh' : 'Chọn ảnh từ máy'}
                            </Button>
                        </Upload>
                        <div style={{ marginTop: 8 }}>
                            <small>Chọn ảnh chương trình từ máy để upload lên Cloudinary.</small>
                        </div>
                        {imageUploadProgress > 0 && imageUploadProgress < 100 && (
                            <div style={{ marginTop: 8 }}>
                                Đang upload: {imageUploadProgress}%
                            </div>
                        )}
                        {previewImage && (
                            <div style={{ marginTop: 16 }}>
                                <img
                                    src={previewImage}
                                    alt="preview"
                                    width={280}
                                    style={{ borderRadius: 12, objectFit: 'cover' }}
                                />
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item
                        name="content"
                        label="Nội dung"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung!' }]}
                    >
                        <TextArea rows={4} placeholder="Mô tả chương trình" />
                    </Form.Item>

                    <Form.Item
                        name="startTime"
                        label="Thời gian bắt đầu"
                        rules={[{ required: true, message: 'Vui lòng chọn thời gian bắt đầu!' }]}
                    >
                        <DatePicker showTime className="w-full" format="HH:mm DD/MM/YYYY" />
                    </Form.Item>

                    <Form.Item
                        name="endTime"
                        label="Thời gian kết thúc"
                        dependencies={['startTime']}
                        rules={[
                            { required: true, message: 'Vui lòng chọn thời gian kết thúc!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const startTime = getFieldValue('startTime');
                                    if (!value || !startTime) {
                                        return Promise.resolve();
                                    }

                                    if (dayjs(value).isAfter(dayjs(startTime))) {
                                        return Promise.resolve();
                                    }

                                    return Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
                                },
                            }),
                        ]}
                    >
                        <DatePicker showTime className="w-full" format="HH:mm DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={<Title level={4}>Chi tiết chương trình</Title>}
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
                {viewingFestival && (
                    <div className="space-y-4! max-h-125! overflow-y-auto! rounded-lg!">
                        <Descriptions bordered column={2}>
                            <Descriptions.Item label="Tiêu đề" span={2}>
                                <Text strong>{viewingFestival.title}</Text>
                            </Descriptions.Item>

                            <Descriptions.Item label="Ảnh" span={2}>
                                <Image
                                    src={viewingFestival.image || viewingFestival.imageUrl || 'https://placehold.co/120x120?text=No+Image'}
                                    alt={viewingFestival.title}
                                    width={120}
                                    height={120}
                                    style={{ objectFit: 'cover', borderRadius: 12 }}
                                    preview={false}
                                />
                            </Descriptions.Item>

                            <Descriptions.Item label="Nội dung" span={2}>
                                <Text>{viewingFestival.content}</Text>
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian bắt đầu">
                                {viewingFestival.startTime ? formatDate(viewingFestival.startTime, 'HH:mm DD/MM/YYYY') : '-' }
                            </Descriptions.Item>

                            <Descriptions.Item label="Thời gian kết thúc">
                                {viewingFestival.endTime ? formatDate(viewingFestival.endTime, 'HH:mm DD/MM/YYYY') : '-' }
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày tạo">
                                {viewingFestival.createdAt ? formatDate(viewingFestival.createdAt, 'HH:mm DD/MM/YYYY') : '-' }
                            </Descriptions.Item>

                            <Descriptions.Item label="Ngày cập nhật">
                                {viewingFestival.updatedAt ? formatDate(viewingFestival.updatedAt, 'HH:mm DD/MM/YYYY') : '-' }
                            </Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default FestivalManagement;
