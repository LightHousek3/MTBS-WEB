import { useEffect, useRef, useState } from "react";
import {
  App,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { cloudinaryAPI, redeemAPI } from "../../apis";
import { formatDate, hasFormChanged } from "../../utils";

const { Title, Text } = Typography;
const { Search } = Input;

const ALL_STATUS_VALUE = "ALL";

const REDEEM_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Đang khả dụng", color: "green" },
  { value: "INACTIVE", label: "Ngưng hoạt động", color: "default" },
];

const getStatusConfig = (status) =>
  REDEEM_STATUS_OPTIONS.find((item) => item.value === status) || {
    label: status || "-",
    color: "default",
  };

const normalizeFormValues = (values) => ({
  name: values.name?.trim(),
  description: values.description?.trim() || "",
  pointsRequired: Number(values.pointsRequired || 0),
  quantity: Number(values.quantity || 0),
  status: values.status,
});

const buildPayload = (values, image) => ({
  name: values.name?.trim(),
  description: values.description?.trim() || "",
  pointsRequired: Number(values.pointsRequired || 0),
  quantity: Number(values.quantity || 0),
  status: values.status,
  image,
});

const RedeemManagement = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [redeems, setRedeems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRedeem, setEditingRedeem] = useState(null);
  const [viewingRedeem, setViewingRedeem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [originalData, setOriginalData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState();
  const hasMountedRef = useRef(false);
  const [imageFile, setImageFile] = useState(null);
  const [imageList, setImageList] = useState([]);
  const [previewImage, setPreviewImage] = useState("");
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [uploadedImageAsset, setUploadedImageAsset] = useState(null);
  const [isImageMarkedForDeletion, setIsImageMarkedForDeletion] =
    useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const fetchRedeems = async (
    page = pagination.current,
    limit = pagination.pageSize,
    nextSearch = search,
    nextStatus = status,
  ) => {
    try {
      setLoading(true);
      const response = await redeemAPI.getRedeems({
        page,
        limit,
        search: nextSearch || undefined,
        status: nextStatus || undefined,
        sortBy: "createdAt:desc",
      });

      setRedeems(response.data.data || []);
      setPagination({
        current: response.data.meta?.page || page,
        pageSize: response.data.meta?.limit || limit,
        total: response.data.meta?.totalResults || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải danh sách quà.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedeems(1, 5);
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    fetchRedeems(1, pagination.pageSize, search, status);
  }, [status]);

  const uploadRedeemImage = async (file, onProgress) => {
    const response = await cloudinaryAPI.uploadImage(
      file,
      undefined,
      onProgress,
    );

    return {
      url: response.data.secure_url,
      publicId: response.data.public_id,
    };
  };

  const resetImageState = () => {
    setImageFile(null);
    setImageList([]);
    setPreviewImage("");
    setImageUploadProgress(0);
    setUploadedImageAsset(null);
    setIsImageMarkedForDeletion(false);
  };

  const openCreateModal = () => {
    setEditingRedeem(null);
    setOriginalData(null);
    resetImageState();
    form.resetFields();
    form.setFieldsValue({ status: "AVAILABLE", pointsRequired: 0, quantity: 0 });
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    const values = {
      name: record.name,
      description: record.description,
      pointsRequired: record.pointsRequired,
      quantity: record.quantity,
      status: record.status,
    };

    setEditingRedeem(record);
    setOriginalData(normalizeFormValues(values));
    setImageFile(null);
    setUploadedImageAsset(record.image || null);
    setIsImageMarkedForDeletion(false);
    setImageUploadProgress(0);
    setPreviewImage(record.image?.url || "");
    setImageList(
      record.image?.url
        ? [
            {
              uid: "-1",
              name: "redeem-image.jpg",
              status: "done",
              url: record.image.url,
            },
          ]
        : [],
    );
    form.setFieldsValue(values);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const normalizedValues = normalizeFormValues(values);
      const hasImageChanged = imageFile !== null || isImageMarkedForDeletion;

      if (
        editingRedeem &&
        !hasFormChanged(originalData, normalizedValues) &&
        !hasImageChanged
      ) {
        message.warning("Không có thay đổi nào để cập nhật.");
        return;
      }

      setLoading(true);
      setImageUploadProgress(imageFile ? 0 : 100);

      let imageAsset = editingRedeem?.image || null;
      if (imageFile) {
        imageAsset =
          uploadedImageAsset ||
          (await uploadRedeemImage(
            imageFile,
            setImageUploadProgress,
          ));
        setUploadedImageAsset(imageAsset);
      } else if (isImageMarkedForDeletion) {
        imageAsset = null;
      }

      if (editingRedeem) {
        await redeemAPI.updateRedeem(
          editingRedeem.id,
          buildPayload(values, imageAsset),
        );
        message.success("Cập nhật quà đổi điểm thành công.");
      } else {
        await redeemAPI.createRedeem(buildPayload(values, imageAsset));
        message.success("Thêm quà đổi điểm thành công.");
      }

      setModalOpen(false);
      form.resetFields();
      resetImageState();
      fetchRedeems(pagination.current, pagination.pageSize);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || "Không thể lưu quà đổi điểm.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await redeemAPI.deleteRedeem(id);
      message.success("Xóa quà đổi điểm thành công.");

      const nextPage =
        pagination.current > 1 && redeems.length === 1
          ? pagination.current - 1
          : pagination.current;
      fetchRedeems(nextPage, pagination.pageSize);
    } catch (error) {
      if (error.response?.status === 409) {
        message.warning(
          "Quà đã có giao dịch đổi quà. Hãy chuyển trạng thái sang ngưng hoạt động thay vì xóa.",
        );
      } else {
        message.error(error.response?.data?.message || "Không thể xóa quà đổi điểm.");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (id) => {
    try {
      setDetailLoading(true);
      setViewingRedeem(null);
      const response = await redeemAPI.getRedeemById(id);
      setViewingRedeem(response.data.data);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải chi tiết quà.");
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "image",
      width: 90,
      render: (image) => (
        <Image
          src={image?.url || "https://placehold.co/80x80?text=Gift"}
          alt="redeem"
          width={56}
          height={56}
          style={{ objectFit: "cover", borderRadius: 8 }}
        />
      ),
    },
    {
      title: "Tên quà",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Điểm cần đổi",
      dataIndex: "pointsRequired",
      key: "pointsRequired",
      render: (value) => Number(value || 0).toLocaleString("vi-VN"),
    },
    {
      title: "Tồn kho",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (value) => {
        const config = getStatusConfig(value);
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => formatDate(value, "HH:mm dd/MM/yyyy"),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            loading={detailLoading}
            onClick={() => openDetailModal(record.id)}
          />
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa quà này?"
            description="Quà đã có giao dịch sẽ không thể xóa. Hãy ngưng hoạt động nếu không muốn khách tiếp tục đổi."
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
          Quản lý quà đổi điểm
        </Title>
        <Button className="bg-primary" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm quà
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex gap-3">
          <Search
            placeholder="Tìm theo tên quà"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={(value) => {
              setSearch(value);
              fetchRedeems(1, pagination.pageSize, value, status);
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
              ...REDEEM_STATUS_OPTIONS.map(({ value, label }) => ({
                value,
                label,
              })),
            ]}
          />
        </div>

        <Table
          columns={columns}
          dataSource={redeems}
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
            fetchRedeems(nextPagination.current, nextPagination.pageSize);
          }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={editingRedeem ? "Chỉnh sửa quà" : "Thêm quà đổi điểm"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          if (loading) return;
          setModalOpen(false);
          resetImageState();
        }}
        okText={editingRedeem ? "Cập nhật" : "Thêm"}
        cancelText="Hủy"
        confirmLoading={loading}
        cancelButtonProps={{ disabled: loading }}
        closable={!loading}
        maskClosable={!loading}
        keyboard={!loading}
        width={640}
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Tên quà"
            rules={[{ required: true, message: "Vui lòng nhập tên quà!" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} maxLength={255} showCount />
          </Form.Item>
          <Form.Item
            name="pointsRequired"
            label="Điểm cần đổi"
            rules={[{ required: true, message: "Vui lòng nhập điểm cần đổi!" }]}
          >
            <InputNumber min={0} precision={0} className="w-full" />
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Số lượng"
            rules={[{ required: true, message: "Vui lòng nhập số lượng!" }]}
          >
            <InputNumber min={0} precision={0} className="w-full" />
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true, message: "Vui lòng chọn trạng thái!" }]}
          >
            <Select options={REDEEM_STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="Ảnh quà">
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
                setUploadedImageAsset(null);
                setIsImageMarkedForDeletion(false);
                const previewUrl = URL.createObjectURL(file);
                setPreviewImage(previewUrl);
                setImageList([
                  {
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    url: previewUrl,
                  },
                ]);
                return false;
              }}
              onRemove={() => {
                if (loading) return false;
                setImageFile(null);
                setImageUploadProgress(0);
                setUploadedImageAsset(null);
                setIsImageMarkedForDeletion(true);
                setImageList([]);
                setPreviewImage("");
              }}
            >
              <Button icon={<UploadOutlined />}>
                {imageList.length > 0 ? "Chọn lại ảnh" : "Chọn ảnh"}
              </Button>
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
            {imageFile && (
              <Progress
                percent={imageUploadProgress}
                size="small"
                status={imageUploadProgress === 100 ? "success" : "active"}
                className="mt-2"
              />
            )}
            {uploadedImageAsset && imageFile && (
              <Text type="success" className="mt-2 block">
                Đã upload lên Cloudinary, chờ lưu quà.
              </Text>
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết quà đổi điểm"
        open={detailLoading || Boolean(viewingRedeem)}
        onCancel={() => {
          if (detailLoading) return;
          setViewingRedeem(null);
        }}
        footer={null}
        width={720}
        centered
        confirmLoading={detailLoading}
      >
        {detailLoading ? (
          <div className="py-10 text-center">
            <Text>Đang tải chi tiết quà...</Text>
          </div>
        ) : (
          viewingRedeem && (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <Image
                  src={viewingRedeem.image?.url || "https://placehold.co/160x160?text=Gift"}
                  width={140}
                  height={140}
                  style={{ objectFit: "cover", borderRadius: 8 }}
                />
                <div className="flex-1 min-w-0">
                  <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
                    {viewingRedeem.name}
                  </Title>
                  <Tag color={getStatusConfig(viewingRedeem.status).color}>
                    {getStatusConfig(viewingRedeem.status).label}
                  </Tag>
                  <Text className="block mt-3" type="secondary">
                    {viewingRedeem.description || "Chưa có mô tả."}
                  </Text>
                </div>
              </div>

              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Điểm cần đổi">
                  {Number(viewingRedeem.pointsRequired || 0).toLocaleString("vi-VN")}
                </Descriptions.Item>
                <Descriptions.Item label="Tồn kho">
                  {viewingRedeem.quantity}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {formatDate(viewingRedeem.createdAt, "HH:mm dd/MM/yyyy") || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật">
                  {formatDate(viewingRedeem.updatedAt, "HH:mm dd/MM/yyyy") || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="ID" span={2}>
                  <Text copyable>{viewingRedeem.id || viewingRedeem._id}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          )
        )}
      </Modal>
    </div>
  );
};

export default RedeemManagement;
