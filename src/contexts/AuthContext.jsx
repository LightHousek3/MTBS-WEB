import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../apis';
import { deviceId, clearAccessToken, setAccessToken, subscribeAccessToken } from '../config';

const AuthContext = createContext();
let bootstrapAuthPromise = null;

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    // Restore session by rotating refresh token from httpOnly cookie.
    useEffect(() => {
        const unsubscribe = subscribeAccessToken(setToken);
        let mounted = true;

        const initAuth = async () => {
            try {
                if (!bootstrapAuthPromise) {
                    bootstrapAuthPromise = authAPI.refreshToken().finally(() => {
                        bootstrapAuthPromise = null;
                    });
                }

                const response = await bootstrapAuthPromise;
                const { accessToken, user } = response.data.data;

                if (!mounted) return;
                setAccessToken(accessToken);
                setUser(user);
            } catch (error) {
                if (!mounted) return;

                clearAccessToken();
                setUser(null);
                console.log(error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, []);

    // Login function
    const login = async (credentials) => {
        const response = await authAPI.login({ deviceId, ...credentials });
        const {
            tokens: { accessToken },
            user,
        } = response.data.data;
        console.log('user', user);
        setAccessToken(accessToken);
        setUser(user);

        return user?.role === 'ADMIN';
    };

    // Logout function
    const logout = async () => {
        try {
            await authAPI.logout();
            clearAccessToken();
            setUser(null);
        } catch (error) {
            console.log(error);
            clearAccessToken();
            setUser(null);
        }
    };

    // Check if user is admin
    const isAdmin = () => user?.role === 'ADMIN';

    const value = {
        user,
        loading,
        login,
        logout,
        isAdmin,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
