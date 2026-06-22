import { useEffect, useState } from 'react';
import {
    App,
    Button,
    Card,
    Descriptions,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { screenAPI, seatAPI } from '../../apis';
import { formatDate, hasFormChanged } from '../../utils';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ALL_SCREEN_VALUE = 'ALL';

const SEAT_TYPE_OPTIONS = [
    { value: 'STANDARD', label: 'Ghế thường', color: 'blue' },
    { value: 'VIP', label: 'Ghế VIP', color: 'gold' },
    { value: 'SWEETBOX', label: 'Ghế Sweetbox', color: 'magenta' },
];

const SEAT_STATUS_OPTIONS = [
    { value: 'AVAILABLE', label: 'Khả dụng', color: 'green' },
    { value: 'UNAVAILABLE', label: 'Không khả dụng', color: 'red' },
];

const getOptionConfig = (options, value) =>
    options.find((item) => item.value === value) || {
        label: value || '-',
        color: 'default',
    };

const getId = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value.id || value._id || '';
};

const normalizeSeatValues = (values) => ({
    seatNumber: values.seatNumber?.trim() || '',
    type: values.type,
    status: values.status,
});

const expandSeatRange = (token) => {
    const compactToken = token.replace(/\s+/g, '');
    const rangeMatch = compactToken.match(/^([A-Za-z]+)(\d+)-([A-Za-z]+)(\d+)$/);

    if (!rangeMatch) {
        return null;
    }

    const [, startPrefix, startNumberRaw, endPrefix, endNumberRaw] = rangeMatch;
    const normalizedStartPrefix = startPrefix.toUpperCase();
    const normalizedEndPrefix = endPrefix.toUpperCase();
    const startNumber = Number(startNumberRaw);
    const endNumber = Number(endNumberRaw);

    if (normalizedStartPrefix !== normalizedEndPrefix || startNumber > endNumber) {
        return { error: token };
    }

    const seats = [];
    for (let number = startNumber; number <= endNumber; number += 1) {
        seats.push(`${normalizedStartPrefix}${number}`);
    }

    return { seats };
};

const parseBulkSeatInput = (input = '') => {
    const rawSegments = input
        .split(/[\n,;]+/)
        .map((segment) => segment.trim())
        .filter(Boolean);

    const seatNumbers = [];
    const invalidTokens = [];
    const seen = new Set();

    rawSegments.forEach((segment) => {
        const normalizedSegment = segment.trim();

        if (normalizedSegment.includes('-')) {
            const expandedRange = expandSeatRange(normalizedSegment);
            if (!expandedRange?.seats) {
                invalidTokens.push(normalizedSegment);
                return;
            }

            expandedRange.seats.forEach((seat) => {
                if (!seen.has(seat)) {
                    seen.add(seat);
                    seatNumbers.push(seat);
                }
            });
            return;
        }

        normalizedSegment
            .split(/\s+/)
            .filter(Boolean)
            .forEach((token) => {
                const normalizedToken = token.toUpperCase();
                if (!/^[A-Z]+\d+$/.test(normalizedToken)) {
                    invalidTokens.push(token);
                    return;
                }

                if (!seen.has(normalizedToken)) {
                    seen.add(normalizedToken);
                    seatNumbers.push(normalizedToken);
                }
            });
    });

    return {
        seatNumbers,
        invalidTokens,
    };
};

const SeatManagement = () => {
    const [form] = Form.useForm();
    const [bulkCreateForm] = Form.useForm();
    const [bulkUpdateForm] = Form.useForm();
    const { message } = App.useApp();
    const [screens, setScreens] = useState([]);
    const [seats, setSeats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lookupLoading, setLookupLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
    const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [viewingSeat, setViewingSeat] = useState(null);
    const [editingSeat, setEditingSeat] = useState(null);
    const [originalSeatData, setOriginalSeatData] = useState(null);
    const [screenFilter, setScreenFilter] = useState(ALL_SCREEN_VALUE);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedRows, setSelectedRows] = useState([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0,
    });
    const bulkSeatInput = Form.useWatch('seatNumbers', bulkCreateForm);
    const bulkSeatPreview = parseBulkSeatInput(bulkSeatInput);

    const screenOptions = screens.map((screen) => ({
        value: screen.id || screen._id,
        label: `${screen.name} - ${screen.theater?.name || 'Chưa có rạp'}`,
    }));

    const getScreenById = (screenId) =>
        screens.find((screen) => getId(screen) === getId(screenId));

    const clearSelection = () => {
        setSelectedRowKeys([]);
        setSelectedRows([]);
    };

    const applySeatResponse = (response, page, limit) => {
        setSeats(response.data.data || []);
        setPagination({
            current: response.data.meta?.page || page,
            pageSize: response.data.meta?.limit || limit,
            total: response.data.meta?.totalResults || 0,
        });
        clearSelection();
    };

    const fetchSeats = async (
        page = pagination.current,
        limit = pagination.pageSize,
        nextScreenFilter = screenFilter,
    ) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                sortBy: 'seatNumber:asc',
            };

            if (nextScreenFilter && nextScreenFilter !== ALL_SCREEN_VALUE) {
                params.screenId = nextScreenFilter;
            }

            const response = await seatAPI.getSeats(params);
            applySeatResponse(response, page, limit);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải danh sách ghế.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let isMounted = true;

        const loadInitialData = async () => {
            try {
                const [screenResponse, seatResponse] = await Promise.all([
                    screenAPI.getScreens(),
                    seatAPI.getSeats({
                        page: 1,
                        limit: 5,
                        sortBy: 'seatNumber:asc',
                    }),
                ]);

                if (!isMounted) return;
                setScreens(screenResponse.data.data || []);
                applySeatResponse(seatResponse, 1, 5);
            } catch (error) {
                if (!isMounted) return;
                message.error(error.response?.data?.message || 'Không thể tải dữ liệu ghế.');
                console.error(error);
            } finally {
                if (isMounted) {
                    setLookupLoading(false);
                    setLoading(false);
                }
            }
        };

        void loadInitialData();

        return () => {
            isMounted = false;
        };
    }, [message]);

    const openCreateModal = () => {
        setEditingSeat(null);
        setOriginalSeatData(null);
        form.resetFields();
        form.setFieldsValue({ status: 'AVAILABLE', type: 'STANDARD' });
        setModalOpen(true);
    };

    const openEditModal = (seat) => {
        const values = {
            screenId: getId(seat.screenId),
            seatNumber: seat.seatNumber,
            type: seat.type,
            status: seat.status,
        };

        setEditingSeat(seat);
        setOriginalSeatData(normalizeSeatValues(values));
        form.setFieldsValue(values);
        setModalOpen(true);
    };

    const openDetailModal = async (seat) => {
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            setViewingSeat(null);
            const response = await seatAPI.getSeatById(seat.id || seat._id);
            setViewingSeat(response.data.data);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải chi tiết ghế.');
            console.error(error);
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const payload = {
                screenId: values.screenId,
                seatNumber: values.seatNumber.trim(),
                type: values.type,
                status: values.status,
            };

            if (editingSeat && !hasFormChanged(originalSeatData, normalizeSeatValues(payload))) {
                message.warning('Không có thay đổi nào để cập nhật.');
                return;
            }

            setLoading(true);
            if (editingSeat) {
                await seatAPI.updateSeat(editingSeat.id, {
                    seatNumber: payload.seatNumber,
                    type: payload.type,
                    status: payload.status,
                });
                message.success('Cập nhật ghế thành công.');
            } else {
                await seatAPI.createSeat(payload);
                message.success('Thêm ghế thành công.');
            }

            setModalOpen(false);
            form.resetFields();
            fetchSeats(pagination.current, pagination.pageSize);
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.response?.data?.message || 'Không thể lưu ghế.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (seat) => {
        try {
            setLoading(true);
            await seatAPI.deleteSeat(seat.id || seat._id);
            message.success('Xóa ghế thành công.');
            const nextPage =
                pagination.current > 1 && seats.length === 1
                    ? pagination.current - 1
                    : pagination.current;
            fetchSeats(nextPage, pagination.pageSize);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể xóa ghế.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (seat) => {
        const nextStatus = seat.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';

        try {
            setLoading(true);
            await seatAPI.updateSeatStatus(seat.id || seat._id, nextStatus);
            message.success('Cập nhật trạng thái ghế thành công.');
            fetchSeats(pagination.current, pagination.pageSize);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể cập nhật trạng thái ghế.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const ensureSameScreenSelection = () => {
        if (!selectedRows.length) {
            message.warning('Vui lòng chọn ít nhất một ghế.');
            return null;
        }

        const firstScreenId = getId(selectedRows[0].screenId);
        const isSameScreen = selectedRows.every((row) => getId(row.screenId) === firstScreenId);

        if (!isSameScreen) {
            message.warning('Chỉ có thể thao tác hàng loạt với các ghế cùng một phòng chiếu.');
            return null;
        }

        return firstScreenId;
    };

    const handleBulkCreate = async () => {
        try {
            const values = await bulkCreateForm.validateFields();
            const { seatNumbers, invalidTokens } = parseBulkSeatInput(values.seatNumbers);

            if (invalidTokens.length) {
                message.warning(`Có mã ghế không hợp lệ: ${invalidTokens.join(', ')}`);
                return;
            }

            if (!seatNumbers.length) {
                message.warning('Vui lòng nhập ít nhất một số ghế hợp lệ.');
                return;
            }

            setLoading(true);
            await seatAPI.createSeatsBulk({
                screenId: values.screenId,
                seats: seatNumbers.map((seatNumber) => ({
                    seatNumber,
                    type: values.type,
                    status: values.status,
                })),
            });

            message.success('Thêm ghế hàng loạt thành công.');
            setBulkCreateOpen(false);
            bulkCreateForm.resetFields();
            fetchSeats(1, pagination.pageSize, values.screenId);
            setScreenFilter(values.screenId);
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.response?.data?.message || 'Không thể thêm ghế hàng loạt.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkUpdate = async () => {
        try {
            const screenId = ensureSameScreenSelection();
            if (!screenId) return;

            const values = await bulkUpdateForm.validateFields();
            const updateBody = {};

            if (values.type) updateBody.type = values.type;
            if (values.status) updateBody.status = values.status;

            if (!Object.keys(updateBody).length) {
                message.warning('Vui lòng chọn ít nhất một trường để cập nhật.');
                return;
            }

            setLoading(true);
            await seatAPI.updateSeatsBulk({
                screenId,
                updates: selectedRows.map((row) => ({
                    seatNumber: row.seatNumber,
                    updateBody,
                })),
            });

            message.success('Cập nhật ghế hàng loạt thành công.');
            setBulkUpdateOpen(false);
            bulkUpdateForm.resetFields();
            fetchSeats(pagination.current, pagination.pageSize);
        } catch (error) {
            if (error?.errorFields) return;
            message.error(error.response?.data?.message || 'Không thể cập nhật ghế hàng loạt.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        const screenId = ensureSameScreenSelection();
        if (!screenId) return;

        try {
            setLoading(true);
            await seatAPI.deleteSeatsBulk({
                screenId,
                seatNumbers: selectedRows.map((row) => row.seatNumber),
            });

            message.success('Xóa ghế hàng loạt thành công.');
            fetchSeats(pagination.current, pagination.pageSize);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể xóa ghế hàng loạt.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            title: 'Số ghế',
            dataIndex: 'seatNumber',
            key: 'seatNumber',
            sorter: (a, b) => a.seatNumber.localeCompare(b.seatNumber),
        },
        {
            title: 'Phòng chiếu',
            dataIndex: 'screenId',
            key: 'screenId',
            render: (screenId) => {
                const screen = getScreenById(screenId);
                return screen?.name || getId(screenId) || '-';
            },
        },
        {
            title: 'Rạp',
            key: 'theater',
            render: (_, record) => {
                const screen = getScreenById(record.screenId);
                return screen?.theater?.name || '-';
            },
        },
        {
            title: 'Loại ghế',
            dataIndex: 'type',
            key: 'type',
            render: (value) => {
                const config = getOptionConfig(SEAT_TYPE_OPTIONS, value);
                return <Tag color={config.color}>{config.label}</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                const config = getOptionConfig(SEAT_STATUS_OPTIONS, value);
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
            key: 'actions',
            width: 180,
            render: (_, record) => (
                <Space size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)} />
                    <Button
                        type="primary"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEditModal(record)}
                    />
                    <Popconfirm
                        title="Bạn có muốn đổi trạng thái ghế này?"
                        onConfirm={() => handleToggleStatus(record)}
                        okText="Đổi"
                        cancelText="Hủy"
                    >
                        <Button size="small" icon={<SettingOutlined />} />
                    </Popconfirm>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa ghế này?"
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa"
                        cancelText="Hủy"
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
                    Quản lý ghế
                </Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => fetchSeats(1, pagination.pageSize)}>
                        Tải lại
                    </Button>
                    <Button className="bg-primary" type="primary" icon={<PlusOutlined />} onClick={() => setBulkCreateOpen(true)}>Thêm hàng loạt</Button>
                    <Button className="bg-primary" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                        Thêm ghế
                    </Button>
                </Space>
            </div>

            <Card>
                <div className="mb-4 flex gap-3 flex-wrap items-center">
                    <Select
                        placeholder="Lọc theo phòng chiếu"
                        style={{ width: 320 }}
                        value={screenFilter}
                        loading={lookupLoading}
                        onChange={(value) => {
                            setScreenFilter(value);
                            fetchSeats(1, pagination.pageSize, value);
                        }}
                        options={[
                            { value: ALL_SCREEN_VALUE, label: 'Tất cả phòng chiếu' },
                            ...screenOptions,
                        ]}
                    />
                    {selectedRows.length > 0 && (
                        <>
                            <Text>{`Đã chọn ${selectedRows.length} ghế`}</Text>
                            <Button onClick={() => setBulkUpdateOpen(true)}>Cập nhật ghế đã chọn</Button>
                            <Popconfirm
                                title="Bạn có chắc chắn muốn xóa các ghế đã chọn?"
                                onConfirm={handleBulkDelete}
                                okText="Xóa"
                                cancelText="Hủy"
                                okType="danger"
                            >
                                <Button danger>Xóa ghế đã chọn</Button>
                            </Popconfirm>
                        </>
                    )}
                </div>

                <Table
                    rowSelection={{
                        selectedRowKeys,
                        onChange: (keys, rows) => {
                            setSelectedRowKeys(keys);
                            setSelectedRows(rows);
                        },
                    }}
                    columns={columns}
                    dataSource={seats}
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
                        fetchSeats(nextPagination.current, nextPagination.pageSize);
                    }}
                    scroll={{ x: 1100 }}
                />
            </Card>

            <Modal
                title={editingSeat ? 'Chỉnh sửa ghế' : 'Thêm ghế'}
                open={modalOpen}
                onOk={handleSubmit}
                onCancel={() => setModalOpen(false)}
                okText={editingSeat ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                confirmLoading={loading}
                centered
                width={560}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        name="screenId"
                        label="Phòng chiếu"
                        rules={[{ required: true, message: 'Vui lòng chọn phòng chiếu!' }]}
                    >
                        <Select
                            disabled={Boolean(editingSeat)}
                            showSearch
                            optionFilterProp="label"
                            options={screenOptions}
                        />
                    </Form.Item>
                    <Form.Item
                        name="seatNumber"
                        label="Số ghế"
                        rules={[{ required: true, message: 'Vui lòng nhập số ghế!' }]}
                    >
                        <Input placeholder="VD: A1" />
                    </Form.Item>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="type"
                            label="Loại ghế"
                            rules={[{ required: true, message: 'Vui lòng chọn loại ghế!' }]}
                        >
                            <Select
                                options={SEAT_TYPE_OPTIONS.map(({ value, label }) => ({
                                    value,
                                    label,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                        >
                            <Select
                                options={SEAT_STATUS_OPTIONS.map(({ value, label }) => ({
                                    value,
                                    label,
                                }))}
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Thêm ghế hàng loạt"
                open={bulkCreateOpen}
                onOk={handleBulkCreate}
                onCancel={() => {
                    setBulkCreateOpen(false);
                    bulkCreateForm.resetFields();
                }}
                okText="Thêm"
                cancelText="Hủy"
                confirmLoading={loading}
                centered
                width={620}
            >
                <Form
                    form={bulkCreateForm}
                    layout="vertical"
                    initialValues={{ type: 'STANDARD', status: 'AVAILABLE' }}
                >
                    <Form.Item
                        name="screenId"
                        label="Phòng chiếu"
                        rules={[{ required: true, message: 'Vui lòng chọn phòng chiếu!' }]}
                    >
                        <Select showSearch optionFilterProp="label" options={screenOptions} />
                    </Form.Item>
                    <Form.Item
                        name="seatNumbers"
                        label="Danh sách số ghế"
                        extra="Hỗ trợ nhập theo khoảng như A1-A10, B1-B10 hoặc nhập lẻ như A1 A2 A3."
                        rules={[
                            { required: true, message: 'Vui lòng nhập danh sách số ghế!' },
                            {
                                validator(_, value) {
                                    const { seatNumbers, invalidTokens } = parseBulkSeatInput(value);

                                    if (!seatNumbers.length) {
                                        return Promise.reject(
                                            new Error('Vui lòng nhập ít nhất một số ghế hợp lệ!'),
                                        );
                                    }

                                    if (invalidTokens.length) {
                                        return Promise.reject(
                                            new Error(
                                                `Sai định dạng: ${invalidTokens.join(', ')}. Ví dụ đúng: A1-A10, B1, B2.`,
                                            ),
                                        );
                                    }

                                    return Promise.resolve();
                                },
                            },
                        ]}
                    >
                        <TextArea rows={5} placeholder="A1-A10&#10;B1-B10&#10;C1 C2 C3" />
                    </Form.Item>
                    {!!bulkSeatPreview.seatNumbers.length && (
                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <Text strong>{`Sẽ tạo ${bulkSeatPreview.seatNumbers.length} ghế`}</Text>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {bulkSeatPreview.seatNumbers.slice(0, 24).map((seatNumber) => (
                                    <Tag key={seatNumber} color="blue">
                                        {seatNumber}
                                    </Tag>
                                ))}
                                {bulkSeatPreview.seatNumbers.length > 24 && (
                                    <Tag>{`+${bulkSeatPreview.seatNumbers.length - 24} ghế nữa`}</Tag>
                                )}
                            </div>
                        </div>
                    )}
                    {!!bulkSeatPreview.invalidTokens.length && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                            <Text type="danger">
                                {`Định dạng chưa đúng: ${bulkSeatPreview.invalidTokens.join(', ')}`}
                            </Text>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                            name="type"
                            label="Loại ghế"
                            rules={[{ required: true, message: 'Vui lòng chọn loại ghế!' }]}
                        >
                            <Select
                                options={SEAT_TYPE_OPTIONS.map(({ value, label }) => ({
                                    value,
                                    label,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]}
                        >
                            <Select
                                options={SEAT_STATUS_OPTIONS.map(({ value, label }) => ({
                                    value,
                                    label,
                                }))}
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Cập nhật ghế đã chọn"
                open={bulkUpdateOpen}
                onOk={handleBulkUpdate}
                onCancel={() => {
                    setBulkUpdateOpen(false);
                    bulkUpdateForm.resetFields();
                }}
                okText="Cập nhật"
                cancelText="Hủy"
                confirmLoading={loading}
                centered
                width={520}
            >
                <Form form={bulkUpdateForm} layout="vertical">
                    <Form.Item
                        name="type"
                        label="Loại ghế mới"
                        extra="Bỏ trống nếu không muốn thay đổi loại ghế."
                    >
                        <Select
                            allowClear
                            options={SEAT_TYPE_OPTIONS.map(({ value, label }) => ({
                                value,
                                label,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="Trạng thái mới"
                        extra="Bỏ trống nếu không muốn thay đổi trạng thái."
                    >
                        <Select
                            allowClear
                            options={SEAT_STATUS_OPTIONS.map(({ value, label }) => ({
                                value,
                                label,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title="Chi tiết ghế"
                open={detailOpen}
                onCancel={() => {
                    if (detailLoading) return;
                    setDetailOpen(false);
                    setViewingSeat(null);
                }}
                footer={null}
                width={720}
                centered
                confirmLoading={detailLoading}
            >
                {detailLoading ? (
                    <div className="py-10 text-center">
                        <Text>Đang tải chi tiết ghế...</Text>
                    </div>
                ) : (
                    viewingSeat && (
                        <Descriptions bordered column={2} size="small">
                            <Descriptions.Item label="Số ghế">
                                <Text strong>{viewingSeat.seatNumber}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Phòng chiếu">
                                {getScreenById(viewingSeat.screenId)?.name || getId(viewingSeat.screenId)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Rạp">
                                {getScreenById(viewingSeat.screenId)?.theater?.name || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại ghế">
                                <Tag color={getOptionConfig(SEAT_TYPE_OPTIONS, viewingSeat.type).color}>
                                    {getOptionConfig(SEAT_TYPE_OPTIONS, viewingSeat.type).label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={getOptionConfig(SEAT_STATUS_OPTIONS, viewingSeat.status).color}>
                                    {getOptionConfig(SEAT_STATUS_OPTIONS, viewingSeat.status).label}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="ID">
                                <Text copyable>{viewingSeat.id || viewingSeat._id}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày tạo">
                                {formatDate(viewingSeat.createdAt, 'HH:mm dd/MM/yyyy') || '-'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Cập nhật">
                                {formatDate(viewingSeat.updatedAt, 'HH:mm dd/MM/yyyy') || '-'}
                            </Descriptions.Item>
                        </Descriptions>
                    )
                )}
            </Modal>
        </div>
    );
};

export default SeatManagement;
