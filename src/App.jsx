import { ConfigProvider, App as AppAntd } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PublicRoute, ProtectedRoute, GlobalAuthListener, AdminLayout } from './components';
import { NotFound, UnAuthorized } from './pages/error';
import { Login } from './pages/auth';

function App() {
    return (
        <ConfigProvider
            modal={{
                afterOpenChange: (open) => {
                    document.body.style.overflow = open ? 'hidden' : 'auto';
                },
            }}
            locale={viVN}
        >
            <AppAntd>
                <AuthProvider>
                    <Router>
                        <GlobalAuthListener />
                        <Routes>
                            <Route path="/" element={<Navigate to="/login" replace />} />
                            <Route
                                path="/login"
                                element={
                                    <PublicRoute>
                                        <Login />
                                    </PublicRoute>
                                }
                            />
                            {/* Protected admin routes */}
                            <Route
                                path="/admin"
                                element={<ProtectedRoute>{<AdminLayout />}</ProtectedRoute>}
                            >
                                <Route index element={<NotFound />} />
                            </Route>
                            {/* Error pages */}
                            <Route path="/unauthorized" element={<UnAuthorized />} />

                            {/* Redirects */}
                            <Route path="*" element={<NotFound />} />
                        </Routes>
                    </Router>
                </AuthProvider>
            </AppAntd>
        </ConfigProvider>
    );
}

export default App;
