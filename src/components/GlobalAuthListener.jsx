import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GlobalAuthListener = () => {
    const navigate = useNavigate(); // Hook này hoạt động vì component này sẽ đặt trong <Router>

    useEffect(() => {
        const handleUnauthorized = () => {
            navigate('/login', { replace: true });
        };

        window.addEventListener('auth-unauthorized', handleUnauthorized);

        // Cleanup listener when unmount
        return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
    }, [navigate]);

    return null;
};

export default GlobalAuthListener;
