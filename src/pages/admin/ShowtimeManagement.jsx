import { useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { movieAPI, screenAPI, showtimeAPI } from "../../apis";
import { formatDate, hasFormChanged } from "../../utils";

const { Title, Text } = Typography;

const ALL_STATUS = "ALL";

const SHOWTIME_STATUS_LABELS = {
  UPCOMING: { text: "Sắp chiếu", color: "blue" },
  NOW_SHOWING: { text: "Đang chiếu", color: "green" },
  ENDED: { text: "Đã chiếu", color: "default" },
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || value._id || "";
};

const getMovieTitle = (showtime) => showtime.movie?.title || "-";
const getScreenName = (showtime) => showtime.screen?.name || "-";
const getTheaterName = (showtime) => showtime.screen?.theater?.name || "-";
const getScreenTheaterName = (screen) => screen.theater?.name || "Chưa có rạp";

const normalizeShowtimeForCompare = (values) => ({
  movie: values.movie,
  screen: values.screen,
  startTime: values.startTime?.format("YYYY-MM-DDTHH:mm:ss"),
  endTime: values.endTime?.format("YYYY-MM-DDTHH:mm:ss"),
});

const ShowtimeManagement = () => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [screens, setScreens] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [originalShowtimeData, setOriginalShowtimeData] = useState(null);
  const [selectedMovieId, setSelectedMovieId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [seatingDetail, setSeatingDetail] = useState(null);

  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.id === selectedMovieId),
    [movies, selectedMovieId],
  );

  const fetchLookups = async () => {
    try {
      setLookupLoading(true);
      const [movieResponse, screenResponse] = await Promise.all([
        movieAPI.getMovies({ page: 1, limit: 100, sortBy: "title:asc" }),
        screenAPI.getScreens(),
      ]);

      setMovies(movieResponse.data.data || []);
      setScreens(screenResponse.data.data || []);
    } catch (error) {
      message.error("Không thể tải dữ liệu phim hoặc phòng chiếu.");
      console.error(error);
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchShowtimes = async (
    page = pagination.current,
    limit = pagination.pageSize,
    status = statusFilter,
  ) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        populate: "movie,screen.theater",
        sortBy: "startTime:desc",
      };

      if (status && status !== ALL_STATUS) {
        params.status = status;
      }

      const response = await showtimeAPI.getShowtimes(params);

      setShowtimes(response.data.data || []);
      setPagination({
        current: response.data.meta?.page || page,
        pageSize: response.data.meta?.limit || limit,
        total: response.data.meta?.totalResults || 0,
      });
    } catch (error) {
      message.error("Không thể tải danh sách suất chiếu.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLookups();
    fetchShowtimes(1, 5);
  }, []);

  const resetModalState = () => {
    form.resetFields();
    setEditingShowtime(null);
    setOriginalShowtimeData(null);
    setSelectedMovieId(null);
  };

  const openCreateModal = () => {
    resetModalState();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    const formValues = {
      screen: getId(record.screen),
      movie: getId(record.movie),
      startTime: dayjs(record.startTime),
      endTime: dayjs(record.endTime),
    };

    setEditingShowtime(record);
    setOriginalShowtimeData(normalizeShowtimeForCompare(formValues));
    setSelectedMovieId(formValues.movie);
    form.setFieldsValue(formValues);
    setIsModalOpen(true);
  };

  const recalculateEndTime = (movieId = selectedMovieId, startTime) => {
    const movie = movies.find((item) => item.id === movieId);
    if (!movie?.duration || !startTime) {
      form.setFieldValue("endTime", null);
      return;
    }

    form.setFieldValue("endTime", dayjs(startTime).add(movie.duration, "minute"));
  };

  const handleMovieChange = (movieId) => {
    setSelectedMovieId(movieId);
    recalculateEndTime(movieId, form.getFieldValue("startTime"));
  };

  const handleStartTimeChange = (value) => {
    recalculateEndTime(selectedMovieId, value);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const compareData = normalizeShowtimeForCompare(values);

      if (editingShowtime && !hasFormChanged(originalShowtimeData, compareData)) {
        message.warning("Không có thay đổi nào để cập nhật.");
        return;
      }

      const payload = {
        movie: values.movie,
        screen: values.screen,
        startTime: values.startTime.format("YYYY-MM-DDTHH:mm:ss"),
        endTime: values.endTime.format("YYYY-MM-DDTHH:mm:ss"),
      };

      setLoading(true);
      if (editingShowtime) {
        await showtimeAPI.updateShowtime(editingShowtime.id, payload);
        message.success("Cập nhật suất chiếu thành công.");
      } else {
        await showtimeAPI.createShowtime(payload);
        message.success("Thêm suất chiếu thành công.");
      }

      setIsModalOpen(false);
      resetModalState();
      fetchShowtimes(pagination.current, pagination.pageSize);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || "Không thể lưu suất chiếu.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await showtimeAPI.deleteShowtime(id);
      message.success("Xóa suất chiếu thành công.");

      const nextPage = pagination.current > 1 && showtimes.length === 1
        ? pagination.current - 1
        : pagination.current;
      fetchShowtimes(nextPage, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể xóa suất chiếu.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (record) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setSeatingDetail(null);
      const response = await showtimeAPI.getShowtimeSeating(record.id);
      setSeatingDetail(response.data.data);
    } catch (error) {
      message.error(error.response?.data?.message || "Không thể tải chi tiết suất chiếu.");
      console.error(error);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: "Rạp",
      key: "theater",
      render: (_, record) => getTheaterName(record),
    },
    {
      title: "Phòng chiếu",
      key: "screen",
      render: (_, record) => getScreenName(record),
    },
    {
      title: "Phim",
      key: "movie",
      render: (_, record) => getMovieTitle(record),
    },
    {
      title: "Bắt đầu",
      dataIndex: "startTime",
      key: "startTime",
      render: (value) => formatDate(value, "HH:mm dd/MM/yyyy"),
      sorter: (a, b) => new Date(a.startTime) - new Date(b.startTime),
    },
    {
      title: "Kết thúc",
      dataIndex: "endTime",
      key: "endTime",
      render: (value) => formatDate(value, "HH:mm dd/MM/yyyy"),
      sorter: (a, b) => new Date(a.endTime) - new Date(b.endTime),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const statusConfig = SHOWTIME_STATUS_LABELS[status] || {
          text: status || "-",
          color: "default",
        };
        return <Tag color={statusConfig.color}>{statusConfig.text}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
          <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa suất chiếu này?"
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
          Quản lý suất chiếu
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Thêm suất chiếu
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex gap-3">
          <Select
            placeholder="Lọc trạng thái"
            style={{ width: 220 }}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              fetchShowtimes(1, pagination.pageSize, value);
            }}
            options={[
              { value: ALL_STATUS, label: "Tất cả trạng thái" },
              ...Object.entries(SHOWTIME_STATUS_LABELS).map(([value, label]) => ({
                value,
                label: label.text,
              })),
            ]}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => fetchShowtimes(pagination.current, pagination.pageSize)}
          >
            Tải lại
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={showtimes}
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
            fetchShowtimes(nextPagination.current, nextPagination.pageSize);
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingShowtime ? "Chỉnh sửa suất chiếu" : "Thêm suất chiếu"}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          resetModalState();
        }}
        okText={editingShowtime ? "Cập nhật" : "Thêm"}
        cancelText="Hủy"
        confirmLoading={loading}
        width={640}
        centered
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="screen"
            label="Phòng chiếu"
            rules={[{ required: true, message: "Vui lòng chọn phòng chiếu!" }]}
          >
            <Select
              showSearch
              loading={lookupLoading}
              placeholder="Chọn phòng chiếu"
              optionFilterProp="label"
              options={screens.map((screen) => ({
                value: screen.id,
                label: `${screen.name} - ${getScreenTheaterName(screen)} (${screen.seatCapacity} ghế)`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="movie"
            label="Phim"
            rules={[{ required: true, message: "Vui lòng chọn phim!" }]}
          >
            <Select
              showSearch
              loading={lookupLoading}
              placeholder="Chọn phim"
              optionFilterProp="label"
              options={movies.map((movie) => ({
                value: movie.id,
                label: `${movie.title} (${movie.duration} phút)`,
              }))}
              onChange={handleMovieChange}
            />
          </Form.Item>

          <Form.Item
            name="startTime"
            label="Thời gian bắt đầu"
            rules={[{ required: true, message: "Vui lòng chọn thời gian bắt đầu!" }]}
          >
            <DatePicker
              showTime
              format="HH:mm DD/MM/YYYY"
              className="w-full"
              onChange={handleStartTimeChange}
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="Thời gian kết thúc"
            rules={[{ required: true, message: "Vui lòng chọn thời gian kết thúc!" }]}
            extra={
              selectedMovie
                ? `Tự tính theo thời lượng phim: ${selectedMovie.duration} phút`
                : "Chọn phim và thời gian bắt đầu để tự tính giờ kết thúc."
            }
          >
            <DatePicker showTime format="HH:mm DD/MM/YYYY" className="w-full" disabled />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Chi tiết suất chiếu"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>Đóng</Button>}
        loading={detailLoading}
        width={820}
        centered
      >
        {seatingDetail && (
          <Space direction="vertical" size="large" className="w-full">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Phim" span={2}>
                <Text strong>{seatingDetail.movie?.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Rạp">
                {seatingDetail.theater?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng">
                {seatingDetail.screen?.name || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Bắt đầu">
                {formatDate(seatingDetail.showtime?.startTime, "HH:mm dd/MM/yyyy")}
              </Descriptions.Item>
              <Descriptions.Item label="Kết thúc">
                {formatDate(seatingDetail.showtime?.endTime, "HH:mm dd/MM/yyyy")}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng ghế">
                {seatingDetail.seats?.length || 0}
              </Descriptions.Item>
              <Descriptions.Item label="Ghế đã đặt">
                {seatingDetail.seats?.filter((seat) => seat.status === "UNAVAILABLE").length || 0}
              </Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default ShowtimeManagement;
