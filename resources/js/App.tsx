import React, { useCallback, useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { BagPage } from './pages/BagPage';
import { HomePage } from './pages/HomePage';
import { SellerAddProductPage } from './pages/seller/SellerAddProductPage';
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage';
import type { ViewMode, AccountSection } from './types';
import 'react-toastify/dist/ReactToastify.css';

const VALID_ACCOUNT_SECTIONS: AccountSection[] = [
    'details',
    'addresses',
    'preferences',
    'cashback',
    'wallet',
    'wishlist',
    'orders',
    'reviews',
    'cards',
    'zvip',
    'seller',
    'verification',
    'delete-account',
];

const AppContent: React.FC = () => {
    const { authUser, logout } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const savedViewMode = localStorage.getItem('ui_view_mode');
        if (savedViewMode === 'home' || savedViewMode === 'auth' || savedViewMode === 'account' || savedViewMode === 'bag') {
            return savedViewMode as ViewMode;
        }

        if (savedViewMode === 'seller') {
            return savedViewMode as ViewMode;
        }

        return 'home';
    });

    const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
        const savedAuthMode = localStorage.getItem('ui_auth_mode');
        return savedAuthMode === 'register' ? 'register' : 'login';
    });

    const [accountSection, setAccountSection] = useState<AccountSection>(() => {
        const savedAccountSection = localStorage.getItem('account_section');

        return VALID_ACCOUNT_SECTIONS.includes(savedAccountSection as AccountSection)
            ? (savedAccountSection as AccountSection)
            : 'details';
    });

    const [sellerSubView, setSellerSubView] = useState<'dashboard' | 'add-product'>('dashboard');

    useEffect(() => {
        localStorage.setItem('ui_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('ui_auth_mode', authMode);
    }, [authMode]);

    useEffect(() => {
        localStorage.setItem('account_section', accountSection);
    }, [accountSection]);

    const applyRouteFromLocation = useCallback(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        if (segments.length === 0) {
            setViewMode('home');
            return;
        }

        if (segments[0] === 'login') {
            setAuthMode('login');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'register') {
            setAuthMode('register');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'account') {
            setViewMode('account');
            const sectionFromPath = segments[1] as AccountSection | undefined;
            const section = sectionFromPath && VALID_ACCOUNT_SECTIONS.includes(sectionFromPath)
                ? sectionFromPath
                : 'details';
            setAccountSection(section);
            return;
        }

        if (segments[0] === 'bag') {
            setViewMode('bag');
            return;
        }

        if (segments[0] === 'seller') {
            setViewMode('seller');
            setSellerSubView(segments[1] === 'add-product' ? 'add-product' : 'dashboard');
            return;
        }

        setViewMode('home');
    }, []);

    const handleNavigateHome = () => {
        setViewMode('home');
        window.history.pushState({}, '', '/');
    };

    const handleNavigateBag = () => {
        setViewMode('bag');
        window.history.pushState({}, '', '/bag');
        window.scrollTo(0, 0);
    };

    const handleNavigateLogin = () => {
        setAuthMode('login');
        setViewMode('auth');
        window.history.pushState({}, '', '/login');
        window.scrollTo(0, 0);
    };

    const handleNavigateRegister = () => {
        setAuthMode('register');
        setViewMode('auth');
        window.history.pushState({}, '', '/register');
        window.scrollTo(0, 0);
    };

    const handleNavigateAccount = (section: AccountSection = 'details') => {
        setAccountSection(section);
        setViewMode('account');
        const path = section && section !== 'details' ? `/account/${section}` : '/account';
        window.history.pushState({}, '', path);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerDashboard = () => {
        setSellerSubView('dashboard');
        setViewMode('seller');
        window.history.pushState({}, '', '/seller/dashboard');
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerAddProduct = () => {
        setSellerSubView('add-product');
        setViewMode('seller');
        window.history.pushState({}, '', '/seller/add-product');
        window.scrollTo(0, 0);
    };

    const handleLogout = () => {
        logout();
        localStorage.removeItem('ui_auth_mode');
        localStorage.removeItem('account_section');
        setViewMode('home');
        toast.success('Logged out successfully.', {
            autoClose: 2500,
        });
    };

    const handleAccountDeleted = () => {
        logout();
        setViewMode('home');
        window.scrollTo(0, 0);
    };

    const handleNavigateOrdersLogin = () => {
        localStorage.setItem(
            'post_login_target',
            JSON.stringify({ viewMode: 'account', section: 'orders' as AccountSection })
        );
        setAuthMode('login');
        setViewMode('auth');
        window.history.pushState({}, '', '/login');
        window.scrollTo(0, 0);
    };

    const handleAuthSuccess = () => {
        const targetRaw = localStorage.getItem('post_login_target');

        if (targetRaw) {
            try {
                const parsed = JSON.parse(targetRaw) as {
                    viewMode?: ViewMode;
                    section?: AccountSection;
                };

                localStorage.removeItem('post_login_target');

                if (parsed.viewMode === 'account') {
                    const section = parsed.section && VALID_ACCOUNT_SECTIONS.includes(parsed.section)
                        ? parsed.section
                        : 'details';
                    setAccountSection(section);
                    setViewMode('account');
                    const path = section && section !== 'details' ? `/account/${section}` : '/account';
                    window.history.pushState({}, '', path);
                    window.scrollTo(0, 0);
                    return;
                }
            } catch {
                localStorage.removeItem('post_login_target');
            }
        }

        setAccountSection('details');
        setViewMode('account');
        window.history.pushState({}, '', '/account');
        window.scrollTo(0, 0);
    };

    useEffect(() => {
        const onPopState = () => {
            applyRouteFromLocation();
        };

        window.addEventListener('popstate', onPopState);
        window.dispatchEvent(new PopStateEvent('popstate'));

        return () => {
            window.removeEventListener('popstate', onPopState);
        };
    }, [applyRouteFromLocation]);

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
                onNavigateOrdersLogin={handleNavigateOrdersLogin}
                onNavigateBag={handleNavigateBag}
                onLogout={handleLogout}
            />

            {viewMode !== 'seller' && <Navigation />}

            {viewMode === 'home' && <HomePage onNavigateToRegister={handleNavigateRegister} />}

            {viewMode === 'bag' && <BagPage onNavigateHome={handleNavigateHome} />}

            {(viewMode === 'auth' || ((viewMode === 'account' || viewMode === 'seller') && !authUser)) && (
                <AuthPage
                    mode={(viewMode === 'account' || viewMode === 'seller') && !authUser ? 'login' : authMode}
                    onModeChange={setAuthMode}
                    onAuthSuccess={handleAuthSuccess}
                />
            )}

            {viewMode === 'account' && authUser && (
                <AccountPage
                    activeSection={accountSection}
                    onSectionChange={handleNavigateAccount}
                    onAccountDeleted={handleAccountDeleted}
                />
            )}

            {viewMode === 'seller' && authUser && sellerSubView === 'dashboard' && (
                <SellerDashboardPage onNavigateAddProduct={handleNavigateSellerAddProduct} />
            )}

            {viewMode === 'seller' && authUser && sellerSubView === 'add-product' && (
                <SellerAddProductPage onNavigateDashboard={handleNavigateSellerDashboard} />
            )}

            {viewMode !== 'seller' && <Footer />}

            {viewMode !== 'seller' && (
                <button className="chat-button" aria-label="Help">
                    <span>A</span>
                </button>
            )}

            <ToastContainer
                position="top-center"
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnHover
                style={{ position: 'fixed', zIndex: 12000 }}
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
