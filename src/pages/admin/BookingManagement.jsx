import { useEffect, useMemo, useRef, useState } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import { bookingAPI } from '../../apis';
import { formatDate } from '../../utils';

const { Title, Text } = Typography;

const ALL_STATUS_VALUE = 'ALL';
const ALL_YEAR_VALUE = 'ALL';

const BOOKING_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Chờ thanh toán', color: 'gold' },
    { value: 'CONFIRMED', label: 'Đã xác nhận', color: 'green' },
    { value: 'CANCELLED', label: 'Đã hủy', color: 'red' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: 'PENDING', label: 'Đang chờ', color: 'gold' },
    { value: 'COMPLETED', label: 'Thành công', color: 'green' },
    { value: 'FAILED', label: 'Thất bại', color: 'red' },
    { value: 'CANCELLED', label: 'Đã hủy', color: 'default' },
];

const getOptionConfig = (options, value) =>
    options.find((item) => item.value === value) || {
        label: value || '-',
        color: 'default',
    };

const getUserName = (user) => {
    if (!user) return '-';
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || '-';
};

const getMovieTitle = (booking) => booking.showtime?.movie?.title || '-';
const getTheaterName = (booking) => booking.showtime?.screen?.theater?.name || '-';
const getScreenName = (booking) => booking.showtime?.screen?.name || '-';
const getSeatLabel = (seatItem) => {
    const seatNumber = seatItem?.seat?.seatNumber || '-';
    const seatType = seatItem?.seat?.type || '-';
    return `${seatNumber} (${seatType})`;
};

const yearOptions = (() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => currentYear - index);
})();

const BookingManagement = () => {
    const { message } = App.useApp();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewingBooking, setViewingBooking] = useState(null);
    const [status, setStatus] = useState(ALL_STATUS_VALUE);
    const [year, setYear] = useState(ALL_YEAR_VALUE);
    const hasMountedRef = useRef(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0,
    });

    const fetchBookings = async (
        page = pagination.current,
        limit = pagination.pageSize,
        nextStatus = status,
        nextYear = year,
    ) => {
        try {
            setLoading(true);
            const response = await bookingAPI.getBookings({
                page,
                limit,
                status: nextStatus !== ALL_STATUS_VALUE ? nextStatus : undefined,
                year: nextYear !== ALL_YEAR_VALUE ? nextYear : undefined,
                sortBy: 'createdAt:desc',
            });

            setBookings(response.data.data || []);
            setPagination({
                current: response.data.meta?.page || page,
                pageSize: response.data.meta?.limit || limit,
                total: response.data.meta?.totalResults || 0,
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách đặt vé.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(() => fetchBookings(1, 5));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            return;
        }

        void Promise.resolve().then(() => fetchBookings(1, pagination.pageSize, status, year));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status, year]);

    const openDetailModal = async (bookingId) => {
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            setViewingBooking(null);
            const response = await bookingAPI.getBookingById(bookingId);
            setViewingBooking(response.data.data);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải chi tiết đặt vé.');
            console.error(error);
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const bookingSummary = useMemo(() => {
        if (!viewingBooking) return { seatCount: 0, serviceCount: 0 };
        return {
            seatCount: viewingBooking.seats?.length || 0,
            serviceCount: viewingBooking.services?.length || 0,
        };
    }, [viewingBooking]);

    const columns = [
        {
            title: 'Mã đặt vé',
            key: 'bookingId',
            render: (_, record) => (
                <Text copyable={{ text: record.id || record._id }}>
                    {(record.id || record._id || '').slice(-8).toUpperCase()}
                </Text>
            ),
        },
        {
            title: 'Khách hàng',
            dataIndex: 'user',
            key: 'user',
            render: (user) => getUserName(user),
        },
        {
            title: 'Phim',
            key: 'movie',
            render: (_, record) => getMovieTitle(record),
        },
        {
            title: 'Rạp / Phòng',
            key: 'screen',
            render: (_, record) => (
                <span>
                    {getTheaterName(record)} / {getScreenName(record)}
                </span>
            ),
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalPrice',
            key: 'totalPrice',
            render: (value, record) => {
                const statusConfig = getOptionConfig(BOOKING_STATUS_OPTIONS, record.status);
                return (
                    <Tag color={statusConfig.color}>
                        {Number(value || 0).toLocaleString('vi-VN')} đ
                    </Tag>
                );
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
            width: 90,
            render: (_, record) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openDetailModal(record.id || record._id)}
                />
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý đặt vé
                </Title>
                <Button icon={<ReloadOutlined />} onClick={() => fetchBookings(1, pagination.pageSize)}>
                    Tải lại
                </Button>
            </div>

            <Card>
                <div className="mb-4 flex gap-3 flex-wrap">
                    <Select
                        value={status}
                        style={{ width: 220 }}
                        onChange={setStatus}
                        options={[
                            { value: ALL_STATUS_VALUE, label: 'Tất cả trạng thái' },
                            ...BOOKING_STATUS_OPTIONS.map(({ value, label }) => ({ value, label })),
                        ]}
                    />
                    <Select
                        value={year}
                        style={{ width: 180 }}
                        onChange={setYear}
                        options={[
                            { value: ALL_YEAR_VALUE, label: 'Tất cả năm' },
                            ...yearOptions.map((value) => ({ value, label: `Năm ${value}` })),
                        ]}
                    />
                </div>

                <Table
                    columns={columns}
                    dataSource={bookings}
                    loading={loading}
                    rowKey={(record) => record.id || record._id}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        pageSizeOptions: ['5', '10', '20', '50', '100'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
                    }}
                    onChange={(nextPagination) => {
                        fetchBookings(nextPagination.current, nextPagination.pageSize);
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            <Modal
                title="Chi tiết đặt vé"
                open={detailOpen}
                onCancel={() => {
                    if (detailLoading) return;
                    setDetailOpen(false);
                    setViewingBooking(null);
                }}
                footer={null}
                width={900}
                centered
                confirmLoading={detailLoading}
            >
                {detailLoading ? (
                    <div className="py-10 text-center">
                        <Text>Đang tải chi tiết đặt vé...</Text>
                    </div>
                ) : (
                    viewingBooking && (
                        <div className="space-y-4">
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Mã đặt vé">
                                    <Text copyable>{viewingBooking.id || viewingBooking._id}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Trạng thái">
                                    <Tag
                                        color={
                                            getOptionConfig(
                                                BOOKING_STATUS_OPTIONS,
                                                viewingBooking.status,
                                            ).color
                                        }
                                    >
                                        {
                                            getOptionConfig(
                                                BOOKING_STATUS_OPTIONS,
                                                viewingBooking.status,
                                            ).label
                                        }
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Khách hàng">
                                    {getUserName(viewingBooking.user)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Email">
                                    {viewingBooking.user?.email || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số điện thoại">
                                    {viewingBooking.user?.phone || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Thời gian tạo">
                                    {formatDate(viewingBooking.createdAt, 'HH:mm dd/MM/yyyy') || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Phim">
                                    {viewingBooking.showtime?.movie?.title || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Suất chiếu">
                                    {viewingBooking.showtime?.startTime
                                        ? `${formatDate(viewingBooking.showtime.startTime, 'HH:mm dd/MM/yyyy')} - ${formatDate(viewingBooking.showtime.endTime, 'HH:mm')}`
                                        : '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Rạp">
                                    {viewingBooking.showtime?.screen?.theater?.name || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Phòng chiếu">
                                    {viewingBooking.showtime?.screen?.name || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số ghế">
                                    {bookingSummary.seatCount}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số dịch vụ">
                                    {bookingSummary.serviceCount}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tiền ghế">
                                    {Number(viewingBooking.seatTotal || 0).toLocaleString('vi-VN')} đ
                                </Descriptions.Item>
                                <Descriptions.Item label="Tiền dịch vụ">
                                    {Number(viewingBooking.serviceTotal || 0).toLocaleString('vi-VN')} đ
                                </Descriptions.Item>
                                <Descriptions.Item label="Giảm giá">
                                    {Number(viewingBooking.promotionDiscount || 0).toLocaleString(
                                        'vi-VN',
                                    )}{' '}
                                    đ
                                </Descriptions.Item>
                                <Descriptions.Item label="Tổng tiền">
                                    <Text strong>
                                        {Number(viewingBooking.totalPrice || 0).toLocaleString('vi-VN')} đ
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Ghế đã đặt" span={2}>
                                    <Space size={[4, 8]} wrap>
                                        {(viewingBooking.seats || []).map((seatItem, index) => (
                                            <Tag key={`${seatItem.seat?._id || index}-${seatItem.price}`}>
                                                {getSeatLabel(seatItem)} -{' '}
                                                {Number(seatItem.price || 0).toLocaleString('vi-VN')} đ
                                            </Tag>
                                        ))}
                                    </Space>
                                </Descriptions.Item>
                                <Descriptions.Item label="Dịch vụ" span={2}>
                                    {viewingBooking.services?.length ? (
                                        <Space direction="vertical" size="small" className="w-full">
                                            {viewingBooking.services.map((serviceItem, index) => (
                                                <Text key={`${serviceItem.service?._id || index}-${serviceItem.total}`}>
                                                    {serviceItem.service?.name || '-'} x {serviceItem.quantity} ={' '}
                                                    {Number(serviceItem.total || 0).toLocaleString('vi-VN')} đ
                                                </Text>
                                            ))}
                                        </Space>
                                    ) : (
                                        <Text type="secondary">Không có dịch vụ đi kèm</Text>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Thanh toán" span={2}>
                                    {viewingBooking.payments?.length ? (
                                        <Space direction="vertical" size="small" className="w-full">
                                            {viewingBooking.payments.map((payment, index) => {
                                                const paymentConfig = getOptionConfig(
                                                    PAYMENT_STATUS_OPTIONS,
                                                    payment.paymentStatus,
                                                );

                                                return (
                                                    <div
                                                        key={payment.id || payment._id || index}
                                                        className="flex flex-wrap items-center gap-2"
                                                    >
                                                        <Text>{payment.paymentMethod || '-'}</Text>
                                                        <Tag color={paymentConfig.color}>
                                                            {paymentConfig.label}
                                                        </Tag>
                                                        <Text>
                                                            {Number(payment.amount || 0).toLocaleString('vi-VN')} đ
                                                        </Text>
                                                        <Text type="secondary">
                                                            {formatDate(
                                                                payment.createdAt,
                                                                'HH:mm dd/MM/yyyy',
                                                            ) || '-'}
                                                        </Text>
                                                    </div>
                                                );
                                            })}
                                        </Space>
                                    ) : (
                                        <Text type="secondary">Chưa có giao dịch thanh toán</Text>
                                    )}
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    )
                )}
            </Modal>
        </div>
    );
};

export default BookingManagement;
