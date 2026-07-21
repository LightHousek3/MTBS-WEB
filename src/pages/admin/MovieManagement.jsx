import { useEffect, useState } from 'react';
import {
    Table,
    Image,
    Input,
    Pagination,
    Button,
    Space,
    Typography,
    Card,
    Popconfirm,
    Modal,
    Form,
    message,
    Upload,
    Select,
    Tag,
    Progress,
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
    UploadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { cloudinaryAPI, movieAPI, genreAPI } from '../../apis';

const { Title, Text } = Typography;
const { Search } = Input;

const getMediaUrl = (media) => {
    if (!media) return '';
    return typeof media === 'string' ? media : media.url || '';
};

const normalizeActors = (actors) => {
    if (Array.isArray(actors)) return actors;
    if (typeof actors !== 'string') return [];
    return actors
        .split(',')
        .map((actor) => actor.trim())
        .filter(Boolean);
};

const normalizeDateForInput = (value) => {
    if (!value) return '';
    if (typeof value === 'string') {
        return value.includes('T') ? value.split('T')[0] : value;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const areArraysEqual = (first = [], second = []) =>
    first.length === second.length && first.every((value, index) => value === second[index]);

const fieldNameMap = {
    title: 'title',
    duration: 'duration',
    author: 'author',
    actors: 'actors',
    origin: 'origin',
    type: 'type',
    releaseDate: 'releaseDate',
    endDate: 'endDate',
    ageRating: 'ageRating',
    description: 'description',
    genres: 'genres',
};

const inferFieldNameFromMessage = (messageText = '') => {
    const normalizedMessage = messageText.toLowerCase();

    if (normalizedMessage.includes('releasedate')) return 'releaseDate';
    if (normalizedMessage.includes('enddate')) return 'endDate';
    if (normalizedMessage.includes('duration')) return 'duration';
    if (normalizedMessage.includes('title')) return 'title';
    if (normalizedMessage.includes('origin')) return 'origin';
    if (normalizedMessage.includes('author')) return 'author';
    if (normalizedMessage.includes('actors')) return 'actors';
    if (normalizedMessage.includes('agerating')) return 'ageRating';
    if (normalizedMessage.includes('description')) return 'description';
    if (normalizedMessage.includes('genres')) return 'genres';
    if (normalizedMessage.includes('type')) return 'type';

    return null;
};

const MovieManagement = () => {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [total, setTotal] = useState(0);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingMovie, setEditingMovie] = useState(null);
    const [originalMovieData, setOriginalMovieData] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [viewingMovie, setViewingMovie] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [form] = Form.useForm();
    const [imageFile, setImageFile] = useState(null);
    const [trailerFile, setTrailerFile] = useState(null);

    const [imageList, setImageList] = useState([]);
    const [previewImage, setPreviewImage] = useState('');
    const [trailerList, setTrailerList] = useState([]);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [imageUploadProgress, setImageUploadProgress] = useState(0);
    const [trailerUploadProgress, setTrailerUploadProgress] = useState(0);
    const [uploadedImageAsset, setUploadedImageAsset] = useState(null);
    const [uploadedTrailerAsset, setUploadedTrailerAsset] = useState(null);
    const [isImageMarkedForDeletion, setIsImageMarkedForDeletion] = useState(false);
    const [isTrailerMarkedForDeletion, setIsTrailerMarkedForDeletion] = useState(false);

    const [genres, setGenres] = useState([]);

    const fetchMovies = async (overrides = {}) => {
        try {
            setLoading(true);
            const response = await movieAPI.getMovies({
                page: (overrides.page ?? page) + 1,
                limit: overrides.pageSize ?? pageSize,
                keyword: (overrides.keyword ?? keyword) || undefined,
                populate: 'genres',
            });
            const movies = response.data;
            setMovies(movies.data || []);
            setTotal(movies.meta.totalResults || []);
        } catch (error) {
            message.error('Không thể tải danh sách phim!');
            console.error('Không thể tải danh sách phim!', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovies();
    }, [page, pageSize, keyword]);

    const uploadMovieMedia = async (file, resourceType, onProgress) => {
        const response = await cloudinaryAPI.upload(file, {
            resourceType,
            onProgress,
        });

        return {
            url: response.data.secure_url,
            publicId: response.data.public_id,
        };
    };

    const addMovie = async (movieData) => {
        try {
            const response = await movieAPI.createMovie(movieData);
            const movie = response.data;
            return movie.data;
        } catch (error) {
            message.error('Lỗi khi thêm phim!');
            console.error('Lỗi khi thêm phim!', error);
            throw error;
        }
    };

    const updateMovie = async (id, movieData) => {
        try {
            const response = await movieAPI.updateMovie(id, movieData);
            // Backend có thể trả về data trực tiếp hoặc trong response.data.data
            return response.data.data || response.data;
        } catch (error) {
            console.error('Lỗi khi cập nhật phim:', error);
            throw error;
        }
    };

    const deleteMovie = async (id) => {
        try {
            await movieAPI.deleteMovie(id);
        } catch (error) {
            console.error('Lỗi khi xóa phim:', error);
            throw error;
        }
    };

    const handleAdd = () => {
        form.resetFields();
        setImageFile(null);
        setTrailerFile(null);
        setUploadedImageAsset(null);
        setUploadedTrailerAsset(null);
        setIsImageMarkedForDeletion(false);
        setIsTrailerMarkedForDeletion(false);
        setImageList([]); //   Xóa danh sách ảnh cũ
        setPreviewImage('');
        setTrailerList([]); //   Xóa danh sách trailer cũ
        setIsEditMode(false);
        setOriginalMovieData(null);
        setIsModalVisible(true);
    };

    const handleModalOk = async (e) => {
        e?.preventDefault();
        try {
            setLoading(true);
            setIsUploadingMedia(true);
            form.setFields(Object.values(fieldNameMap).map((name) => ({ name, errors: [] })));
            setImageUploadProgress(imageFile ? 0 : 100);
            setTrailerUploadProgress(trailerFile ? 0 : 100);
            const values = await form.validateFields();

            const movieData = {
                title: values.title,
                description: values.description,
                author: values.author,
                actors: normalizeActors(values.actors),
                origin: values.origin,
                type: values.type,
                duration: Number(values.duration),
                releaseDate: values.releaseDate,
                endDate: values.endDate,
                ageRating: values.ageRating,
                genres: values.genres?.map(String) || [],
            };

            if (isEditMode && editingMovie) {
                const originalGenres =
                    originalMovieData?.genres?.map((genre) => String(genre.id)).sort() || [];
                const currentGenres = [...movieData.genres].sort();
                const originalActors = Array.isArray(originalMovieData?.actors)
                    ? originalMovieData.actors
                    : normalizeActors(originalMovieData?.actors);
                const changedFields = {};

                if (movieData.title !== (originalMovieData?.title || '')) {
                    changedFields.title = movieData.title;
                }
                if (movieData.description !== (originalMovieData?.description || '')) {
                    changedFields.description = movieData.description;
                }
                if (movieData.author !== (originalMovieData?.author || '')) {
                    changedFields.author = movieData.author;
                }
                if (!areArraysEqual(movieData.actors, originalActors)) {
                    changedFields.actors = movieData.actors;
                }
                if (movieData.origin !== (originalMovieData?.origin || '')) {
                    changedFields.origin = movieData.origin;
                }
                if (movieData.type !== originalMovieData?.type) {
                    changedFields.type = movieData.type;
                }
                if (Number(movieData.duration) !== Number(originalMovieData?.duration)) {
                    changedFields.duration = movieData.duration;
                }
                if (
                    movieData.releaseDate !== normalizeDateForInput(originalMovieData?.releaseDate)
                ) {
                    changedFields.releaseDate = movieData.releaseDate;
                }
                if (movieData.endDate !== normalizeDateForInput(originalMovieData?.endDate)) {
                    changedFields.endDate = movieData.endDate;
                }
                if (movieData.ageRating !== originalMovieData?.ageRating) {
                    changedFields.ageRating = movieData.ageRating;
                }
                if (!areArraysEqual(currentGenres, originalGenres)) {
                    changedFields.genres = movieData.genres;
                }

                const hasImageChanged = imageFile !== null || isImageMarkedForDeletion;
                const hasTrailerChanged = trailerFile !== null || isTrailerMarkedForDeletion;

                if (
                    Object.keys(changedFields).length === 0 &&
                    !hasImageChanged &&
                    !hasTrailerChanged
                ) {
                    message.warning('Không có thay đổi nào để cập nhật!');
                    return;
                }

                if (imageFile) {
                    const imageAsset =
                        uploadedImageAsset ||
                        (await uploadMovieMedia(imageFile, 'image', setImageUploadProgress));
                    setUploadedImageAsset(imageAsset);
                    changedFields.image = imageAsset;
                } else if (isImageMarkedForDeletion) {
                    changedFields.image = null;
                }

                if (trailerFile) {
                    const trailerAsset =
                        uploadedTrailerAsset ||
                        (await uploadMovieMedia(trailerFile, 'video', setTrailerUploadProgress));
                    setUploadedTrailerAsset(trailerAsset);
                    changedFields.trailer = trailerAsset;
                } else if (isTrailerMarkedForDeletion) {
                    changedFields.trailer = null;
                }

                const updatedMovie = await updateMovie(editingMovie.id, changedFields);
                message.success('Cập nhật phim thành công!');
                setMovies((prev) =>
                    prev.map((movie) => (movie.id === updatedMovie.id ? updatedMovie : movie)),
                );
            } else {
                if (imageFile) {
                    const imageAsset =
                        uploadedImageAsset ||
                        (await uploadMovieMedia(imageFile, 'image', setImageUploadProgress));
                    setUploadedImageAsset(imageAsset);
                    movieData.image = imageAsset;
                }

                if (trailerFile) {
                    const trailerAsset =
                        uploadedTrailerAsset ||
                        (await uploadMovieMedia(trailerFile, 'video', setTrailerUploadProgress));
                    setUploadedTrailerAsset(trailerAsset);
                    movieData.trailer = trailerAsset;
                }

                const newMovie = await addMovie(movieData);
                message.success('Thêm phim thành công!');
                setMovies((prev) => [newMovie, ...prev]); //   Cập nhật ngay trong state
                setTotal((prev) => prev + 1);
            }

            setIsModalVisible(false);
            setEditingMovie(null);
            setOriginalMovieData(null);
            setIsEditMode(false);
            setImageFile(null);
            setTrailerFile(null);
            setPreviewImage('');
            setImageUploadProgress(0);
            setTrailerUploadProgress(0);
            setUploadedImageAsset(null);
            setUploadedTrailerAsset(null);
            setIsImageMarkedForDeletion(false);
            setIsTrailerMarkedForDeletion(false);
            fetchMovies();
        } catch (error) {
            const hasMappedFieldError = applyServerValidationErrors(error);
            message.error(
                hasMappedFieldError
                    ? 'Vui lòng kiểm tra lại thông tin đã nhập.'
                    : 'Đã xảy ra lỗi khi lưu phim!',
            );
            console.error('Lỗi khi lưu phim!', error);
        } finally {
            setIsUploadingMedia(false);
            setLoading(false);
        }
    };

    const applyServerValidationErrors = (error) => {
        const statusCode = error?.response?.data?.statusCode;
        const serverMessage = error?.response?.data?.message;

        if (!statusCode || !serverMessage) return false;

        if (statusCode === 409) {
            form.setFields([
                {
                    name: 'title',
                    errors: [serverMessage],
                },
            ]);
            return true;
        }

        if (statusCode !== 400 || typeof serverMessage !== 'string') {
            return false;
        }

        const matches = [...serverMessage.matchAll(/"([^"]+)"/g)];
        const fieldErrors = matches
            .map((match) => match[1])
            .map((fieldKey) => fieldNameMap[fieldKey])
            .filter(Boolean)
            .map((fieldName) => ({
                name: fieldName,
                errors: [serverMessage],
            }));

        if (fieldErrors.length === 0) {
            const inferredFieldName = inferFieldNameFromMessage(serverMessage);

            if (!inferredFieldName) {
                return false;
            }

            form.setFields([
                {
                    name: inferredFieldName,
                    errors: [serverMessage],
                },
            ]);
            return true;
        }

        form.setFields(fieldErrors);
        return true;
    };

    const handleEdit = (movie) => {
        setIsEditMode(true);
        setEditingMovie(movie);
        setOriginalMovieData(movie);
        setImageFile(null);
        setTrailerFile(null);
        setIsImageMarkedForDeletion(false);
        setIsTrailerMarkedForDeletion(false);

        // Gán giá trị form
        form.setFieldsValue({
            title: movie.title,
            author: movie.author,
            actors: Array.isArray(movie.actors) ? movie.actors.join(', ') : movie.actors,
            origin: movie.origin,
            type: movie.type,
            duration: movie.duration,
            releaseDate: normalizeDateForInput(movie.releaseDate),
            endDate: normalizeDateForInput(movie.endDate),
            description: movie.description,
            ageRating: movie.ageRating,
            genres: movie.genres?.map((g) => g.id),
        });

        //   Hiển thị sẵn ảnh poster
        setPreviewImage(getMediaUrl(movie.image));
        setImageList(
            getMediaUrl(movie.image)
                ? [
                      {
                          uid: '-1',
                          name: 'poster.jpg',
                          status: 'done',
                          url: getMediaUrl(movie.image), // đường dẫn ảnh từ API
                      },
                  ]
                : [],
        );

        //   Hiển thị sẵn trailer nếu có
        setTrailerList(
            getMediaUrl(movie.trailer)
                ? [
                      {
                          uid: '-2',
                          name: 'trailer.mp4',
                          status: 'done',
                          url: getMediaUrl(movie.trailer),
                      },
                  ]
                : [],
        );
        setImageUploadProgress(0);
        setTrailerUploadProgress(0);
        setUploadedImageAsset(movie.image && typeof movie.image === 'object' ? movie.image : null);
        setUploadedTrailerAsset(
            movie.trailer && typeof movie.trailer === 'object' ? movie.trailer : null,
        );

        setIsModalVisible(true);
    };

    const handleDelete = async (id) => {
        try {
            await deleteMovie(id);
            message.success('Xóa phim thành công!');
            const nextTotal = Math.max(total - 1, 0);
            const lastItemOnPage = movies.length === 1;
            const nextPage = page > 0 && lastItemOnPage ? page - 1 : page;

            if (nextPage !== page) {
                setPage(nextPage);
            }

            setTotal(nextTotal);
            fetchMovies({ page: nextPage });
        } catch (error) {
            console.error('Lỗi khi xóa phim:', error);
            message.error('Không thể xóa phim!');
        }
    };

    const handleViewDetail = async (movie) => {
        try {
            setIsDetailModalVisible(true);
            setDetailLoading(true);
            setViewingMovie(null);

            const response = await movieAPI.getMovieById(movie.id || movie._id);
            setViewingMovie(response.data.data || response.data);
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải chi tiết phim!');
            console.error('Không thể tải chi tiết phim!', error);
            setIsDetailModalVisible(false);
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                const params = { limit: 9999 };
                const response = await genreAPI.getGenres(params);

                const genres = response.data.data || [];

                setGenres(genres);
            } catch (error) {
                message.error('Không thể tải danh sách thể loại!');
                console.error('Không thể tải danh sách thể loại!', error);
            }
        };

        fetchGenres();
    }, []);

    // Cột hiển thị trong bảng
    const columns = [
        {
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (img) => (
                <Image
                    src={getMediaUrl(img) || 'https://placehold.net/400x400.png'}
                    alt="movie"
                    width={70}
                    style={{ borderRadius: 8 }}
                />
            ),
            width: 100,
            fixed: 'left',
        },
        {
            title: 'Trailer',
            dataIndex: 'trailer',
            key: 'trailer',
            render: (url) =>
                getMediaUrl(url) ? (
                    <Button
                        type="link"
                        size="small"
                        onClick={() =>
                            Modal.info({
                                title: 'Xem Trailer',
                                width: 800,
                                centered: true,
                                maskClosable: true,
                                content: (
                                    <video
                                        src={getMediaUrl(url)}
                                        controls
                                        autoPlay
                                        style={{
                                            width: '100%',
                                            borderRadius: 10,
                                            marginTop: 12,
                                        }}
                                    />
                                ),
                            })
                        }
                    >
                        Xem trailer
                    </Button>
                ) : (
                    <span style={{ color: '#999' }}>-</span>
                ),
            width: 120,
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            width: 250,
            sorter: (a, b) => a.title.localeCompare(b.title),
            render: (title) => (
                <div className="font-medium text-gray-900 line-clamp-2">{title}</div>
            ),
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            width: 80,
            filters: [
                { text: '2D', value: '2D' },
                { text: '3D', value: '3D' },
            ],
            onFilter: (value, record) => record.type === value,
            render: (type) => (
                <Tag color={type === '2D' ? 'green' : 'purple'}>{type === '2D' ? '2D' : '3D'}</Tag>
            ),
        },
        {
            title: 'Độ tuổi',
            dataIndex: 'ageRating',
            key: 'ageRating',
            width: 100,
            filters: [
                { text: 'P', value: 'P' },
                { text: 'K', value: 'K' },
                { text: 'T13', value: 'T13' },
                { text: 'T16', value: 'T16' },
                { text: 'T18', value: 'T18' },
                { text: 'C', value: 'C' },
            ],
            onFilter: (value, record) => record.ageRating === value,
            render: (ageRating) => {
                const colorMap = {
                    P: 'green',
                    K: 'cyan',
                    T13: 'blue',
                    T16: 'orange',
                    T18: 'red',
                    C: 'volcano',
                };
                return ageRating ? <Tag color={colorMap[ageRating]}>{ageRating}</Tag> : '-';
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 150,
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => handleViewDetail(record)}
                        title="Xem chi tiết"
                    />
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        title="Chỉnh sửa"
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa phim này?"
                        okText="Có"
                        cancelText="Không"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button type="primary" danger icon={<DeleteOutlined />} title="Xóa" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Header: tiêu đề + nút thêm phim */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                }}
            >
                <Title level={2} style={{ margin: 0 }}>
                    Quản lý phim
                </Title>
                <Button
                    className="bg-primary"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                    Thêm phim
                </Button>
            </div>

            {/* Tìm kiếm */}
            <Card>
                <div
                    style={{
                        marginBottom: 16,
                    }}
                >
                    <Search
                        placeholder="Tìm theo tiêu đề hoặc xuất xứ"
                        allowClear
                        enterButton={<SearchOutlined />}
                        onSearch={(value) => {
                            setKeyword(value.trim());
                            setPage(0);
                        }}
                        style={{ width: 300 }}
                    />
                </div>

                {/* Bảng danh sách phim */}
                <Table
                    dataSource={movies}
                    loading={loading}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    scroll={{ x: 1000 }}
                />

                <div className="mt-4 flex justify-end">
                    <Pagination
                        current={page + 1}
                        pageSize={pageSize}
                        total={total}
                        onChange={(p, s) => {
                            setPage(p - 1);
                            setPageSize(s);
                        }}
                        pageSizeOptions={['5', '10', '20', '50', '100']}
                        showSizeChanger
                        showQuickJumper
                        showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} phim`}
                    />
                </div>
            </Card>

            <Modal
                title={isEditMode ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
                open={isModalVisible}
                onOk={handleModalOk}
                onCancel={() => {
                    if (isUploadingMedia) return;
                    setIsModalVisible(false);
                    setEditingMovie(null);
                    setIsEditMode(false);
                    setImageList([]);
                    setPreviewImage('');
                    setTrailerList([]);
                    setImageFile(null);
                    setTrailerFile(null);
                    setImageUploadProgress(0);
                    setTrailerUploadProgress(0);
                    setUploadedImageAsset(null);
                    setUploadedTrailerAsset(null);
                    setIsImageMarkedForDeletion(false);
                    setIsTrailerMarkedForDeletion(false);

                    form.resetFields();
                }}
                okText={isEditMode ? 'Cập nhật' : 'Thêm'}
                cancelText="Hủy"
                okButtonProps={{
                    loading: loading || isUploadingMedia,
                    disabled: isUploadingMedia,
                }}
                cancelButtonProps={{ disabled: isUploadingMedia }}
                closable={!isUploadingMedia}
                maskClosable={!isUploadingMedia}
                keyboard={!isUploadingMedia}
                centered
            >
                <div data-lenis-prevent>
                    <Form
                        form={form}
                        layout="vertical"
                        name="movieForm"
                        disabled={isUploadingMedia}
                        className="!max-h-[500px] !overflow-y-auto"
                    >
                        <Form.Item
                            name="title"
                            label="Tiêu đề phim"
                            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="author"
                            label="Tác giả"
                            rules={[{ required: true, message: 'Vui lòng nhập tên tác giả!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="actors"
                            label="Diễn viên"
                            rules={[{ required: true, message: 'Vui lòng nhập tên diễn viên!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="origin"
                            label="Xuất xứ"
                            rules={[{ required: true, message: 'Vui lòng nhập xuất xứ!' }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="duration"
                            label="Thời lượng (phút)"
                            rules={[{ required: true, message: 'Vui lòng nhập thời lượng!' }]}
                        >
                            <Input type="number" />
                        </Form.Item>

                        <Form.Item
                            name="type"
                            label="Loại phim"
                            rules={[{ required: true, message: 'Vui lòng chọn loại phim!' }]}
                        >
                            <select style={{ width: '100%', height: 32 }}>
                                <option value="">-- Chọn loại --</option>
                                <option value="2D">2D</option>
                                <option value="3D">3D</option>
                            </select>
                        </Form.Item>

                        <Form.Item
                            name="ageRating"
                            label="Phân loại độ tuổi"
                            rules={[{ required: true, message: 'Vui lòng chọn độ tuổi!' }]}
                        >
                            <select style={{ width: '100%', height: 32 }}>
                                <option value="">-- Chọn độ tuổi --</option>
                                <option value="P">P - Phim dành cho mọi lứa tuổi</option>
                                <option value="K">
                                    K - Phim dành cho trẻ em dưới 13 tuổi có người giám hộ
                                </option>
                                <option value="T13">
                                    T13 - Phim dành cho khán giả từ 13 tuổi trở lên
                                </option>
                                <option value="T16">
                                    T16 - Phim dành cho khán giả từ 16 tuổi trở lên
                                </option>
                                <option value="T18">
                                    T18 - Phim dành cho khán giả từ 18 tuổi trở lên
                                </option>
                                <option value="C">C - Phim bị cấm phổ biến</option>
                            </select>
                        </Form.Item>

                        <Form.Item
                            name="genres"
                            label="Thể loại"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ít nhất một thể loại!',
                                },
                            ]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn thể loại..."
                                optionFilterProp="children"
                                showSearch
                            >
                                {genres.map((genre) => (
                                    <Select.Option key={genre.id} value={genre.id}>
                                        {genre.genreName || genre.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="releaseDate"
                            label="Ngày khởi chiếu"
                            rules={[
                                { required: true, message: 'Vui lòng chọn ngày khởi chiếu!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const endDateValue = getFieldValue('endDate');

                                        if (!value || !endDateValue) {
                                            return Promise.resolve();
                                        }

                                        if (new Date(value) >= new Date(endDateValue)) {
                                            return Promise.reject(
                                                new Error(
                                                    'Ngày khởi chiếu phải nhỏ hơn ngày kết thúc!',
                                                ),
                                            );
                                        }

                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item
                            name="endDate"
                            label="Ngày kết thúc"
                            dependencies={['releaseDate']}
                            rules={[
                                { required: true, message: 'Vui lòng chọn ngày kết thúc!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const releaseDateValue = getFieldValue('releaseDate');

                                        if (!value || !releaseDateValue) {
                                            return Promise.resolve();
                                        }

                                        if (new Date(value) <= new Date(releaseDateValue)) {
                                            return Promise.reject(
                                                new Error(
                                                    'Ngày kết thúc phải lớn hơn ngày khởi chiếu!',
                                                ),
                                            );
                                        }

                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <Input type="date" />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[{ required: true, message: 'Vui lòng nhập mô tả phim!' }]}
                        >
                            <Input.TextArea rows={3} />
                        </Form.Item>

                        <Form.Item label="Poster (ảnh)">
                            <Upload
                                accept="image/*"
                                maxCount={1}
                                listType="picture"
                                disabled={isUploadingMedia}
                                fileList={imageList} //   liên kết danh sách ảnh
                                beforeUpload={(file) => {
                                    if (isUploadingMedia) {
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
                                            status: 'done',
                                            url: previewUrl,
                                        },
                                    ]);
                                    return false;
                                }}
                                onRemove={() => {
                                    if (isUploadingMedia) return false;
                                    setImageFile(null);
                                    setImageUploadProgress(0);
                                    setUploadedImageAsset(null);
                                    setIsImageMarkedForDeletion(true);
                                    setImageList([]);
                                    setPreviewImage('');
                                }}
                            >
                                <Button icon={<UploadOutlined />}>
                                    {imageList.length > 0 ? 'Chọn lại ảnh' : 'Chọn ảnh'}
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
                                    status={imageUploadProgress === 100 ? 'success' : 'active'}
                                    className="mt-2"
                                />
                            )}
                            {uploadedImageAsset && (
                                <Text type="success" className="mt-2 block">
                                    Đã upload lên Cloudinary, chờ lưu movie.
                                </Text>
                            )}
                        </Form.Item>

                        <Form.Item label="Trailer (video)">
                            <Upload
                                accept="video/*"
                                maxCount={1}
                                disabled={isUploadingMedia}
                                fileList={trailerList} //   liên kết danh sách trailer
                                beforeUpload={(file) => {
                                    if (isUploadingMedia) {
                                        return Upload.LIST_IGNORE;
                                    }
                                    setTrailerFile(file);
                                    setTrailerUploadProgress(0);
                                    setUploadedTrailerAsset(null);
                                    setIsTrailerMarkedForDeletion(false);
                                    setTrailerList([
                                        {
                                            uid: file.uid,
                                            name: file.name,
                                            status: 'done',
                                            url: URL.createObjectURL(file),
                                        },
                                    ]);
                                    return false;
                                }}
                                onRemove={() => {
                                    if (isUploadingMedia) return false;
                                    setTrailerFile(null);
                                    setTrailerUploadProgress(0);
                                    setUploadedTrailerAsset(null);
                                    setIsTrailerMarkedForDeletion(true);
                                    setTrailerList([]);
                                }}
                            >
                                <Button icon={<UploadOutlined />}>
                                    {trailerList.length > 0 ? 'Chọn lại trailer' : 'Chọn trailer'}
                                </Button>
                            </Upload>
                            {trailerFile && (
                                <Progress
                                    percent={trailerUploadProgress}
                                    size="small"
                                    status={trailerUploadProgress === 100 ? 'success' : 'active'}
                                    className="mt-2"
                                />
                            )}
                            {uploadedTrailerAsset && (
                                <Text type="success" className="mt-2 block">
                                    Đã upload lên Cloudinary, chờ lưu movie.
                                </Text>
                            )}
                        </Form.Item>
                    </Form>
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title={<div className="text-xl font-bold">Chi tiết phim</div>}
                open={isDetailModalVisible}
                onCancel={() => {
                    if (detailLoading) return;
                    setIsDetailModalVisible(false);
                    setViewingMovie(null);
                }}
                footer={
                    <div className="flex gap-3 justify-end">
                        <Button
                            onClick={() => {
                                setIsDetailModalVisible(false);
                                setViewingMovie(null);
                            }}
                            disabled={detailLoading}
                        >
                            Đóng
                        </Button>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            disabled={detailLoading || !viewingMovie}
                            onClick={() => {
                                setIsDetailModalVisible(false);
                                handleEdit(viewingMovie);
                            }}
                        >
                            Chỉnh sửa
                        </Button>
                    </div>
                }
                width={900}
                centered
                className="movie-detail-modal"
            >
                {detailLoading ? (
                    <div className="py-10 text-center">
                        <Text>Đang tải chi tiết phim...</Text>
                    </div>
                ) : (
                    viewingMovie && (
                        <div
                            className="space-y-6 max-h-[600px] overflow-y-auto pr-2"
                            data-lenis-prevent
                        >
                            {/* Image & Trailer Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 flex flex-col">
                                    <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                                        Poster
                                    </div>
                                    <Image
                                        src={
                                            getMediaUrl(viewingMovie.image) ||
                                            'https://placehold.net/400x600.png'
                                        }
                                        alt={viewingMovie.title}
                                        className="w-full !rounded-lg"
                                        style={{
                                            maxHeight: 300,
                                            objectFit: 'cover',
                                        }}
                                        rootClassName="!w-full !flex-1"
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                                        Trailer
                                    </div>
                                    {getMediaUrl(viewingMovie.trailer) ? (
                                        <video
                                            src={getMediaUrl(viewingMovie.trailer)}
                                            controls
                                            className="w-full rounded-lg shadow-md flex-1 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-[300px] bg-gray-100 rounded-lg flex items-center justify-center">
                                            <span className="text-gray-400">Không có trailer</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="!bg-white p-6 rounded-lg border border-blue-200">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                                    {viewingMovie.title}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 font-medium">
                                            Loại phim:
                                        </span>
                                        <Tag
                                            color={viewingMovie.type === '2D' ? 'green' : 'purple'}
                                        >
                                            {viewingMovie.type === '2D' ? '2D' : '3D'}
                                        </Tag>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 font-medium">Độ tuổi:</span>
                                        <Tag
                                            color={
                                                {
                                                    P: 'green',
                                                    K: 'cyan',
                                                    T13: 'blue',
                                                    T16: 'orange',
                                                    T18: 'red',
                                                    C: 'volcano',
                                                }[viewingMovie.ageRating]
                                            }
                                        >
                                            {viewingMovie.ageRating}
                                        </Tag>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-600 font-medium">
                                            Thời lượng:
                                        </span>
                                        <span className="font-semibold text-gray-800">
                                            {viewingMovie.duration} phút
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Information */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Tác giả/Đạo diễn
                                        </div>
                                        <div className="text-base font-medium text-gray-800">
                                            {viewingMovie.author || '-'}
                                        </div>
                                    </div>
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Diễn viên
                                        </div>
                                        <div className="text-base text-gray-800">
                                            {Array.isArray(viewingMovie.actors)
                                                ? viewingMovie.actors.join(', ')
                                                : viewingMovie.actors || '-'}
                                        </div>
                                    </div>
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Xuất xứ
                                        </div>
                                        <div className="text-base text-gray-800">
                                            {viewingMovie.origin || '-'}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Ngày khởi chiếu
                                        </div>
                                        <div className="text-base font-medium text-gray-800">
                                            {viewingMovie.releaseDate || '-'}
                                        </div>
                                    </div>
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Ngày kết thúc
                                        </div>
                                        <div className="text-base font-medium text-gray-800">
                                            {viewingMovie.endDate || '-'}
                                        </div>
                                    </div>
                                    <div className="!bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                                            Thể loại
                                        </div>
                                        <div className="flex flex-wrap">
                                            {viewingMovie.genres &&
                                            viewingMovie.genres.length > 0 ? (
                                                viewingMovie.genres.map((genre) => (
                                                    <Tag key={genre.id} color="blue">
                                                        {genre.genreName || genre.name}
                                                    </Tag>
                                                ))
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="!bg-amber-50 p-6 rounded-lg border border-amber-200">
                                <div className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                    Mô tả phim
                                </div>
                                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {viewingMovie.description || 'Chưa có mô tả'}
                                </div>
                            </div>
                        </div>
                    )
                )}
            </Modal>
        </div>
    );
};

export default MovieManagement;
