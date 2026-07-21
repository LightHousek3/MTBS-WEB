import { useEffect, useRef, useState } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    EyeOutlined,
    ReloadOutlined,
    StarFilled,
} from '@ant-design/icons';
import { reviewAPI } from '../../apis';
import { formatDate } from '../../utils';

const { Title, Text, Paragraph } = Typography;

const ALL_VALUE = 'ALL';

const REVIEW_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Chờ duyệt', color: 'gold' },
    { value: 'APPROVED', label: 'Đã duyệt', color: 'green' },
    { value: 'REJECTED', label: 'Từ chối', color: 'red' },
];

const getStatusConfig = (value) =>
    REVIEW_STATUS_OPTIONS.find((o) => o.value === value) || {
        label: value || '-',
        color: 'default',
    };

const getUserName = (user) => {
    if (!user) return '-';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '-';
};

const ReviewManagement = () => {
    const { message, modal } = App.useApp();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewingReview, setViewingReview] = useState(null);
    const [status, setStatus] = useState(ALL_VALUE);
    const hasMountedRef = useRef(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const fetchReviews = async (
        page = pagination.current,
        limit = pagination.pageSize,
        nextStatus = status,
    ) => {
        try {
            setLoading(true);
            const response = await reviewAPI.getReviews({
                page,
                limit,
                status: nextStatus !== ALL_VALUE ? nextStatus : undefined,
                sortBy: 'createdAt:desc',
                populate: 'user,movie',
            });
            setReviews(response.data.data || []);
            setPagination({
                current: response.data.meta?.page || page,
                pageSize: response.data.meta?.limit || limit,
                total: response.data.meta?.totalResults || 0,
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách đánh giá.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(() => fetchReviews(1, 10));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }
        void Promise.resolve().then(() => fetchReviews(1, pagination.pageSize, status));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            setActionLoadingId(id);
            await reviewAPI.updateReviewStatus(id, newStatus);
            const label = getStatusConfig(newStatus).label;
            message.success(`Đã cập nhật trạng thái thành "${label}"`);
            // Update local state
            setReviews((prev) =>
                prev.map((r) => (r.id === id || r._id === id ? { ...r, status: newStatus } : r)),
            );
            if (viewingReview && (viewingReview.id === id || viewingReview._id === id)) {
                setViewingReview((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Cập nhật trạng thái thất bại.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleDelete = async (id) => {
        try {
            setActionLoadingId(id);
            await reviewAPI.deleteReview(id);
            message.success('Đã xóa đánh giá thành công.');
            setReviews((prev) => prev.filter((r) => r.id !== id && r._id !== id));
            setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
            if (viewingReview && (viewingReview.id === id || viewingReview._id === id)) {
                setDetailOpen(false);
                setViewingReview(null);
            }
        } catch (error) {
            message.error(error.response?.data?.message || 'Xóa đánh giá thất bại.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const columns = [
        {
            title: 'Người dùng',
            key: 'user',
            render: (_, record) => getUserName(record.user),
        },
        {
            title: 'Phim',
            key: 'movie',
            render: (_, record) => record.movie?.title || '-',
            ellipsis: true,
        },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            width: 100,
            render: (value) => (
                <Space size={4}>
                    <StarFilled style={{ color: '#fadb14' }} />
                    <Text strong>{value}/10</Text>
                </Space>
            ),
        },
        {
            title: 'Nội dung',
            dataIndex: 'content',
            key: 'content',
            ellipsis: true,
            render: (value) =>
                value ? (
                    <Tooltip title={value}>
                        <Text>{value.length > 60 ? value.slice(0, 60) + '...' : value}</Text>
                    </Tooltip>
                ) : (
                    <Text type="secondary">Không có nội dung</Text>
                ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (value) => {
                const cfg = getStatusConfig(value);
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 150,
            render: (value) => formatDate(value, 'HH:mm dd/MM/yyyy'),
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 160,
            render: (_, record) => {
                const id = record.id || record._id;
                const isLoading = actionLoadingId === id;
                return (
                    <Space size={4}>
                        <Tooltip title="Xem chi tiết">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => {
                                    setViewingReview(record);
                                    setDetailOpen(true);
                                }}
                            />
                        </Tooltip>
                        {record.status !== 'APPROVED' && (
                            <Tooltip title="Duyệt">
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={isLoading}
                                    onClick={() => handleUpdateStatus(id, 'APPROVED')}
                                />
                            </Tooltip>
                        )}
                        {record.status !== 'REJECTED' && record.status !== 'APPROVED' && (
                            <Tooltip title="Từ chối">
                                <Button
                                    size="small"
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    loading={isLoading}
                                    onClick={() => handleUpdateStatus(id, 'REJECTED')}
                                />
                            </Tooltip>
                        )}
                        <Popconfirm
                            title="Xóa đánh giá"
                            description="Bạn có chắc muốn xóa đánh giá này không?"
                            onConfirm={() => handleDelete(id)}
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                        >
                            <Tooltip title="Xóa">
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={isLoading}
                                />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý đánh giá
                </Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchReviews(1, pagination.pageSize)}
                >
                    Tải lại
                </Button>
            </div>

            <Card>
                <div className="mb-4 flex gap-3 flex-wrap">
                    <Select
                        value={status}
                        style={{ width: 200 }}
                        onChange={setStatus}
                        options={[
                            { value: ALL_VALUE, label: 'Tất cả trạng thái' },
                            ...REVIEW_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
                        ]}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={reviews}
                    loading={loading}
                    rowKey={(record) => record.id || record._id}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đánh giá`,
                    }}
                    onChange={(nextPagination) => {
                        fetchReviews(nextPagination.current, nextPagination.pageSize);
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            {/* Detail Modal */}
            <Modal
                title="Chi tiết đánh giá"
                open={detailOpen}
                onCancel={() => {
                    setDetailOpen(false);
                    setViewingReview(null);
                }}
                footer={
                    viewingReview && (
                        <Space>
                            {viewingReview.status !== 'APPROVED' && (
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    loading={actionLoadingId === (viewingReview.id || viewingReview._id)}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            viewingReview.id || viewingReview._id,
                                            'APPROVED',
                                        )
                                    }
                                >
                                    Duyệt
                                </Button>
                            )}
                            {viewingReview.status !== 'REJECTED' && viewingReview.status !== 'APPROVED' && (
                                <Button
                                    danger
                                    icon={<CloseCircleOutlined />}
                                    loading={actionLoadingId === (viewingReview.id || viewingReview._id)}
                                    onClick={() =>
                                        handleUpdateStatus(
                                            viewingReview.id || viewingReview._id,
                                            'REJECTED',
                                        )
                                    }
                                >
                                    Từ chối
                                </Button>
                            )}
                            <Popconfirm
                                title="Xác nhận xóa"
                                description="Bạn có chắc muốn xóa đánh giá này không?"
                                onConfirm={() =>
                                    handleDelete(viewingReview.id || viewingReview._id)
                                }
                                okText="Xóa"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    loading={actionLoadingId === (viewingReview.id || viewingReview._id)}
                                >
                                    Xóa
                                </Button>
                            </Popconfirm>
                            <Button onClick={() => setDetailOpen(false)}>Đóng</Button>
                        </Space>
                    )
                }
                width={700}
                centered
            >
                {viewingReview && (
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Người dùng">
                            {getUserName(viewingReview.user)}
                        </Descriptions.Item>
                        <Descriptions.Item label="Email">
                            {viewingReview.user?.email || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Phim" span={2}>
                            {viewingReview.movie?.title || '-'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Rating">
                            <Space size={4}>
                                <StarFilled style={{ color: '#fadb14', fontSize: 16 }} />
                                <Text strong>{viewingReview.rating}/10</Text>
                            </Space>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                            <Tag color={getStatusConfig(viewingReview.status).color}>
                                {getStatusConfig(viewingReview.status).label}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Điểm rủi ro (AI)">
                            <Tag color={viewingReview.riskScore >= 70 ? 'red' : viewingReview.riskScore >= 40 ? 'orange' : 'green'}>
                                {viewingReview.riskScore ?? '-'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                            {formatDate(viewingReview.createdAt, 'HH:mm dd/MM/yyyy') || '-'}
                        </Descriptions.Item>
                        {viewingReview.aiScores && (
                            <Descriptions.Item label="Điểm AI" span={2}>
                                <Space wrap>
                                    <Tag>Độc hại: {viewingReview.aiScores.toxicity ?? '-'}</Tag>
                                    <Tag>Xúc phạm: {viewingReview.aiScores.insult ?? '-'}</Tag>
                                    <Tag>Thô tục: {viewingReview.aiScores.profanity ?? '-'}</Tag>
                                    <Tag>Spam: {viewingReview.aiScores.spam ?? '-'}</Tag>
                                </Space>
                            </Descriptions.Item>
                        )}
                        <Descriptions.Item label="Nội dung" span={2}>
                            {viewingReview.content ? (
                                <Paragraph style={{ margin: 0 }}>{viewingReview.content}</Paragraph>
                            ) : (
                                <Text type="secondary">Không có nội dung</Text>
                            )}
                        </Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </div>
    );
};

export default ReviewManagement;
