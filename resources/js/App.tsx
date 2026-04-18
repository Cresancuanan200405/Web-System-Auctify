import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { SellerChatDialog } from './components/SellerChatDialog';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import {
    getAdminSession,
    logoutAdmin,
    syncAdminSession,
} from './lib/adminAuth';
import {
    HOME_CATEGORY_OPTIONS,
    getCategoryValue,
    getSubcategoryValue,
} from './lib/homeCategories';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { AuthPage } from './pages/AuthPage';
import { BagPage } from './pages/BagPage';
import { HomePage } from './pages/HomePage';
import { SellerAddProductPage } from './pages/seller/SellerAddProductPage';
import { SellerDashboardPage } from './pages/seller/SellerDashboardPage';
import { SellerProfilePage } from './pages/seller/SellerProfilePage';
import { SellerStorePage } from './pages/SellerStorePage';
import {
    auctionService,
    authService,
    bidNotificationService,
    directMessageService,
    platformService,
    sellerService,
    type PublicPlatformSettings,
} from './services/api';
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
    'zvip',
    'seller',
    'verification',
    'delete-account',
];

const ACCOUNT_SECTION_TITLE_MAP: Record<AccountSection, string> = {
    details: 'Account Details',
    addresses: 'Saved Addresses',
    preferences: 'Preferences',
    cashback: 'Cashback',
    wallet: 'Wallet',
    wishlist: 'Wishlist',
    orders: 'Orders',
    reviews: 'Reviews',
    zvip: 'ZVIP',
    seller: 'Become a Seller',
    verification: 'Account Verification',
    'delete-account': 'Delete Account',
};

const SELLER_DASHBOARD_ACCESS_KEY = 'seller_dashboard_access';

type AccountStatusDialog = {
    title: string;
    message: string;
    variant?: 'account' | 'conversation';
    badge?: string;
    status?: 'suspended' | 'deleted' | 'seller-revoked' | 'session-ended';
};

const defaultPlatformSettings: PublicPlatformSettings = {
    allow_registrations: true,
    maintenance_mode: false,
    maintenance_message:
        'Auctify is currently under maintenance. Please check back soon.',
    enable_video_ads: true,
    enable_carousel: true,
    enable_promo_circles: true,
    enable_live_chat: true,
    enable_seller_store: true,
    enable_home_search_suggestions: true,
    max_listing_media_files: 10,
    direct_message_max_attachments: 5,
    max_home_search_results: 8,
    max_admin_search_results: 8,
};

const AppContent: React.FC = () => {
    const { authUser, authToken, logout, updateUser } = useAuth();
    const authUserRef = useRef(authUser);
    const authUserId = authUser?.id ?? null;
    const [viewMode, setViewMode] = useState<ViewMode>(() => {
        const savedViewMode = localStorage.getItem('ui_view_mode');
        if (
            savedViewMode === 'home' ||
            savedViewMode === 'category' ||
            savedViewMode === 'auth' ||
            savedViewMode === 'account' ||
            savedViewMode === 'bag' ||
            savedViewMode === 'auction' ||
            savedViewMode === 'seller-store' ||
            savedViewMode === 'seller-profile' ||
            savedViewMode === 'admin-login' ||
            savedViewMode === 'admin-dashboard'
        ) {
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

        return VALID_ACCOUNT_SECTIONS.includes(
            savedAccountSection as AccountSection,
        )
            ? (savedAccountSection as AccountSection)
            : 'details';
    });

    const [sellerSubView, setSellerSubView] = useState<
        'dashboard' | 'add-product'
    >('dashboard');
    const [sellerDashboardSection, setSellerDashboardSection] = useState<
        'products' | 'shipping' | 'orders'
    >('products');
    const [canAccessSellerDashboard, setCanAccessSellerDashboard] =
        useState(() => {
            if (typeof window === 'undefined') {
                return false;
            }

            return window.localStorage.getItem(SELLER_DASHBOARD_ACCESS_KEY) === '1';
        });
    const [isSellerChatOpen, setIsSellerChatOpen] = useState(false);
    const [activeAuctionId, setActiveAuctionId] = useState<number | null>(null);
    const [activeAuctionTitle, setActiveAuctionTitle] = useState('');
    const [activeSellerStoreId, setActiveSellerStoreId] = useState<
        number | null
    >(null);
    const [activeSellerStoreName, setActiveSellerStoreName] =
        useState<string>('');
    const [activeSellerChatName, setActiveSellerChatName] =
        useState<string>('');
    const [activeSellerChatUserId, setActiveSellerChatUserId] = useState<
        number | null
    >(null);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [, setChatUnreadUsersCount] = useState(0);
    const [bidUnreadCount, setBidUnreadCount] = useState(0);
    const [selectedHomeCategory, setSelectedHomeCategory] = useState<
        string | null
    >(null);
    const [selectedHomeSubcategory, setSelectedHomeSubcategory] = useState<
        string | null
    >(null);
    const [auctionOrigin, setAuctionOrigin] = useState<
        'home' | 'seller-store' | 'account-orders' | 'account-reviews' | null
    >(null);
    const [sellerStoreOrigin, setSellerStoreOrigin] = useState<
        'home' | 'seller-dashboard' | 'account-orders' | null
    >(null);
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
        () => Boolean(getAdminSession()),
    );
    const [accountStatusDialog, setAccountStatusDialog] =
        useState<AccountStatusDialog | null>(null);
    const [platformSettings, setPlatformSettings] =
        useState<PublicPlatformSettings>(defaultPlatformSettings);
    const [maintenanceDialogDismissed, setMaintenanceDialogDismissed] =
        useState(false);

    const resolveHomeCategoryFromLocation = useCallback(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);
        const categorySegment =
            segments[0] === 'category'
                ? segments[1]?.trim().toLowerCase()
                : null;
        const queryCategory = new URLSearchParams(window.location.search)
            .get('category')
            ?.trim()
            .toLowerCase();
        const rawCategory = categorySegment || queryCategory;

        if (!rawCategory) {
            return null;
        }

        const matchedOption = HOME_CATEGORY_OPTIONS.find(
            (option) =>
                option.value === rawCategory ||
                option.label.toLowerCase() === rawCategory,
        );
        return matchedOption?.label ?? null;
    }, []);

    const resolveHomeSubcategoryFromLocation = useCallback(() => {
        return (
            new URLSearchParams(window.location.search)
                .get('subcategory')
                ?.trim()
                .toLowerCase() || null
        );
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
        const modalSelectors = [
            '[role="dialog"][aria-modal="true"]',
            '.seller-chat-dialog-backdrop',
            '.delete-modal-overlay',
            '.admin-home-dialog-overlay',
            '.admin-lightbox-overlay',
            '.modal-overlay',
            '.dialog-backdrop',
        ].join(', ');

        const updateScrollLock = () => {
            const hasOpenDialog = Boolean(
                document.querySelector(modalSelectors),
            );
            document.body.style.overflow = hasOpenDialog ? 'hidden' : '';
            document.body.style.touchAction = hasOpenDialog ? 'none' : '';
            document.documentElement.style.overflow = hasOpenDialog
                ? 'hidden'
                : '';
        };

        updateScrollLock();

        const observer = new MutationObserver(() => {
            updateScrollLock();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'aria-modal'],
        });

        return () => {
            observer.disconnect();
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const loadPlatformSettings = async () => {
            try {
                const response = await platformService.getPublicSettings();
                if (!isActive) {
                    return;
                }

                setPlatformSettings((prev) => ({
                    ...prev,
                    ...response.settings,
                }));
            } catch {
                // Keep defaults if settings cannot be fetched.
            }
        };

        void loadPlatformSettings();

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadPlatformSettings();
            }
        }, 60000);

        const handleFocus = () => {
            void loadPlatformSettings();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            isActive = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, []);

    useEffect(() => {
        if (!authUser) {
            return;
        }

        const pendingToastRaw = sessionStorage.getItem(
            'post_auth_success_toast',
        );

        if (!pendingToastRaw) {
            return;
        }

        sessionStorage.removeItem('post_auth_success_toast');

        try {
            const pendingToast = JSON.parse(pendingToastRaw) as {
                message?: string;
                autoClose?: number;
            };

            if (pendingToast.message) {
                toast.success(pendingToast.message, {
                    autoClose:
                        typeof pendingToast.autoClose === 'number'
                            ? pendingToast.autoClose
                            : 3500,
                });
            }
        } catch {
            toast.success('Signed in successfully.', { autoClose: 3500 });
        }
    }, [authUser]);

    useEffect(() => {
        authUserRef.current = authUser;
    }, [authUser]);

    useEffect(() => {
        if (!authUser || !authToken) {
            return;
        }

        let isActive = true;

        const refreshAuthUser = async () => {
            try {
                const response = await authService.me();
                if (!isActive || !response.user) {
                    return;
                }

                const currentUser = authUserRef.current;
                const nextUser = response.user;

                if (
                    currentUser &&
                    currentUser.id === nextUser.id &&
                    currentUser.email === nextUser.email &&
                    currentUser.name === nextUser.name &&
                    currentUser.phone === nextUser.phone &&
                    currentUser.is_verified === nextUser.is_verified &&
                    currentUser.verified_at === nextUser.verified_at &&
                    currentUser.verification_revoked_at ===
                        nextUser.verification_revoked_at &&
                    currentUser.avatar === nextUser.avatar &&
                    currentUser.birthday === nextUser.birthday &&
                    currentUser.gender === nextUser.gender
                ) {
                    return;
                }

                updateUser(nextUser);
            } catch {
                // Errors here are handled globally by API event hooks if auth/session state changed.
            }
        };

        void refreshAuthUser();
        const interval = window.setInterval(() => {
            void refreshAuthUser();
        }, 30000);

        const handleFocus = () => {
            void refreshAuthUser();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            isActive = false;
            window.clearInterval(interval);
            window.removeEventListener('focus', handleFocus);
        };
    }, [authToken, authUser, updateUser]);

    useEffect(() => {
        const handleAuctifyToast = (event: Event) => {
            const customEvent = event as CustomEvent<{
                type?: string;
                message?: string;
                autoClose?: number;
            }>;
            const detail = customEvent.detail;

            if (!detail?.message) {
                return;
            }

            const options =
                typeof detail.autoClose === 'number'
                    ? { autoClose: detail.autoClose }
                    : undefined;

            if (detail.type === 'error') {
                toast.error(detail.message, options);
                return;
            }

            if (detail.type === 'warning') {
                toast.warn(detail.message, options);
                return;
            }

            if (detail.type === 'info') {
                toast.info(detail.message, options);
                return;
            }

            toast.success(detail.message, options);
        };

        window.addEventListener(
            'auctify-toast',
            handleAuctifyToast as EventListener,
        );
        return () => {
            window.removeEventListener(
                'auctify-toast',
                handleAuctifyToast as EventListener,
            );
        };
    }, []);

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

                const status = (
                    response.registration?.status ?? ''
                ).toLowerCase();
                const hasAccess = status === 'approved';
                setCanAccessSellerDashboard(hasAccess);
                window.localStorage.setItem(
                    SELLER_DASHBOARD_ACCESS_KEY,
                    hasAccess ? '1' : '0',
                );

                if (status === 'revoked') {
                    const reason =
                        response.registration?.revoked_reason?.trim();
                    setAccountStatusDialog({
                        title: 'Seller Access Revoked',
                        message: reason
                            ? `Seller privileges were revoked. Reason: ${reason}`
                            : 'Seller privileges were revoked by admin.',
                    });
                }
            } catch {
                if (isActive) {
                    setCanAccessSellerDashboard(
                        window.localStorage.getItem(SELLER_DASHBOARD_ACCESS_KEY) === '1',
                    );
                }
            }
        };

        void fetchSellerAccess();

        const handleFocus = () => {
            void fetchSellerAccess();
        };

        window.addEventListener('focus', handleFocus);

        return () => {
            isActive = false;
            window.removeEventListener('focus', handleFocus);
        };
    }, [authUser]);

    useEffect(() => {
        const handleAccountStatus = (event: Event) => {
            const customEvent = event as CustomEvent<{
                status?: string;
                message?: string;
                reason?: string | null;
                target?: 'account' | 'contact';
            }>;
            const detail = customEvent.detail;
            const status = detail?.status;
            const reason = detail?.reason?.trim();
            const target = detail?.target ?? 'account';

            if (!status) {
                return;
            }

            const isCurrentAdminView =
                typeof window !== 'undefined' &&
                window.location.pathname.startsWith('/admin');

            if (isCurrentAdminView && status === 'session-ended') {
                return;
            }

            if (status === 'seller-revoked') {
                setCanAccessSellerDashboard(false);
                if (authUser) {
                    updateUser({
                        ...authUser,
                        is_verified: false,
                        verified_at: null,
                        verification_revoked_at: new Date().toISOString(),
                    });
                }
                setAccountStatusDialog({
                    title: 'Seller Access Revoked',
                    message: reason
                        ? `Seller privileges were revoked. Reason: ${reason}`
                        : detail.message ||
                          'Seller privileges were revoked by admin.',
                    status: 'seller-revoked',
                });

                if (viewMode === 'seller' || viewMode === 'seller-profile') {
                    setViewMode('account');
                    setAccountSection('seller');
                    window.history.pushState({}, '', '/account/seller');
                }

                return;
            }

            if (
                status === 'suspended' ||
                status === 'deleted' ||
                status === 'session-ended'
            ) {
                if (target === 'contact' && status !== 'session-ended') {
                    const message = reason
                        ? `This conversation is unavailable right now. Reason: ${reason}`
                        : status === 'suspended'
                          ? 'This contact is suspended and cannot receive messages right now.'
                          : 'This contact is no longer available for messaging.';

                    setActiveSellerChatUserId(null);
                    setActiveSellerChatName('');
                    setAccountStatusDialog({
                        title: 'Conversation Unavailable',
                        message,
                        variant: 'conversation',
                        badge:
                            status === 'suspended'
                                ? 'Contact Suspended'
                                : 'Contact Deleted',
                        status,
                    });
                    return;
                }

                const title =
                    status === 'suspended'
                        ? 'Account Suspended'
                        : status === 'deleted'
                          ? 'Account Deleted'
                          : 'Session Ended';

                const fallbackMessage =
                    status === 'suspended'
                        ? 'Your account is currently suspended. Please contact support.'
                        : status === 'deleted'
                          ? 'This account is no longer available. Please contact support if this is unexpected.'
                          : 'Your session is no longer valid. Please sign in again.';

                const message =
                    reason && status !== 'session-ended'
                        ? `${detail.message || fallbackMessage} Reason: ${reason}`
                        : detail.message || fallbackMessage;

                logout();
                setAuctionOrigin(null);
                setSellerStoreOrigin(null);
                setIsSellerChatOpen(false);
                setActiveSellerChatUserId(null);
                setActiveSellerChatName('');
                setAuthMode('login');
                setViewMode('auth');
                window.history.pushState({}, '', '/login');
                window.scrollTo(0, 0);

                setAccountStatusDialog({
                    title,
                    message,
                    variant: 'account',
                    status,
                });
            }
        };

        window.addEventListener(
            'auctify-account-status',
            handleAccountStatus as EventListener,
        );

        return () => {
            window.removeEventListener(
                'auctify-account-status',
                handleAccountStatus as EventListener,
            );
        };
    }, [authUser, logout, updateUser, viewMode]);

    useEffect(() => {
        if (!authUserId) {
            return;
        }

        if (!platformSettings.enable_live_chat) {
            return;
        }

        let isActive = true;

        const fetchUnreadCount = async () => {
            try {
                const data = await directMessageService.getThreads();
                if (!isActive) {
                    return;
                }

                const totalUnread = data.threads.reduce(
                    (sum, thread) =>
                        sum + Math.max(0, Number(thread.unread_count || 0)),
                    0,
                );
                const unreadUsers = data.threads.filter(
                    (thread) => Number(thread.unread_count || 0) > 0,
                ).length;
                setChatUnreadCount(totalUnread);
                setChatUnreadUsersCount(unreadUsers);
            } catch {
                if (isActive) {
                    setChatUnreadCount(0);
                    setChatUnreadUsersCount(0);
                }
            }
        };

        void fetchUnreadCount();
        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchUnreadCount();
            }
        }, 20000);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [authUserId, platformSettings.enable_live_chat]);

    useEffect(() => {
        if (!authUserId) {
            return;
        }

        if (!platformSettings.enable_live_chat) {
            return;
        }

        let isActive = true;
        const seenStorageKey = `seen_bid_notifications_${authUserId}`;

        const getSeenKeys = (): Set<string> => {
            try {
                const stored = localStorage.getItem(seenStorageKey);
                return stored
                    ? new Set<string>(JSON.parse(stored) as string[])
                    : new Set<string>();
            } catch {
                return new Set<string>();
            }
        };

        const fetchBidUnreadCount = async () => {
            try {
                const data = await bidNotificationService.getMyNotifications();
                if (!isActive) {
                    return;
                }

                const seenKeys = getSeenKeys();
                const unread = (data.items ?? []).filter(
                    (item) => !seenKeys.has(item.key),
                ).length;
                setBidUnreadCount(unread);
            } catch {
                if (isActive) {
                    setBidUnreadCount(0);
                }
            }
        };

        const handleSeenUpdated = () => {
            void fetchBidUnreadCount();
        };

        void fetchBidUnreadCount();

        const interval = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void fetchBidUnreadCount();
            }
        }, 20000);

        window.addEventListener(
            'bid-notifications-seen-updated',
            handleSeenUpdated,
        );

        return () => {
            isActive = false;
            window.clearInterval(interval);
            window.removeEventListener(
                'bid-notifications-seen-updated',
                handleSeenUpdated,
            );
        };
    }, [authUserId, platformSettings.enable_live_chat]);

    const shouldShowMaintenanceDialog =
        platformSettings.maintenance_mode &&
        viewMode !== 'admin-login' &&
        viewMode !== 'admin-dashboard' &&
        !maintenanceDialogDismissed;

    const combinedChatBadgeCount =
        authUserId !== null ? chatUnreadCount + bidUnreadCount : 0;

    const applyRouteFromLocation = useCallback(() => {
        const path = window.location.pathname;
        const segments = path.split('/').filter(Boolean);

        if (segments.length === 0) {
            const resolvedCategory = resolveHomeCategoryFromLocation();
            setSelectedHomeCategory(resolvedCategory);
            setSelectedHomeSubcategory(
                resolvedCategory ? resolveHomeSubcategoryFromLocation() : null,
            );
            setViewMode(resolvedCategory ? 'category' : 'home');
            return;
        }

        if (segments[0] === 'category') {
            const resolvedCategory = resolveHomeCategoryFromLocation();
            setSelectedHomeCategory(resolvedCategory);
            setSelectedHomeSubcategory(
                resolvedCategory ? resolveHomeSubcategoryFromLocation() : null,
            );
            setViewMode(resolvedCategory ? 'category' : 'home');
            return;
        }

        if (segments[0] === 'login') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setAuthMode('login');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'admin') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);

            if (segments[1] === 'dashboard') {
                if (getAdminSession()) {
                    setIsAdminAuthenticated(true);
                    setViewMode('admin-dashboard');
                    return;
                }

                setIsAdminAuthenticated(false);
                setViewMode('admin-login');
                return;
            }

            setViewMode('admin-login');
            return;
        }

        if (segments[0] === 'register') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setAuthMode('register');
            setViewMode('auth');
            return;
        }

        if (segments[0] === 'account') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setViewMode('account');
            const sectionFromPath = segments[1] as AccountSection | undefined;
            const section =
                sectionFromPath &&
                VALID_ACCOUNT_SECTIONS.includes(sectionFromPath)
                    ? sectionFromPath
                    : 'details';
            setAccountSection(section);
            return;
        }

        if (segments[0] === 'bag') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setViewMode('bag');
            return;
        }

        if (segments[0] === 'auction') {
            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setAuctionOrigin(null);
            const auctionId = Number(segments[1]);
            if (Number.isInteger(auctionId) && auctionId > 0) {
                setActiveAuctionTitle('');
                setActiveAuctionId(auctionId);
                setViewMode('auction');
                return;
            }

            setActiveAuctionTitle('');
            setActiveAuctionId(null);
            setViewMode('home');
            return;
        }

        if (segments[0] === 'seller-store') {
            if (!platformSettings.enable_seller_store) {
                setSelectedHomeCategory(null);
                setSelectedHomeSubcategory(null);
                setViewMode('home');
                window.history.replaceState({}, '', '/');
                return;
            }

            setSelectedHomeCategory(null);
            setSelectedHomeSubcategory(null);
            setSellerStoreOrigin(null);
            const sellerId = Number(segments[1]);
            if (Number.isInteger(sellerId) && sellerId > 0) {
                const sellerName =
                    new URLSearchParams(window.location.search).get('name') ||
                    '';
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
            setSelectedHomeSubcategory(null);
            if (segments[1] === 'details') {
                setViewMode('seller-profile');
                return;
            }

            setViewMode('seller');
            if (segments[1] === 'add-product') {
                setSellerSubView('add-product');
                setSellerDashboardSection('products');
                return;
            }

            setSellerSubView('dashboard');
            const sectionFromSegment = segments[1];
            if (sectionFromSegment === 'shipping-settings') {
                setSellerDashboardSection('shipping');
            } else if (sectionFromSegment === 'orders') {
                setSellerDashboardSection('orders');
            } else {
                setSellerDashboardSection('products');
            }
            return;
        }

        setSelectedHomeCategory(null);
        setSelectedHomeSubcategory(null);
        setViewMode('home');
    }, [
        platformSettings.enable_seller_store,
        resolveHomeCategoryFromLocation,
        resolveHomeSubcategoryFromLocation,
    ]);

    const handleNavigateHome = () => {
        setViewMode('home');
        setSelectedHomeCategory(null);
        setSelectedHomeSubcategory(null);
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setActiveAuctionTitle('');
        setActiveAuctionId(null);
        setActiveSellerStoreId(null);
        setActiveSellerStoreName('');
        setIsSellerChatOpen(false);
        setActiveSellerChatName('');
        setActiveSellerChatUserId(null);
        window.history.pushState({}, '', '/');
    };

    const handleNavigateHomeCategory = (
        categoryLabel: string,
        subcategoryValue?: string,
    ) => {
        const normalized = categoryLabel.trim().toLowerCase();
        const matchedOption = HOME_CATEGORY_OPTIONS.find(
            (option) =>
                option.label.toLowerCase() === normalized ||
                option.value === normalized,
        );
        const normalizedSubcategory =
            subcategoryValue?.trim().toLowerCase() || null;

        setViewMode('category');
        setSelectedHomeCategory(matchedOption?.label ?? categoryLabel);
        setSelectedHomeSubcategory(normalizedSubcategory);
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setActiveAuctionTitle('');
        setActiveAuctionId(null);
        setActiveSellerStoreId(null);
        setActiveSellerStoreName('');

        const queryParams = new URLSearchParams();
        if (normalizedSubcategory) {
            queryParams.set('subcategory', normalizedSubcategory);
        }

        const path = matchedOption
            ? `/category/${matchedOption.value}`
            : '/category';
        const query = queryParams.toString();
        window.history.pushState({}, '', `${path}${query ? `?${query}` : ''}`);
        window.scrollTo(0, 0);
    };

    const handleNavigateAuction = (
        auctionId: number,
        source?: 'home' | 'seller-store' | 'account-orders' | 'account-reviews',
    ) => {
        const nextOrigin =
            source ?? (viewMode === 'seller-store' ? 'seller-store' : 'home');
        setAuctionOrigin(nextOrigin);
        setActiveAuctionTitle('');
        setActiveAuctionId(auctionId);
        setViewMode('auction');
        window.history.pushState({}, '', `/auction/${auctionId}`);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerStore = (
        sellerId: number,
        sellerName?: string,
        source: 'home' | 'seller-dashboard' | 'account-orders' | null = 'home',
    ) => {
        if (!platformSettings.enable_seller_store) {
            toast.info('Seller stores are temporarily unavailable.');
            return;
        }

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
        window.history.pushState(
            {},
            '',
            `/seller-store/${sellerId}${query ? `?${query}` : ''}`,
        );
        window.scrollTo(0, 0);
    };

    const openSellerChatForUser = (sellerId: number, sellerName?: string) => {
        setActiveSellerChatUserId(sellerId);
        setActiveSellerChatName(sellerName?.trim() || `Shop #${sellerId}`);
        setIsSellerChatOpen(true);
    };

    const handleOpenSellerChat = () => {
        if (!platformSettings.enable_live_chat) {
            toast.info('Live chat is currently disabled by admin settings.');
            return;
        }

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

        openSellerChatForUser(activeSellerStoreId, activeSellerStoreName);
    };

    const handleOpenUserMessages = () => {
        if (!platformSettings.enable_live_chat) {
            toast.info('Live chat is currently disabled by admin settings.');
            return;
        }

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
        if (!platformSettings.allow_registrations) {
            toast.info('New registrations are temporarily disabled by admin.');
            return;
        }

        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setAuthMode('register');
        setViewMode('auth');
        window.history.pushState({}, '', '/register');
        window.scrollTo(0, 0);
    };

    const handleOpenAdminLoginInNewTab = () => {
        const popup = window.open(
            '/admin/login',
            '_blank',
            'noopener,noreferrer',
        );

        if (!popup) {
            toast.info(
                'Please allow pop-ups to open Admin Login in a new tab.',
                {
                    autoClose: 2800,
                },
            );
        }
    };

    const handleNavigateWishlistFromHome = () => {
        if (authUser) {
            handleNavigateAccount('wishlist');
            return;
        }

        localStorage.setItem(
            'post_login_target',
            JSON.stringify({
                viewMode: 'account',
                section: 'wishlist' as AccountSection,
            }),
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
        const path =
            section && section !== 'details'
                ? `/account/${section}`
                : '/account';
        window.history.pushState({}, '', path);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerDashboard = (
        section: 'products' | 'shipping' | 'orders' = 'products',
    ) => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setSellerSubView('dashboard');
        setSellerDashboardSection(section);
        setViewMode('seller');
        const nextPath =
            section === 'shipping'
                ? '/seller/shipping-settings'
                : section === 'orders'
                  ? '/seller/orders'
                  : '/seller/dashboard';
        window.history.pushState({}, '', nextPath);
        window.scrollTo(0, 0);
    };

    const handleNavigateSellerProfile = () => {
        setAuctionOrigin(null);
        setSellerStoreOrigin(null);
        setViewMode('seller-profile');
        window.history.pushState({}, '', '/seller/details');
        window.scrollTo(0, 0);
    };

    const handleOpenSellerDashboardInNewTab = () => {
        const popup = window.open(
            '/seller/dashboard',
            '_blank',
            'noopener,noreferrer',
        );

        if (!popup) {
            toast.info(
                'Please allow pop-ups to open Seller Dashboard in a new tab.',
                {
                    autoClose: 2800,
                },
            );
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

    const handleAdminLoginSuccess = () => {
        setIsAdminAuthenticated(true);
        setViewMode('admin-dashboard');
        window.history.pushState({}, '', '/admin/dashboard');
        window.scrollTo(0, 0);
    };

    const handleAdminLogout = useCallback(() => {
        logoutAdmin();
        setIsAdminAuthenticated(false);
        setViewMode('admin-login');
        window.history.pushState({}, '', '/admin/login');
        window.scrollTo(0, 0);
    }, []);

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
            JSON.stringify({
                viewMode: 'account',
                section: 'orders' as AccountSection,
            }),
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
                    const section =
                        parsed.section &&
                        VALID_ACCOUNT_SECTIONS.includes(parsed.section)
                            ? parsed.section
                            : 'details';
                    setAccountSection(section);
                    setViewMode('account');
                    const path =
                        section && section !== 'details'
                            ? `/account/${section}`
                            : '/account';
                    window.history.pushState({}, '', path);
                    window.scrollTo(0, 0);

                    if (parsed.openSellerChat && parsed.sellerStoreId) {
                        openSellerChatForUser(
                            parsed.sellerStoreId,
                            parsed.sellerStoreName,
                        );
                    }
                    return;
                }

                if (
                    parsed.viewMode === 'seller-store' &&
                    parsed.sellerStoreId
                ) {
                    setActiveSellerStoreId(parsed.sellerStoreId);
                    setActiveSellerStoreName(parsed.sellerStoreName ?? '');
                    setViewMode('seller-store');

                    const params = new URLSearchParams();
                    if (parsed.sellerStoreName?.trim()) {
                        params.set('name', parsed.sellerStoreName.trim());
                    }

                    const query = params.toString();
                    window.history.pushState(
                        {},
                        '',
                        `/seller-store/${parsed.sellerStoreId}${query ? `?${query}` : ''}`,
                    );
                    window.scrollTo(0, 0);

                    if (parsed.openSellerChat) {
                        setActiveSellerChatUserId(parsed.sellerStoreId);
                        setActiveSellerChatName(
                            parsed.sellerStoreName?.trim() ||
                                `Shop #${parsed.sellerStoreId}`,
                        );
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

    useEffect(() => {
        if (viewMode !== 'admin-login' && viewMode !== 'admin-dashboard') {
            return;
        }

        let isActive = true;

        const verifyAdminSession = async () => {
            const session = await syncAdminSession();

            if (!isActive) {
                return;
            }

            if (session) {
                setIsAdminAuthenticated(true);

                if (viewMode === 'admin-login') {
                    setViewMode('admin-dashboard');
                    window.history.replaceState({}, '', '/admin/dashboard');
                }

                return;
            }

            setIsAdminAuthenticated(false);

            if (viewMode === 'admin-dashboard') {
                setViewMode('admin-login');
                window.history.replaceState({}, '', '/admin/login');
            }
        };

        void verifyAdminSession();

        return () => {
            isActive = false;
        };
    }, [viewMode]);

    useEffect(() => {
        const handleOpenAuctifyChat = (event: Event) => {
            const customEvent = event as CustomEvent<{
                sellerUserId?: number;
                sellerName?: string;
            }>;
            const sellerUserId = customEvent.detail?.sellerUserId;
            const sellerName = customEvent.detail?.sellerName;

            if (!sellerUserId) {
                return;
            }

            if (!platformSettings.enable_live_chat) {
                window.dispatchEvent(
                    new CustomEvent('auctify-toast', {
                        detail: {
                            type: 'info',
                            message:
                                'Live chat is currently disabled by admin settings.',
                        },
                    }),
                );
                return;
            }

            if (!authUser) {
                localStorage.setItem(
                    'post_login_target',
                    JSON.stringify({
                        viewMode: 'account',
                        section: 'orders' as AccountSection,
                        sellerStoreId: sellerUserId,
                        sellerStoreName: sellerName,
                        openSellerChat: true,
                    }),
                );
                setAuthMode('login');
                setViewMode('auth');
                window.history.pushState({}, '', '/login');
                window.scrollTo(0, 0);
                return;
            }

            openSellerChatForUser(sellerUserId, sellerName);
        };

        window.addEventListener(
            'open-auctify-chat',
            handleOpenAuctifyChat as EventListener,
        );

        return () => {
            window.removeEventListener(
                'open-auctify-chat',
                handleOpenAuctifyChat as EventListener,
            );
        };
    }, [authUser, platformSettings.enable_live_chat]);

    const shouldReturnToSellerStoreFromAuction =
        auctionOrigin === 'seller-store' && activeSellerStoreId !== null;

    const shouldReturnToOrdersFromAuction = auctionOrigin === 'account-orders';
    const shouldReturnToReviewsFromAuction =
        auctionOrigin === 'account-reviews';
    const isAdminView =
        viewMode === 'admin-login' || viewMode === 'admin-dashboard';

    const isSellerContextView =
        viewMode === 'seller' ||
        viewMode === 'seller-profile' ||
        (viewMode === 'seller-store' &&
            sellerStoreOrigin === 'seller-dashboard' &&
            Boolean(authUser) &&
            activeSellerStoreId !== null &&
            authUser?.id === activeSellerStoreId) ||
        (viewMode === 'auction' &&
            auctionOrigin === 'seller-store' &&
            Boolean(authUser) &&
            activeSellerStoreId !== null &&
            authUser?.id === activeSellerStoreId);

    useEffect(() => {
        if (viewMode !== 'auction' || !activeAuctionId) {
            return;
        }

        let isActive = true;

        const loadAuctionTitle = async () => {
            try {
                const details = await auctionService.getProductDetails(
                    activeAuctionId,
                );
                if (!isActive) {
                    return;
                }

                setActiveAuctionTitle(details.title?.trim() || '');
            } catch {
                if (isActive) {
                    setActiveAuctionTitle('');
                }
            }
        };

        void loadAuctionTitle();

        return () => {
            isActive = false;
        };
    }, [activeAuctionId, viewMode]);

    useEffect(() => {
        if (
            viewMode !== 'seller-store' ||
            !activeSellerStoreId ||
            activeSellerStoreName.trim()
        ) {
            return;
        }

        let isActive = true;

        const resolveStoreName = async () => {
            try {
                const products = await auctionService.getSellerStoreProducts(
                    activeSellerStoreId,
                );

                if (!isActive) {
                    return;
                }

                const first = products[0];
                const resolvedName =
                    first?.user?.seller_registration?.shop_name?.trim() ||
                    first?.user?.name?.trim() ||
                    '';

                if (resolvedName) {
                    setActiveSellerStoreName(resolvedName);
                }
            } catch {
                // Keep fallback title when store details are unavailable.
            }
        };

        void resolveStoreName();

        return () => {
            isActive = false;
        };
    }, [activeSellerStoreId, activeSellerStoreName, viewMode]);

    useEffect(() => {
        if (viewMode === 'admin-login') {
            document.title = 'Auctify Admin Login';
            return;
        }

        if (viewMode === 'admin-dashboard') {
            document.title = 'Auctify Admin Dashboard';
            return;
        }

        const categoryLabel =
            selectedHomeCategory &&
            HOME_CATEGORY_OPTIONS.find(
                (option) => option.value === selectedHomeCategory,
            )?.label;

        if (viewMode === 'auth') {
            document.title =
                authMode === 'register' ? 'Auctify Sign Up' : 'Auctify Sign In';
            return;
        }

        if (viewMode === 'account') {
            document.title =
                `Auctify ${ACCOUNT_SECTION_TITLE_MAP[accountSection] ?? 'Account'}`;
            return;
        }

        if (viewMode === 'bag') {
            document.title = 'Auctify Bag';
            return;
        }

        if (viewMode === 'category') {
            document.title = categoryLabel
                ? `Auctify ${categoryLabel}`
                : 'Auctify Browse';
            return;
        }

        if (viewMode === 'auction') {
            document.title = activeAuctionTitle
                ? `Auctify ${activeAuctionTitle}`
                : activeAuctionId
                  ? `Auctify Auction #${activeAuctionId}`
                  : 'Auctify Auction';
            return;
        }

        if (viewMode === 'seller-store') {
            document.title = activeSellerStoreName
                ? `Auctify ${activeSellerStoreName}`
                : activeSellerStoreId
                  ? `Auctify Seller Store #${activeSellerStoreId}`
                  : 'Auctify Seller Store';
            return;
        }

        if (viewMode === 'seller-profile') {
            document.title = 'Auctify Seller Profile';
            return;
        }

        if (viewMode === 'seller') {
            if (sellerSubView === 'add-product') {
                document.title = 'Auctify Seller Add Product';
                return;
            }

            if (sellerDashboardSection === 'orders') {
                document.title = 'Auctify Seller Orders';
                return;
            }

            if (sellerDashboardSection === 'shipping') {
                document.title = 'Auctify Seller Shipping';
                return;
            }

            document.title = 'Auctify Seller Dashboard';
            return;
        }

        document.title = isSellerContextView ? 'Auctify Seller' : 'Auctify Home';
    }, [
        accountSection,
        activeAuctionId,
        activeAuctionTitle,
        activeSellerStoreId,
        activeSellerStoreName,
        authMode,
        isSellerContextView,
        selectedHomeCategory,
        sellerDashboardSection,
        sellerSubView,
        viewMode,
    ]);

    useEffect(() => {
        document.documentElement.classList.toggle('admin-mode', isAdminView);
        document.body.classList.toggle('admin-mode', isAdminView);

        return () => {
            document.documentElement.classList.remove('admin-mode');
            document.body.classList.remove('admin-mode');
        };
    }, [isAdminView]);

    return (
        <div className={isAdminView ? 'page page-admin' : 'page'}>
            {!isAdminView && !isSellerContextView && (
                <div className="promo-banner">
                    <div className="promo-item">
                        🎯 7 Days Free Returns | T&C Apply
                    </div>
                    <div className="promo-item">
                        ⭐ Become an AUCTIFY VIP today!
                    </div>
                    <div className="promo-item">
                        📱 Save more on the AUCTIFY App! 25% Off + ₱150 Off +
                        Free Shipping
                    </div>
                </div>
            )}

            {!isAdminView && (
                <Header
                    onNavigateHome={handleNavigateHome}
                    disableHomeNavigation={isSellerContextView}
                    isSellerMode={isSellerContextView}
                    onNavigateToAuction={handleNavigateAuction}
                    onNavigateLogin={handleNavigateLogin}
                    onNavigateRegister={handleNavigateRegister}
                    onNavigateAdminLogin={handleOpenAdminLoginInNewTab}
                    onNavigateAccount={handleNavigateAccount}
                    onNavigateSellerProfile={handleNavigateSellerProfile}
                    onNavigateSellerDashboard={
                        handleOpenSellerDashboardInNewTab
                    }
                    onNavigateSellerStore={(sellerId, sellerName) =>
                        handleNavigateSellerStore(
                            sellerId,
                            sellerName,
                            isSellerContextView ? 'seller-dashboard' : 'home',
                        )
                    }
                    showSellerDashboardButton={canAccessSellerDashboard}
                    onNavigateOrdersLogin={handleNavigateOrdersLogin}
                    onNavigateBag={handleNavigateBag}
                    enableHomeSearchSuggestions={
                        platformSettings.enable_home_search_suggestions
                    }
                    maxHomeSearchResults={
                        platformSettings.max_home_search_results
                    }
                    onLogout={handleLogout}
                />
            )}

            {!isSellerContextView && !isAdminView && (
                <Navigation
                    activeCategory={
                        viewMode === 'home' || viewMode === 'category'
                            ? selectedHomeCategory
                            : null
                    }
                    onSelectCategory={handleNavigateHomeCategory}
                    onSelectSubcategory={(category, subcategory) => {
                        const categoryValue = getCategoryValue(category);
                        const subcategoryValue = getSubcategoryValue(
                            categoryValue,
                            subcategory,
                        );
                        handleNavigateHomeCategory(category, subcategoryValue);
                    }}
                    onNavigateAuction={(auctionId) =>
                        handleNavigateAuction(auctionId, 'home')
                    }
                />
            )}

            {viewMode === 'admin-login' && (
                <AdminLoginPage onLoginSuccess={handleAdminLoginSuccess} />
            )}

            {viewMode === 'admin-dashboard' && isAdminAuthenticated && (
                <AdminDashboardPage onLogout={handleAdminLogout} />
            )}

            {viewMode === 'admin-dashboard' && !isAdminAuthenticated && (
                <AdminLoginPage onLoginSuccess={handleAdminLoginSuccess} />
            )}

            {(viewMode === 'home' || viewMode === 'category') &&
                !isAdminView && (
                    <HomePage
                        selectedCategory={selectedHomeCategory}
                        selectedSubcategory={selectedHomeSubcategory}
                        featureFlags={{
                            enableVideoAds: platformSettings.enable_video_ads,
                            enableCarousel: platformSettings.enable_carousel,
                            enablePromoCircles:
                                platformSettings.enable_promo_circles,
                        }}
                        isCategoryPage={viewMode === 'category'}
                        onNavigateHome={handleNavigateHome}
                        onNavigateCategory={handleNavigateHomeCategory}
                        onNavigateToRegister={handleNavigateRegister}
                        onNavigateToBrowse={handleNavigateHome}
                        onNavigateToWishlist={handleNavigateWishlistFromHome}
                        onNavigateToAuction={handleNavigateAuction}
                    />
                )}

            {viewMode === 'auction' && activeAuctionId && !isAdminView && (
                <AuctionDetailPage
                    auctionId={activeAuctionId}
                    backBreadcrumbLabel={
                        shouldReturnToReviewsFromAuction
                            ? 'My Reviews'
                            : shouldReturnToOrdersFromAuction
                              ? 'Orders & Tracking'
                              : shouldReturnToSellerStoreFromAuction
                                ? 'Seller Store'
                                : 'Home'
                    }
                    disableSellerStoreLink={isSellerContextView}
                    onNavigateHome={() => {
                        if (shouldReturnToReviewsFromAuction) {
                            handleNavigateAccount('reviews');
                            return;
                        }

                        if (shouldReturnToOrdersFromAuction) {
                            handleNavigateAccount('orders');
                            return;
                        }

                        if (shouldReturnToSellerStoreFromAuction) {
                            handleNavigateSellerStore(
                                activeSellerStoreId,
                                activeSellerStoreName,
                                sellerStoreOrigin,
                            );
                            return;
                        }

                        handleNavigateHome();
                    }}
                    onNavigateSellerDashboard={
                        handleOpenSellerDashboardInNewTab
                    }
                    onNavigateToRegister={handleNavigateRegister}
                    onNavigateToWishlist={handleNavigateWishlistFromHome}
                    onNavigateToSellerStore={handleNavigateSellerStore}
                />
            )}

            {viewMode === 'seller-store' &&
                activeSellerStoreId &&
                !isAdminView && (
                    <SellerStorePage
                        sellerId={activeSellerStoreId}
                        sellerName={activeSellerStoreName}
                        onNavigateSellerDashboard={() =>
                            handleNavigateSellerDashboard('products')
                        }
                        onNavigateBack={() => {
                            if (sellerStoreOrigin === 'account-orders') {
                                handleNavigateAccount('orders');
                                return;
                            }

                            if (sellerStoreOrigin === 'seller-dashboard') {
                                handleNavigateSellerDashboard('products');
                                return;
                            }

                            handleNavigateHome();
                        }}
                        backBreadcrumbLabel={
                            sellerStoreOrigin === 'account-orders'
                                ? 'Orders & Tracking'
                                : sellerStoreOrigin === 'seller-dashboard'
                                  ? 'Seller Dashboard'
                                  : 'Home'
                        }
                        onNavigateToAuction={handleNavigateAuction}
                        onMessageSeller={handleOpenSellerChat}
                        canMessageSeller={
                            platformSettings.enable_live_chat &&
                            (!authUser || authUser.id !== activeSellerStoreId)
                        }
                    />
                )}

            {viewMode === 'bag' && !isAdminView && (
                <BagPage
                    onNavigateHome={handleNavigateHome}
                    onNavigateToAuction={handleNavigateAuction}
                />
            )}

            {(viewMode === 'auth' ||
                ((viewMode === 'account' ||
                    viewMode === 'seller' ||
                    viewMode === 'seller-profile') &&
                    !authUser)) &&
                !isAdminView && (
                    <AuthPage
                        mode={
                            (viewMode === 'account' ||
                                viewMode === 'seller' ||
                                viewMode === 'seller-profile') &&
                            !authUser
                                ? 'login'
                                : authMode
                        }
                        onModeChange={setAuthMode}
                        onAuthSuccess={handleAuthSuccess}
                    />
                )}

            {viewMode === 'account' && authUser && !isAdminView && (
                <AccountPage
                    activeSection={accountSection}
                    onSectionChange={handleNavigateAccount}
                    onAccountDeleted={handleAccountDeleted}
                    onNavigateToAuction={handleNavigateAuction}
                    onNavigateSellerStore={handleNavigateSellerStore}
                />
            )}

            {viewMode === 'seller' &&
                authUser &&
                sellerSubView === 'dashboard' &&
                !isAdminView && (
                    <SellerDashboardPage
                        onNavigateAddProduct={handleNavigateSellerAddProduct}
                        onNavigateSellerStore={(shopName) =>
                            handleNavigateSellerStore(
                                authUser.id,
                                shopName,
                                'seller-dashboard',
                            )
                        }
                        activeSection={sellerDashboardSection}
                        onSectionChange={(section) =>
                            handleNavigateSellerDashboard(section)
                        }
                    />
                )}

            {viewMode === 'seller' &&
                authUser &&
                sellerSubView === 'add-product' &&
                !isAdminView && (
                    <SellerAddProductPage
                        onNavigateDashboard={() =>
                            handleNavigateSellerDashboard('products')
                        }
                    />
                )}

            {viewMode === 'seller-profile' && authUser && !isAdminView && (
                <SellerProfilePage
                    onNavigateSellerDashboard={handleNavigateSellerDashboard}
                    onNavigateSellerStore={(shopName) =>
                        handleNavigateSellerStore(
                            authUser.id,
                            shopName,
                            'seller-dashboard',
                        )
                    }
                />
            )}

            {!isSellerContextView && !isAdminView && <Footer />}

            {viewMode === 'seller' &&
                !isAdminView &&
                platformSettings.enable_live_chat && (
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
                            <svg
                                viewBox="0 0 24 24"
                                role="img"
                                focusable="false"
                            >
                                <path
                                    fill="currentColor"
                                    d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.25 3.4A.75.75 0 0 1 4.5 18.8V16.8A2.5 2.5 0 0 1 4 16V5.5Zm2.5-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1.25a.75.75 0 0 1 .75.75v1.99l3.34-2.67a.75.75 0 0 1 .47-.17h8.18a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-11Z"
                                />
                            </svg>
                        </span>
                        <span className="seller-chat-label">Chat</span>
                        {combinedChatBadgeCount > 0 && (
                            <span
                                className="chat-button-badge"
                                aria-label={`${combinedChatBadgeCount} unread chat updates`}
                            >
                                {combinedChatBadgeCount > 99
                                    ? '99+'
                                    : combinedChatBadgeCount}
                            </span>
                        )}
                    </button>
                )}

            {authUser && !isAdminView && platformSettings.enable_live_chat && (
                <SellerChatDialog
                    isOpen={isSellerChatOpen && viewMode !== 'auth'}
                    onClose={() => setIsSellerChatOpen(false)}
                    preferredUserId={activeSellerChatUserId}
                    preferredUserName={activeSellerChatName}
                    onNavigateSellerStore={(sellerId, sellerName) =>
                        handleNavigateSellerStore(
                            sellerId,
                            sellerName,
                            isSellerContextView ? 'seller-dashboard' : 'home',
                        )
                    }
                    onNavigateAuction={(auctionId) =>
                        handleNavigateAuction(auctionId, 'home')
                    }
                />
            )}

            {!isSellerContextView &&
                !isAdminView &&
                platformSettings.enable_live_chat && (
                    <button
                        className="chat-button"
                        aria-label="Open messages"
                        onClick={handleOpenUserMessages}
                    >
                        <span>A</span>
                        {combinedChatBadgeCount > 0 && (
                            <span
                                className="chat-button-badge"
                                aria-label={`${combinedChatBadgeCount} unread messages and bid alerts`}
                            >
                                {combinedChatBadgeCount > 99
                                    ? '99+'
                                    : combinedChatBadgeCount}
                            </span>
                        )}
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

            {accountStatusDialog && !isAdminView && (
                <div
                    className="delete-modal-overlay"
                    role="presentation"
                    onClick={() => setAccountStatusDialog(null)}
                >
                    <div
                        className="delete-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <div
                                className={`status-dialog-heading${accountStatusDialog.variant === 'conversation' ? 'is-conversation' : ''}`}
                            >
                                {accountStatusDialog.variant ===
                                    'conversation' && (
                                    <div
                                        className={`status-dialog-icon${accountStatusDialog.status ? ` is-${accountStatusDialog.status}` : ''}`}
                                        aria-hidden="true"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            role="img"
                                            focusable="false"
                                        >
                                            <path
                                                fill="currentColor"
                                                d={
                                                    accountStatusDialog.status ===
                                                    'deleted'
                                                        ? 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm3.53 11.47-1.06 1.06L12 13.06l-2.47 2.47-1.06-1.06L10.94 12 8.47 9.53l1.06-1.06L12 10.94l2.47-2.47 1.06 1.06L13.06 12Z'
                                                        : 'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm0 12.25a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 12 15.25Zm1.1-4.83-.29.2a1.53 1.53 0 0 0-.68 1.28v.35h-1.5v-.35a3.01 3.01 0 0 1 1.33-2.52l.29-.2a1.43 1.43 0 0 0 .65-1.18 1.5 1.5 0 0 0-3 0H8.4a3 3 0 1 1 6 0 2.93 2.93 0 0 1-1.3 2.42Z'
                                                }
                                            />
                                        </svg>
                                    </div>
                                )}
                                <div>
                                    {accountStatusDialog.badge && (
                                        <p
                                            className={`status-dialog-badge${accountStatusDialog.status ? ` is-${accountStatusDialog.status}` : ''}`}
                                        >
                                            {accountStatusDialog.badge}
                                        </p>
                                    )}
                                    <h3 className="delete-modal-title">
                                        {accountStatusDialog.title}
                                    </h3>
                                </div>
                            </div>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                {accountStatusDialog.message}
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => setAccountStatusDialog(null)}
                                >
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {shouldShowMaintenanceDialog && !isAdminView && (
                <div
                    className="delete-modal-overlay"
                    role="presentation"
                    onClick={() => setMaintenanceDialogDismissed(true)}
                >
                    <div
                        className="delete-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h3 className="delete-modal-title">
                                Maintenance Notice
                            </h3>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                {platformSettings.maintenance_message}
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => {
                                        setMaintenanceDialogDismissed(true);

                                        if (authUser) {
                                            logout();
                                            setAuctionOrigin(null);
                                            setSellerStoreOrigin(null);
                                            setIsSellerChatOpen(false);
                                            setActiveSellerChatUserId(null);
                                            setActiveSellerChatName('');
                                            setAuthMode('login');
                                            setViewMode('auth');
                                            window.history.pushState(
                                                {},
                                                '',
                                                '/login',
                                            );
                                            window.scrollTo(0, 0);
                                        }
                                    }}
                                >
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
