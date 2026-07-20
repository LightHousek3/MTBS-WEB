import { useEffect, useMemo, useState } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
} from 'antd';
import { CheckOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { refundRequestAPI } from '../../apis';
import { formatDate } from '../../utils';

const { Title, Text, Paragraph } = Typography;
const ALL_STATUS_VALUE = 'ALL';

const STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Chờ xử lý', color: 'gold' },
    { value: 'APPROVED', label: 'Đã hoàn tiền', color: 'green' },
    { value: 'REJECTED', label: 'Đã từ chối', color: 'red' },
    { value: 'CANCELLED', label: 'Khách đã hủy', color: 'default' },
];

const PROCESS_STATUS_OPTIONS = [
    { value: 'APPROVED', label: 'Duyệt hoàn tiền' },
    { value: 'REJECTED', label: 'Từ chối' },
];

const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const statusConfig = (status) =>
    STATUS_OPTIONS.find((item) => item.value === status) || { label: status || '-', color: 'default' };
const getUserName = (user) => {
    if (!user) return '-';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '-';
};

const RefundRequestManagement = () => {
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [refundRequests, setRefundRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [processOpen, setProcessOpen] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [status, setStatus] = useState(ALL_STATUS_VALUE);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const fetchRefundRequests = async (
        page = pagination.current,
        limit = pagination.pageSize,
        nextStatus = status,
    ) => {
        try {
            setLoading(true);
            const response = await refundRequestAPI.getRefundRequests({
                page,
                limit,
                status: nextStatus !== ALL_STATUS_VALUE ? nextStatus : undefined,
                sortBy: 'createdAt:desc',
            });
            setRefundRequests(response.data.data || []);
            setPagination({
                current: response.data.meta?.page || page,
                pageSize: response.data.meta?.limit || limit,
                total: response.data.meta?.totalResults || 0,
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải yêu cầu hoàn tiền.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchRefundRequests(1, pagination.pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const openDetail = async (id) => {
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            const response = await refundRequestAPI.getRefundRequestById(id);
            setSelectedRefund(response.data.data);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải chi tiết hoàn tiền.');
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const openProcess = (record) => {
        setSelectedRefund(record);
        form.setFieldsValue({
            status: 'APPROVED',
            response: '',
            simulateSuccess: true,
        });
        setProcessOpen(true);
    };

    const handleProcess = async () => {
        try {
            const values = await form.validateFields();
            await refundRequestAPI.processRefundRequest(selectedRefund.id || selectedRefund._id, values);
            message.success('Xử lý yêu cầu hoàn tiền thành công.');
            setProcessOpen(false);
            await fetchRefundRequests(pagination.current, pagination.pageSize);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể xử lý yêu cầu hoàn tiền.');
        }
    };

    const columns = useMemo(
        () => [
            {
                title: 'Mã yêu cầu',
                key: 'id',
                render: (_, record) => (
                    <Text copyable={{ text: record.id || record._id }}>
                        {(record.id || record._id || '').slice(-8).toUpperCase()}
                    </Text>
                ),
            },
            {
                title: 'Khách hàng',
                key: 'user',
                render: (_, record) => getUserName(record.userId),
            },
            {
                title: 'Phim',
                key: 'movie',
                render: (_, record) => record.bookingId?.showtime?.movie?.title || '-',
            },
            {
                title: 'Suất chiếu',
                key: 'showtime',
                render: (_, record) =>
                    record.bookingId?.showtime?.startTime
                        ? formatDate(record.bookingId.showtime.startTime, 'HH:mm dd/MM/yyyy')
                        : '-',
            },
            {
                title: 'Số tiền',
                dataIndex: 'refundAmount',
                key: 'refundAmount',
                render: money,
            },
            {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (value) => {
                    const config = statusConfig(value);
                    return <Tag color={config.color}>{config.label}</Tag>;
                },
            },
            {
                title: 'Ngày tạo',
                dataIndex: 'createdAt',
                key: 'createdAt',
                render: (value) => formatDate(value, 'HH:mm dd/MM/yyyy'),
            },
            {
                title: 'Thao tác',
                key: 'action',
                width: 130,
                render: (_, record) => (
                    <Space>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => openDetail(record.id || record._id)}
                        />
                        {record.status === 'PENDING' && (
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => openProcess(record)}
                            />
                        )}
                    </Space>
                ),
            },
        ],
        [],
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý hoàn tiền
                </Title>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchRefundRequests(1, pagination.pageSize)}
                >
                    Tải lại
                </Button>
            </div>

            <Card>
                <div className="mb-4">
                    <Select
                        value={status}
                        style={{ width: 220 }}
                        onChange={setStatus}
                        options={[
                            { value: ALL_STATUS_VALUE, label: 'Tất cả trạng thái' },
                            ...STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
                        ]}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={refundRequests}
                    loading={loading}
                    rowKey={(record) => record.id || record._id}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '20', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
                    }}
                    onChange={(nextPagination) => {
                        fetchRefundRequests(nextPagination.current, nextPagination.pageSize);
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title="Chi tiết yêu cầu hoàn tiền"
                open={detailOpen}
                onCancel={() => {
                    setDetailOpen(false);
                    setSelectedRefund(null);
                }}
                footer={null}
                width={820}
                centered
            >
                {detailLoading ? (
                    <div className="py-10 text-center">
                        <Text>Đang tải chi tiết...</Text>
                    </div>
                ) : (
                    selectedRefund && (
                        <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label="Mã yêu cầu" span={2}>
                                <Text copyable>{selectedRefund.id || selectedRefund._id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={statusConfig(selectedRefund.status).color}>
                                    {statusConfig(selectedRefund.status).label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Số tiền">
                                <Text strong>{money(selectedRefund.refundAmount)}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Khách hàng">
                                {getUserName(selectedRefund.userId)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Email">
                                {selectedRefund.userId?.email || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Phim">
                                {selectedRefund.bookingId?.showtime?.movie?.title || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Suất chiếu">
                                {selectedRefund.bookingId?.showtime?.startTime
                                    ? formatDate(
                                          selectedRefund.bookingId.showtime.startTime,
                                          'HH:mm dd/MM/yyyy',
                                      )
                                    : '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Lý do" span={2}>
                                <Paragraph style={{ marginBottom: 0 }}>
                                    {selectedRefund.reason}
                                </Paragraph>
                            </Descriptions.Item>
                            <Descriptions.Item label="Phản hồi" span={2}>
                                <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                                    {selectedRefund.response || '-'}
                                </Paragraph>
                            </Descriptions.Item>
                            <Descriptions.Item label="Người xử lý">
                                {getUserName(selectedRefund.processedBy)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Thời gian hoàn">
                                {selectedRefund.refundedAt
                                    ? formatDate(selectedRefund.refundedAt, 'HH:mm dd/MM/yyyy')
                                    : '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    )
                )}
            </Modal>

            <Modal
                title="Xử lý yêu cầu hoàn tiền"
                open={processOpen}
                onCancel={() => setProcessOpen(false)}
                onOk={handleProcess}
                okText="Xác nhận"
                cancelText="Hủy"
                centered
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="status" label="Kết quả xử lý" rules={[{ required: true }]}>
                        <Select options={PROCESS_STATUS_OPTIONS} />
                    </Form.Item>
                    <Form.Item
                        shouldUpdate={(prev, next) => prev.status !== next.status}
                        noStyle
                    >
                        {({ getFieldValue }) =>
                            getFieldValue('status') === 'APPROVED' && (
                                <Form.Item
                                    name="simulateSuccess"
                                    label="VNPay giả lập thành công"
                                    valuePropName="checked"
                                >
                                    <Switch />
                                </Form.Item>
                            )
                        }
                    </Form.Item>
                    <Form.Item name="response" label="Ghi chú xử lý">
                        <Input.TextArea rows={4} maxLength={2000} showCount />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RefundRequestManagement;
