import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from './Loading';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, isAdmin } = useAuth();
    const location = useLocation();
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

    if (!isAdmin()) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
