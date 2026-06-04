import { Form, Input, Button, Card, Typography, Divider, App } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { Loading } from '../../components';

const { Title, Text } = Typography;

const Login = () => {
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { message } = App.useApp();
    const { state } = useLocation();
    const onFinish = async (values) => {
        try {
            setLoading(true);
            const isAdmin = await login(values);
            message.success('Đăng nhập thành công!');
            navigate(isAdmin ? '/admin' : '/unauthorized');
        } catch (error) {
            console.log(error);
            message.error(error.response.data?.message || 'Đăng nhập thất bại!');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex w-full items-center justify-center bg-[#10141b]">
                <Loading tip="Đang xác thực tài khoản..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-900 to-gray-800 px-4">
            <Card
                className="w-full max-w-lg shadow-2xl! bg-linear-to-br! from-gray-900! to-gray-700! card-border"
                styles={{ body: { padding: '2rem' } }}
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 btn-primary">
                        <LoginOutlined className="text-2xl! text-white!" />
                    </div>
                    <Title level={2} className="mb-2! text-white/95! font-bold!">
                        Đăng nhập
                    </Title>
                    <Text className="text-white/80!">Chào mừng bạn quay trở lại</Text>
                </div>

                <Form name="login" onFinish={onFinish} size="large" layout="vertical">
                    <Form.Item
                        name="email"
                        label={<span className="text-white">Email</span>}
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' },
                        ]}
                    >
                        <Input prefix={<UserOutlined />} placeholder="Email" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<span className="text-white">Mật khẩu</span>}
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
                    </Form.Item>

                    <Form.Item className="mt-12!">
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="w-full h-12 font-medium btn-primary"
                        >
                            Đăng nhập
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default Login;
