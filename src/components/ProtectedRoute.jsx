import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children, adminOnly = true }) => {
    const { isAuthenticated, loading, isAdmin } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen w-full flex justify-center items-center">
                <Loading tip="Đang tải dữ liệu" text="dark" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
