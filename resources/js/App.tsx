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
    const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('ui_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('ui_auth_mode', authMode);
    }, [authMode]);

    useEffect(() => {
        localStorage.setItem('account_section', accountSection);
    }, [accountSection]);

    useEffect(() => {
        if (!authUser) {
            return;
        }

        const pendingToastRaw = sessionStorage.getItem('post_auth_success_toast');

        if (!pendingToastRaw) {
            return;
        }

        sessionStorage.removeItem('post_auth_success_toast');

        try {
            const pendingToast = JSON.parse(pendingToastRaw) as { message?: string; autoClose?: number };

            if (pendingToast.message) {
                toast.success(pendingToast.message, {
                    autoClose: typeof pendingToast.autoClose === 'number' ? pendingToast.autoClose : 3500,
                });
            }
        } catch {
            toast.success('Signed in successfully.', { autoClose: 3500 });
        }
    }, [authUser]);

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

            {viewMode === 'seller' && (
                <button
                    className="seller-chat-button"
                    aria-label="Seller chat support"
                    onClick={() => setIsSellerChatOpen(true)}
                >
                    <span className="seller-chat-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" role="img" focusable="false">
                            <path
                                fill="currentColor"
                                d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.25 3.4A.75.75 0 0 1 4.5 18.8V16.8A2.5 2.5 0 0 1 4 16V5.5Zm2.5-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1.25a.75.75 0 0 1 .75.75v1.99l3.34-2.67a.75.75 0 0 1 .47-.17h8.18a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-11Z"
                            />
                        </svg>
                    </span>
                    <span className="seller-chat-label">Chat</span>
                </button>
            )}

            {viewMode === 'seller' && isSellerChatOpen && (
                <div
                    className="seller-chat-dialog-backdrop"
                    role="presentation"
                    onClick={() => setIsSellerChatOpen(false)}
                >
                    <div
                        className="seller-chat-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Seller chat"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="seller-chat-dialog-header">
                            <h3>Chat</h3>
                            <button
                                type="button"
                                className="seller-chat-close-btn"
                                onClick={() => setIsSellerChatOpen(false)}
                                aria-label="Close chat dialog"
                            >
                                ×
                            </button>
                        </header>

                        <div className="seller-chat-dialog-content">
                            <aside className="seller-chat-left-panel">
                                <div className="seller-chat-tools">
                                    <input
                                        className="seller-chat-search"
                                        type="text"
                                        placeholder="Search name"
                                    />
                                    <select className="seller-chat-filter" defaultValue="all">
                                        <option value="all">All</option>
                                        <option value="unread">Unread</option>
                                        <option value="pinned">Pinned</option>
                                    </select>
                                </div>

                                <div className="seller-chat-thread-list">
                                    <button type="button" className="seller-chat-thread active">
                                        <div className="seller-chat-avatar">M</div>
                                        <div className="seller-chat-thread-body">
                                            <p className="seller-chat-thread-name">midoko</p>
                                            <p className="seller-chat-thread-preview">midoko:mail...</p>
                                        </div>
                                    </button>

                                    <button type="button" className="seller-chat-thread">
                                        <div className="seller-chat-avatar">U</div>
                                        <div className="seller-chat-thread-body">
                                            <p className="seller-chat-thread-name">Unkey.Home</p>
                                            <p className="seller-chat-thread-preview">Salamat sa iyong ...</p>
                                        </div>
                                    </button>

                                    <button type="button" className="seller-chat-thread">
                                        <div className="seller-chat-avatar">C</div>
                                        <div className="seller-chat-thread-body">
                                            <p className="seller-chat-thread-name">crazystyleshop</p>
                                            <p className="seller-chat-thread-preview">Maraming salamat...</p>
                                        </div>
                                    </button>
                                </div>
                            </aside>

                            <main className="seller-chat-empty-pane">
                                <div className="seller-chat-empty-illustration" aria-hidden="true">💬</div>
                                <p className="seller-chat-empty-title">Welcome to Auctify Chat</p>
                                <p className="seller-chat-empty-subtitle">Start chatting with buyers and sellers now.</p>
                            </main>
                        </div>
                    </div>
                </div>
            )}

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
