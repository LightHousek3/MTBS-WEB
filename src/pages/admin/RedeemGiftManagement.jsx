import { useEffect, useRef, useState } from "react";
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
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { redeemGiftAPI } from "../../apis";
import { formatDate } from "../../utils";

const { Title, Text } = Typography;
const { Search } = Input;
const ALL_STATUS_VALUE = "ALL";
const EXPORT_PAGE_SIZE = 100;

const REDEEM_GIFT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Chờ xử lý", color: "gold" },
  { value: "DELIVERING", label: "Đang giao", color: "blue" },
  { value: "DELIVERED", label: "Đã giao", color: "green" },
  { value: "CANCELLED", label: "Đã hủy", color: "red" },
];

const getStatusConfig = (status) =>
  REDEEM_GIFT_STATUS_OPTIONS.find((item) => item.value === status) || {
    label: status || "-",
    color: "default",
  };

const getUserName = (user) => {
  if (!user) return "-";
  return user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "-";
};

const getRedeemGiftPhone = (item) => item?.phone || item?.user?.phone || "-";

const escapeExcelValue = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const RedeemGiftManagement = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [redeemGifts, setRedeemGifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingRedeemGift, setEditingRedeemGift] = useState(null);
  const [viewingRedeemGift, setViewingRedeemGift] = useState(null);
  const [status, setStatus] = useState();
  const [transactionNo, setTransactionNo] = useState("");
  const hasMountedRef = useRef(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const fetchRedeemGifts = async (
    page = pagination.current,
    limit = pagination.pageSize,
    nextStatus = status,
    nextTransactionNo = transactionNo,
  ) => {
    try {
      setLoading(true);
      const response = await redeemGiftAPI.getRedeemGifts({
        page,
        limit,
        status: nextStatus || undefined,
        transactionNo: nextTransactionNo || undefined,
        populate: "user,redeem",
        sortBy: "createdAt:desc",
      });

      setRedeemGifts(response.data.data || []);
      setPagination({
        current: response.data.meta?.page || page,
        pageSize: response.data.meta?.limit || limit,
        total: response.data.meta?.totalResults || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải giao dịch đổi quà.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(() => fetchRedeemGifts(1, 5));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    void Promise.resolve().then(() =>
      fetchRedeemGifts(1, pagination.pageSize, status, transactionNo),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const openUpdateStatusModal = (record) => {
    if (record.status !== "DELIVERING") return;

    setEditingRedeemGift(record);
    form.setFieldsValue({ status: "DELIVERED" });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!editingRedeemGift || editingRedeemGift.status !== "DELIVERING") {
        message.error("Chỉ có thể cập nhật giao dịch đang giao.");
        return;
      }

      if (values.status !== "DELIVERED") {
        message.error("Admin chỉ có thể chuyển trạng thái sang đã giao.");
        return;
      }

      setLoading(true);
      await redeemGiftAPI.updateRedeemGift(editingRedeemGift.id, {
        status: "DELIVERED",
      });
      message.success("Cập nhật trạng thái giao dịch đổi quà thành công.");

      setModalOpen(false);
      setEditingRedeemGift(null);
      form.resetFields();
      fetchRedeemGifts(pagination.current, pagination.pageSize);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || "Không thể lưu giao dịch đổi quà.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPendingRedeemGifts = async () => {
    const firstResponse = await redeemGiftAPI.getRedeemGifts({
      page: 1,
      limit: EXPORT_PAGE_SIZE,
      status: "PENDING",
      populate: "user,redeem",
      sortBy: "createdAt:asc",
    });
    const firstData = firstResponse.data.data || [];
    const total = firstResponse.data.meta?.totalResults || firstData.length;
    const totalPages = Math.ceil(total / EXPORT_PAGE_SIZE);

    if (totalPages <= 1) {
      return firstData;
    }

    const restResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        redeemGiftAPI.getRedeemGifts({
          page: index + 2,
          limit: EXPORT_PAGE_SIZE,
          status: "PENDING",
          populate: "user,redeem",
          sortBy: "createdAt:asc",
        }),
      ),
    );

    return [
      ...firstData,
      ...restResponses.flatMap((response) => response.data.data || []),
    ];
  };

  const downloadRedeemGiftExcel = (items) => {
    const headers = [
      "Mã giao dịch",
      "Khách hàng",
      "Email",
      "Số điện thoại",
      "Quà",
      "Số lượng",
      "Địa chỉ giao hàng",
      "Ngày dự kiến giao",
      "Ngày đã giao",
      "Ngày tạo",
    ];
    const rows = items.map((item) => [
      item.transactionNo,
      getUserName(item.user),
      item.user?.email || "",
      getRedeemGiftPhone(item),
      item.redeem?.name || "",
      item.amount,
      item.address || "",
      formatDate(item.expectedDeliveryDate, "dd/MM/yyyy"),
      formatDate(item.deliveredAt, "HH:mm dd/MM/yyyy"),
      formatDate(item.createdAt, "HH:mm dd/MM/yyyy"),
    ]);
    const tableHtml = [headers, ...rows]
      .map(
        (row) =>
          `<tr>${row
            .map((cell) => `<td>${escapeExcelValue(cell)}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body><table border="1">${tableHtml}</table></body>
      </html>
    `;
    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `giao-dich-doi-qua-pending-${formatDate(
      new Date(),
      "yyyy-MM-dd",
    )}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPending = async () => {
    try {
      setExportLoading(true);
      const pendingRedeemGifts = await fetchAllPendingRedeemGifts();

      if (pendingRedeemGifts.length === 0) {
        message.info("Không có giao dịch đang xử lý để xuất Excel.");
        return;
      }

      const results = await Promise.allSettled(
        pendingRedeemGifts.map((item) =>
          redeemGiftAPI.updateRedeemGift(item.id, {
            status: "DELIVERING",
          }),
        ),
      );
      const successfulRedeemGifts = pendingRedeemGifts.filter(
        (_, index) => results[index].status === "fulfilled",
      );
      const successCount = successfulRedeemGifts.length;

      if (successCount === 0) {
        message.warning("Không cập nhật được giao dịch nào để xuất Excel.");
        fetchRedeemGifts(pagination.current, pagination.pageSize);
        return;
      }

      downloadRedeemGiftExcel(successfulRedeemGifts);

      if (successCount === pendingRedeemGifts.length) {
        message.success(
          `Đã xuất ${successCount} giao dịch và chuyển sang trạng thái đang giao.`,
        );
      } else {
        message.warning(
          `Đã xuất file, nhưng chỉ cập nhật được ${successCount}/${pendingRedeemGifts.length} giao dịch.`,
        );
      }

      fetchRedeemGifts(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xuất Excel.");
      console.error(error);
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      title: "Mã giao dịch",
      dataIndex: "transactionNo",
      key: "transactionNo",
      width: 160,
    },
    {
      title: "Khách hàng",
      dataIndex: "user",
      key: "user",
      render: (user) => (
        <Space direction="vertical" size={0}>
          <Text>{getUserName(user)}</Text>
          <Text type="secondary" className="text-xs">
            {user?.email || ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Quà",
      dataIndex: "redeem",
      key: "redeem",
      render: (redeem) => redeem?.name || "-",
    },
    {
      title: "Số lượng",
      dataIndex: "amount",
      key: "amount",
      width: 90,
    },
    {
      title: "Dự kiến giao",
      dataIndex: "expectedDeliveryDate",
      key: "expectedDeliveryDate",
      width: 130,
      render: (value) => formatDate(value, "dd/MM/yyyy") || "-",
    },
    {
      title: "Ngày giao",
      dataIndex: "deliveredAt",
      key: "deliveredAt",
      width: 150,
      render: (value) => formatDate(value, "HH:mm dd/MM/yyyy") || "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value) => {
        const config = getStatusConfig(value);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setViewingRedeemGift(record);
              setDetailOpen(true);
            }}
          />
          {record.status === "DELIVERING" && (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => openUpdateStatusModal(record)}
            />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2} style={{ margin: 0 }}>
          Quản lý giao dịch đổi quà
        </Title>
        <Button
          icon={<DownloadOutlined />}
          loading={exportLoading}
          onClick={handleExportPending}
        >
          Xuất Excel giao dịch đang xử lý
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex gap-3">
          <Search
            placeholder="Tìm theo mã giao dịch"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={(value) => {
              setTransactionNo(value);
              fetchRedeemGifts(1, pagination.pageSize, status, value);
            }}
          />
          <Select
            placeholder="Lọc trạng thái"
            style={{ width: 220 }}
            value={status || ALL_STATUS_VALUE}
            onChange={(value) => {
              const nextStatus =
                value === ALL_STATUS_VALUE ? undefined : value;
              setStatus(nextStatus);
            }}
            options={[
              { value: ALL_STATUS_VALUE, label: "Tất cả trạng thái" },
              ...REDEEM_GIFT_STATUS_OPTIONS.map(({ value, label }) => ({
                value,
                label,
              })),
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={redeemGifts}
          loading={loading}
          rowKey="id"
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ["5", "10", "20", "50", "100"],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} items`,
          }}
          onChange={(nextPagination) => {
            fetchRedeemGifts(nextPagination.current, nextPagination.pageSize);
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title="Cập nhật trạng thái giao dịch đổi quà"
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setModalOpen(false);
          setEditingRedeemGift(null);
          form.resetFields();
        }}
        okText="Cập nhật"
        cancelText="Hủy"
        confirmLoading={loading}
        width={640}
        centered
      >
        <Form form={form} layout="vertical">
          {editingRedeemGift && (
            <Descriptions bordered column={1} size="small" className="mb-4">
              <Descriptions.Item label="Mã giao dịch">
                {editingRedeemGift.transactionNo}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {getUserName(editingRedeemGift.user)}
              </Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">
                {getRedeemGiftPhone(editingRedeemGift)}
              </Descriptions.Item>
              <Descriptions.Item label="Quà">
                {editingRedeemGift.redeem?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái hiện tại">
                <Tag color={getStatusConfig(editingRedeemGift.status).color}>
                  {getStatusConfig(editingRedeemGift.status).label}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          )}
          <Form.Item
            name="status"
            label="Trạng thái mới"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
          >
            <Select
              options={[{ value: "DELIVERED", label: "Đã giao" }]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết giao dịch đổi quà"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>Đóng</Button>}
        centered
        width={760}
      >
        {viewingRedeemGift && (
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Mã giao dịch" span={2}>
              {viewingRedeemGift.transactionNo}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng" span={2}>
              {getUserName(viewingRedeemGift.user)} - {viewingRedeemGift.user?.email || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số điện thoại" span={2}>
              {getRedeemGiftPhone(viewingRedeemGift)}
            </Descriptions.Item>
            <Descriptions.Item label="Quà" span={2}>
              {viewingRedeemGift.redeem?.name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng">
              {viewingRedeemGift.amount}
            </Descriptions.Item>
            <Descriptions.Item label="Dự kiến giao">
              {formatDate(viewingRedeemGift.expectedDeliveryDate, "dd/MM/yyyy") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày đã giao">
              {formatDate(viewingRedeemGift.deliveredAt, "HH:mm dd/MM/yyyy") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Địa chỉ giao hàng" span={2}>
              {viewingRedeemGift.address || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={getStatusConfig(viewingRedeemGift.status).color}>
                {getStatusConfig(viewingRedeemGift.status).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {formatDate(viewingRedeemGift.createdAt, "HH:mm dd/MM/yyyy")}
            </Descriptions.Item>
            <Descriptions.Item label="Ngày cập nhật">
              {formatDate(viewingRedeemGift.updatedAt, "HH:mm dd/MM/yyyy")}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default RedeemGiftManagement;
