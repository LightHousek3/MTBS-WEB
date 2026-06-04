import { useAuth } from '../contexts/AuthContext';
import Loading from './Loading';

const PublicRoute = ({ children }) => {
    const { loading, tipLoading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex w-full items-center justify-center bg-[#10141b]">
                {tipLoading ? <Loading tip={tipLoading} /> : <Loading />}
            </div>
        );
    }

    return children;
};

export default PublicRoute;
