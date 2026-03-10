import React, { useCallback, useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SellerChatDialog } from './components/SellerChatDialog';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import { AccountPage } from './pages/AccountPage';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { AuthPage } from './pages/AuthPage';
import { BagPage } from './pages/BagPage';
import { HomePage } from './pages/HomePage';
import { SellerAddProductPage } from './pages/seller/SellerAddProductPage';
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage';
import { SellerStorePage } from './pages/SellerStorePage';
import { HOME_CATEGORY_OPTIONS } from './lib/homeCategories';
import { sellerService } from './services/api';
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
        if (savedViewMode === 'home' || savedViewMode === 'category' || savedViewMode === 'auth' || savedViewMode === 'account' || savedViewMode === 'bag' || savedViewMode === 'auction' || savedViewMode === 'seller-store') {
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
    const [sellerDashboardSection, setSellerDashboardSection] = useState<'products' | 'shipping'>('products');
    const [canAccessSellerDashboard, setCanAccessSellerDashboard] = useState(false);
    const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
    const [activeAuctionId, setActiveAuctionId] = useState<number | null>(null);
    const [activeSellerStoreId, setActiveSellerStoreId] = useState<number | null>(null);
    const [activeSellerStoreName, setActiveSellerStoreName] = useState<string>('');
    const [activeSellerChatName, setActiveSellerChatName] = useState<string>('');
    const [activeSellerChatUserId, setActiveSellerChatUserId] = useState<number | null>(null);
    const [selectedHomeCategory, setSelectedHomeCategory] = useState<string | null>(null);
    const [auctionOrigin, setAuctionOrigin] = useState<'home' | 'seller-store' | null>(null);
    const [sellerStoreOrigin, setSellerStoreOrigin] = useState<'seller-dashboard' | null>(null);

    const resolveHomeCategoryFromLocation = useCallback(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        const categorySegment = segments[0] === 'category' ? segments[1]?.trim().toLowerCase() : null;
        const queryCategory = new URLSearchParams(window.location.search).get('category')?.trim().toLowerCase();
        const rawCategory = categorySegment || queryCategory;

        if (!rawCategory) {
            return null;
        }

        const matchedOption = HOME_CATEGORY_OPTIONS.find((option) => option.value === rawCategory || option.label.toLowerCase() === rawCategory);
        return matchedOption?.label ?? null;
    }, []);

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

    useEffect(() => {
        let isActive = true;

        const fetchSellerAccess = async () => {
            if (!authUser) {
                if (isActive) {
                    setCanAccessSellerDashboard(false);
                }
                return;
            }

            try {
                const response = await sellerService.getRegistration();
                if (!isActive) {
                    return;
                }

                const status = response.registration?.status ?? '';
                const hasAccess = status === 'submitted' || status === 'approved';
                setCanAccessSellerDashboard(hasAccess);
            } catch {
                if (isActive) {
                    setCanAccessSellerDashboard(false);
                }
            }
        };

        fetchSellerAccess();

        return () => {
            isActive = false;
        };
    }, [authUser]);

    const applyRouteFromLocation = useCallback(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        if (segments.length === 0) {
            const resolvedCategory = resolveHomeCategoryFromLocation();
            setSelectedHomeCategory(resolvedCategory);
            setViewMode(resolvedCategory ? 'category' : 'home');
            return;
        }

        if (segments[0] === 'category') {
            const resolvedCategory = resolveHomeCategoryFromLocation();
            setSelectedHomeCategory(resolvedCategory);
            setViewMode(resolvedCategory ? 'category' : 'home');
            return;
        }

        if (segments[0] === 'login') {
            setSelectedHomeCategory(null);
            setAuthMode('login');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'register') {
            setSelectedHomeCategory(null);
            setAuthMode('register');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'account') {
            setSelectedHomeCategory(null);
            setViewMode('account');
            const sectionFromPath = segments[1] as AccountSection | undefined;
            const section = sectionFromPath && VALID_ACCOUNT_SECTIONS.includes(sectionFromPath)
                ? sectionFromPath
                : 'details';
            setAccountSection(section);
            return;
        }

        if (segments[0] === 'bag') {
            setSelectedHomeCategory(null);
            setViewMode('bag');
            return;
        }

        if (segments[0] === 'auction') {
            setSelectedHomeCategory(null);
            setAuctionOrigin(null);
            const auctionId = Number(segments[1]);
            if (Number.isInteger(auctionId) && auctionId > 0) {
                setActiveAuctionId(auctionId);
                setViewMode('auction');
                return;
            }

            setActiveAuctionId(null);
            setViewMode('home');
            return;
        }

        if (segments[0] === 'seller-store') {
            setSelectedHomeCategory(null);
            setSellerStoreOrigin(null);
            const sellerId = Number(segments[1]);
            if (Number.isInteger(sellerId) && sellerId > 0) {
                const sellerName = new URLSearchParams(window.location.search).get('name') || '';
                setActiveSellerStoreId(sellerId);
                setActiveSellerStoreName(sellerName);
                setViewMode('seller-store');
                return;
            }

            setActiveSellerStoreId(null);
            setActiveSellerStoreName('');
            setViewMode('home');
            return;
        }

        if (segments[0] === 'seller') {
            setSelectedHomeCategory(null);
            setViewMode('seller');
            if (segments[1] === 'add-product') {
                setSellerSubView('add-product');
                setSellerDashboardSection('products');
                return;
            }

            setSellerSubView('dashboard');
            setSellerDashboardSection(segments[1] === 'shipping-settings' ? 'shipping' : 'products');
            return;
        }

        setSelectedHomeCategory(null);
        setViewMode('home');
    }, [resolveHomeCategoryFromLocation]);

    const handleNavigateHome = () => {
        setViewMode('home');
        setSelectedHomeCategory(null);
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setActiveAuctionId(null);
        setActiveSellerStoreId(null);
        setActiveSellerStoreName('');
        setIsSellerChatOpen(false);
        setActiveSellerChatName('');
        setActiveSellerChatUserId(null);
        window.history.pushState({}, '', '/');
    };

    const handleNavigateHomeCategory = (categoryLabel: string) => {
        const normalized = categoryLabel.trim().toLowerCase();
        const matchedOption = HOME_CATEGORY_OPTIONS.find((option) => option.label.toLowerCase() === normalized || option.value === normalized);

        setViewMode('category');
        setSelectedHomeCategory(matchedOption?.label ?? categoryLabel);
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setActiveAuctionId(null);
        setActiveSellerStoreId(null);
        setActiveSellerStoreName('');

        const path = matchedOption ? `/category/${matchedOption.value}` : '/category';
        window.history.pushState({}, '', path);
        window.scrollTo(0, 0);
    };

    const handleNavigateAuction = (auctionId: number) => {
        setAuctionOrigin(viewMode === 'seller-store' ? 'seller-store' : 'home');
        setActiveAuctionId(auctionId);
        setViewMode('auction');
        window.history.pushState({}, '', `/auction/${auctionId}`);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerStore = (sellerId: number, sellerName?: string, source: 'seller-dashboard' | null = null) => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(source);
        setActiveSellerStoreId(sellerId);
        setActiveSellerStoreName(sellerName ?? '');
        setViewMode('seller-store');
        const params = new URLSearchParams();
        if (sellerName?.trim()) {
            params.set('name', sellerName.trim());
        }
        const query = params.toString();
        window.history.pushState({}, '', `/seller-store/${sellerId}${query ? `?${query}` : ''}`);
        window.scrollTo(0, 0);
    };

    const handleOpenSellerChat = () => {
        if (!activeSellerStoreId) {
            return;
        }

        if (!authUser) {
            localStorage.setItem(
                'post_login_target',
                JSON.stringify({
                    viewMode: 'seller-store',
                    sellerStoreId: activeSellerStoreId,
                    sellerStoreName: activeSellerStoreName,
                    openSellerChat: true,
                }),
            );
            setAuthMode('login');
            setViewMode('auth');
            window.history.pushState({}, '', '/login');
            window.scrollTo(0, 0);
            return;
        }

        setActiveSellerChatUserId(activeSellerStoreId);
        setActiveSellerChatName(activeSellerStoreName.trim() || `Shop #${activeSellerStoreId}`);
        setIsSellerChatOpen(true);
    };

    const handleOpenUserMessages = () => {
        if (!authUser) {
            setAuthMode('login');
            setViewMode('auth');
            window.history.pushState({}, '', '/login');
            window.scrollTo(0, 0);
            return;
        }

        setActiveSellerChatUserId(null);
        setActiveSellerChatName('');
        setIsSellerChatOpen(true);
    };

    const handleNavigateBag = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setViewMode('bag');
        window.history.pushState({}, '', '/bag');
        window.scrollTo(0, 0);
    };

    const handleNavigateLogin = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setAuthMode('login');
        setViewMode('auth');
        window.history.pushState({}, '', '/login');
        window.scrollTo(0, 0);
    };

    const handleNavigateRegister = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setAuthMode('register');
        setViewMode('auth');
        window.history.pushState({}, '', '/register');
        window.scrollTo(0, 0);
    };

    const handleNavigateWishlistFromHome = () => {
        if (authUser) {
            handleNavigateAccount('wishlist');
            return;
        }

        localStorage.setItem(
            'post_login_target',
            JSON.stringify({ viewMode: 'account', section: 'wishlist' as AccountSection }),
        );
        setAuthMode('login');
        setViewMode('auth');
        window.history.pushState({}, '', '/login');
        window.scrollTo(0, 0);
    };

    const handleNavigateAccount = (section: AccountSection = 'details') => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setAccountSection(section);
        setViewMode('account');
        const path = section && section !== 'details' ? `/account/${section}` : '/account';
        window.history.pushState({}, '', path);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerDashboard = (section: 'products' | 'shipping' = 'products') => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setSellerSubView('dashboard');
        setSellerDashboardSection(section);
        setViewMode('seller');
        const nextPath = section === 'shipping' ? '/seller/shipping-settings' : '/seller/dashboard';
        window.history.pushState({}, '', nextPath);
        window.scrollTo(0, 0);
    };

    const handleOpenSellerDashboardInNewTab = () => {
        const popup = window.open('/seller/dashboard', '_blank', 'noopener,noreferrer');

        if (!popup) {
            toast.info('Please allow pop-ups to open Seller Dashboard in a new tab.', {
                autoClose: 2800,
            });
        }
    };

    const handleNavigateSellerAddProduct = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setSellerSubView('add-product');
        setViewMode('seller');
        window.history.pushState({}, '', '/seller/add-product');
        window.scrollTo(0, 0);
    };

    const handleLogout = () => {
        logout();
        localStorage.removeItem('ui_auth_mode');
        localStorage.removeItem('account_section');
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setViewMode('home');
        toast.success('Logged out successfully.', {
            autoClose: 2500,
        });
    };

    const handleAccountDeleted = () => {
        logout();
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setViewMode('home');
        window.scrollTo(0, 0);
    };

    const handleNavigateOrdersLogin = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
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
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        const targetRaw = localStorage.getItem('post_login_target');

        if (targetRaw) {
            try {
                const parsed = JSON.parse(targetRaw) as {
                    viewMode?: ViewMode;
                    section?: AccountSection;
                    sellerStoreId?: number;
                    sellerStoreName?: string;
                    openSellerChat?: boolean;
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

                if (parsed.viewMode === 'seller-store' && parsed.sellerStoreId) {
                    setActiveSellerStoreId(parsed.sellerStoreId);
                    setActiveSellerStoreName(parsed.sellerStoreName ?? '');
                    setViewMode('seller-store');

                    const params = new URLSearchParams();
                    if (parsed.sellerStoreName?.trim()) {
                        params.set('name', parsed.sellerStoreName.trim());
                    }

                    const query = params.toString();
                    window.history.pushState({}, '', `/seller-store/${parsed.sellerStoreId}${query ? `?${query}` : ''}`);
                    window.scrollTo(0, 0);

                    if (parsed.openSellerChat) {
                        setActiveSellerChatUserId(parsed.sellerStoreId);
                        setActiveSellerChatName(parsed.sellerStoreName?.trim() || `Shop #${parsed.sellerStoreId}`);
                        setIsSellerChatOpen(true);
                    }
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

    const shouldReturnToOwnSellerStoreFromAuction =
        auctionOrigin === 'seller-store' &&
        Boolean(authUser) &&
        activeSellerStoreId !== null &&
        authUser?.id === activeSellerStoreId;

    const isSellerContextView =
        viewMode === 'seller' ||
        (
            viewMode === 'seller-store' &&
            sellerStoreOrigin === 'seller-dashboard' &&
            Boolean(authUser) &&
            activeSellerStoreId !== null &&
            authUser?.id === activeSellerStoreId
        ) ||
        (
            viewMode === 'auction' &&
            auctionOrigin === 'seller-store' &&
            Boolean(authUser) &&
            activeSellerStoreId !== null &&
            authUser?.id === activeSellerStoreId
        );

    useEffect(() => {
        document.title = isSellerContextView ? 'Auctify Seller' : 'Auctify';
    }, [isSellerContextView]);

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
                disableHomeNavigation={isSellerContextView}
                isSellerMode={isSellerContextView}
                onNavigateLogin={handleNavigateLogin}
                onNavigateRegister={handleNavigateRegister}
                onNavigateAccount={handleNavigateAccount}
                onNavigateSellerDashboard={handleOpenSellerDashboardInNewTab}
                showSellerDashboardButton={canAccessSellerDashboard}
                onNavigateOrdersLogin={handleNavigateOrdersLogin}
                onNavigateBag={handleNavigateBag}
                onLogout={handleLogout}
            />

            {!isSellerContextView && (
                <Navigation
                    activeCategory={(viewMode === 'home' || viewMode === 'category') ? selectedHomeCategory : null}
                    onSelectCategory={handleNavigateHomeCategory}
                />
            )}

            {(viewMode === 'home' || viewMode === 'category') && (
                <HomePage
                    selectedCategory={selectedHomeCategory}
                    isCategoryPage={viewMode === 'category'}
                    onNavigateHome={handleNavigateHome}
                    onNavigateCategory={handleNavigateHomeCategory}
                    onNavigateToRegister={handleNavigateRegister}
                    onNavigateToWishlist={handleNavigateWishlistFromHome}
                    onNavigateToAuction={handleNavigateAuction}
                />
            )}

            {viewMode === 'auction' && activeAuctionId && (
                <AuctionDetailPage
                    auctionId={activeAuctionId}
                    backBreadcrumbLabel={shouldReturnToOwnSellerStoreFromAuction ? 'Seller Store' : 'Home'}
                    disableSellerStoreLink={isSellerContextView}
                    onNavigateHome={() => {
                        if (shouldReturnToOwnSellerStoreFromAuction) {
                            handleNavigateSellerStore(activeSellerStoreId, activeSellerStoreName, 'seller-dashboard');
                            return;
                        }

                        handleNavigateHome();
                    }}
                    onNavigateSellerDashboard={() => handleNavigateSellerDashboard('products')}
                    onNavigateToRegister={handleNavigateRegister}
                    onNavigateToWishlist={handleNavigateWishlistFromHome}
                    onNavigateToSellerStore={handleNavigateSellerStore}
                />
            )}

            {viewMode === 'seller-store' && activeSellerStoreId && (
                <SellerStorePage
                    sellerId={activeSellerStoreId}
                    sellerName={activeSellerStoreName}
                    onNavigateSellerDashboard={() => handleNavigateSellerDashboard('products')}
                    onNavigateToAuction={handleNavigateAuction}
                    onMessageSeller={handleOpenSellerChat}
                    canMessageSeller={!authUser || authUser.id !== activeSellerStoreId}
                />
            )}

            {viewMode === 'bag' && <BagPage onNavigateHome={handleNavigateHome} onNavigateToAuction={handleNavigateAuction} />}

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
                    onNavigateToAuction={handleNavigateAuction}
                />
            )}

            {viewMode === 'seller' && authUser && sellerSubView === 'dashboard' && (
                <SellerDashboardPage
                    onNavigateAddProduct={handleNavigateSellerAddProduct}
                    onNavigateSellerStore={(shopName) => handleNavigateSellerStore(authUser.id, shopName, 'seller-dashboard')}
                    activeSection={sellerDashboardSection}
                    onSectionChange={(section) => handleNavigateSellerDashboard(section)}
                />
            )}

            {viewMode === 'seller' && authUser && sellerSubView === 'add-product' && (
                <SellerAddProductPage onNavigateDashboard={() => handleNavigateSellerDashboard('products')} />
            )}

            {!isSellerContextView && <Footer />}

            {viewMode === 'seller' && (
                <button
                    className="seller-chat-button"
                    aria-label="Seller chat support"
                    onClick={() => {
                        setActiveSellerChatUserId(null);
                        setActiveSellerChatName('');
                        setIsSellerChatOpen(true);
                    }}
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

            {authUser && (
                <SellerChatDialog
                    isOpen={isSellerChatOpen && viewMode !== 'auth'}
                    onClose={() => setIsSellerChatOpen(false)}
                    preferredUserId={viewMode === 'seller-store' ? activeSellerChatUserId : null}
                    preferredUserName={viewMode === 'seller-store' ? activeSellerChatName : ''}
                />
            )}

            {!isSellerContextView && (
                <button className="chat-button" aria-label="Open messages" onClick={handleOpenUserMessages}>
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
