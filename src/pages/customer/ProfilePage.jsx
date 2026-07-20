import { useEffect, useState } from 'react';
import { App, Avatar, Button, Card, Divider, Form, Input, Modal, Select, Space, Typography, Upload } from 'antd';
import { LockOutlined, UserOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { apiClient } from '../../config';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text } = Typography;
const genderOptions = [
    { label: 'Nam', value: 'MALE' },
    { label: 'Nữ', value: 'FEMALE' },
    { label: 'Khác', value: 'OTHER' },
];

const ProfilePage = () => {
    const { logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const { message } = App.useApp();

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/users/me/profile');
            const data = response.data.data;
            setProfile(data);
            setAvatarPreview(data.avatar || null);
            profileForm.setFieldsValue({
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone || '',
                address: data.address || '',
                age: data.age || '',
                gender: data.gender || 'OTHER',
            });
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể tải hồ sơ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleProfileSave = async () => {
        try {
            const values = await profileForm.validateFields();
            const formData = new FormData();

            Object.entries(values).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    formData.append(key, value);
                }
            });

            if (avatarFile) {
                formData.append('avatar', avatarFile);
            }

            await apiClient.patch('/users/me/profile', formData);
            message.success('Cập nhật hồ sơ thành công');
            setAvatarFile(null);
            fetchProfile();
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể cập nhật hồ sơ');
        }
    };

    const handlePasswordChange = async () => {
        try {
            const values = await passwordForm.validateFields();
            await apiClient.patch('/users/me/change-password', values);
            message.success('Đổi mật khẩu thành công');
            setIsPasswordModalOpen(false);
            passwordForm.resetFields();
            await logout();
        } catch (error) {
            message.error(error.response?.data?.message || 'Không thể đổi mật khẩu');
        }
    };

    const handleAvatarBeforeUpload = (file) => {
        const isValidType = file.type.startsWith('image/');
        if (!isValidType) {
            message.error('Chỉ chấp nhận ảnh');
            return false;
        }
        if (file.size > 2 * 1024 * 1024) {
            message.error('Kích thước ảnh không vượt quá 2MB');
            return false;
        }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
        return false;
    };

    const handleAvatarRemove = () => {
        setAvatarFile(null);
        setAvatarPreview(profile?.avatar || null);
    };

    return (
        <div className="max-w-5xl mx-auto py-6">
            <Card loading={loading}>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center">
                        <Avatar size={96} src={avatarPreview || undefined} icon={!avatarPreview && <UserOutlined />} />
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={handleAvatarBeforeUpload}
                            onRemove={handleAvatarRemove}
                        >
                            <Button icon={<UploadOutlined />} size="small" className="mt-3">
                                Tải avatar lên
                            </Button>
                        </Upload>
                        <Title level={3} style={{ marginBottom: 4, marginTop: 12 }}>
                            {profile?.firstName} {profile?.lastName}
                        </Title>
                        <Text type="secondary">{profile?.email}</Text>
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <Title level={4} style={{ margin: 0 }}>Thông tin cá nhân</Title>
                            <Space>
                                <Button icon={<LockOutlined />} onClick={() => setIsPasswordModalOpen(true)}>
                                    Đổi mật khẩu
                                </Button>
                                <Button type="primary" icon={<SaveOutlined />} onClick={handleProfileSave}>
                                    Lưu thay đổi
                                </Button>
                            </Space>
                        </div>
                        <Divider />
                        <Form form={profileForm} layout="vertical">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Form.Item name="firstName" label="Họ" rules={[{ required: true, message: 'Vui lòng nhập họ' }]}> 
                                    <Input />
                                </Form.Item>
                                <Form.Item name="lastName" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}> 
                                    <Input />
                                </Form.Item>
                                <Form.Item name="phone" label="Số điện thoại">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="age" label="Tuổi">
                                    <Input type="number" />
                                </Form.Item>
                                <Form.Item name="address" label="Địa chỉ">
                                    <Input />
                                </Form.Item>
                                <Form.Item name="gender" label="Giới tính">
                                    <Select options={genderOptions} />
                                </Form.Item>
                            </div>
                        </Form>
                    </div>
                </div>
            </Card>

            <Modal
                title="Đổi mật khẩu"
                open={isPasswordModalOpen}
                onCancel={() => setIsPasswordModalOpen(false)}
                onOk={handlePasswordChange}
                okText="Xác nhận"
                cancelText="Hủy"
                centered
            >
                <Form form={passwordForm} layout="vertical">
                    <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true }]}> 
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 6 }]}> 
                        <Input.Password />
                    </Form.Item>
                    <Form.Item
                        name="confirmPassword"
                        label="Xác nhận mật khẩu mới"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu không khớp'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProfilePage;
