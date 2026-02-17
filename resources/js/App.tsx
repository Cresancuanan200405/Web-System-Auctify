import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { AccountPage } from './pages/AccountPage';
import { ViewMode, AccountSection } from './types';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppContent: React.FC = () => {
    const { authUser, logout } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('home');
    const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
    const [accountSection, setAccountSection] = useState<AccountSection>('details');

    const handleNavigateHome = () => {
        setViewMode('home');
    };

    const handleNavigateLogin = () => {
        setAuthMode('login');
        setViewMode('auth');
        window.scrollTo(0, 0);
    };

    const handleNavigateRegister = () => {
        setAuthMode('register');
        setViewMode('auth');
        window.scrollTo(0, 0);
    };

    const handleNavigateAccount = (section: AccountSection = 'details') => {
        setAccountSection(section);
        setViewMode('account');
        window.scrollTo(0, 0);
    };

    const handleLogout = () => {
        logout();
        setViewMode('home');
    };

    const handleAccountDeleted = () => {
        logout();
        setViewMode('home');
        window.scrollTo(0, 0);
    };

    const handleAuthSuccess = () => {
        setAccountSection('details');
        setViewMode('account');
        window.scrollTo(0, 0);
    };

    return (
        <div className="page">
            <div className="promo-banner">
                <div className="promo-item">
                    🎯 7 Days Free Returns | T&C Apply
                </div>
                <div className="promo-item">
                    ⭐ Become an AUCTIFY VIP today!
                </div>
                <div className="promo-item">
                    📱 Save more on the AUCTIFY App! 25% Off + ₱150 Off + Free Shipping
                </div>
            </div>

            <Header
                onNavigateHome={handleNavigateHome}
                onNavigateLogin={handleNavigateLogin}
                onNavigateRegister={handleNavigateRegister}
                onNavigateAccount={handleNavigateAccount}
                onLogout={handleLogout}
            />

            <Navigation />

            {viewMode === 'home' && <HomePage onNavigateToRegister={handleNavigateRegister} />}

            {viewMode === 'auth' && (
                <AuthPage
                    mode={authMode}
                    onModeChange={setAuthMode}
                    onAuthSuccess={handleAuthSuccess}
                />
            )}

            {viewMode === 'account' && authUser && (
                <AccountPage
                    activeSection={accountSection}
                    onSectionChange={setAccountSection}
                    onAccountDeleted={handleAccountDeleted}
                />
            )}

            <Footer />

            <button className="chat-button" aria-label="Help">
                <span>A</span>
            </button>

            <ToastContainer
                position="top-center"
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnHover
                style={{ position: 'fixed', zIndex: 9999 }}
            />
        </div>
    );
};

export const App: React.FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};
