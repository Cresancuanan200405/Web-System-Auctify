import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getAdminAuthToken, logoutAdmin, updateAdminSession } from '../../lib/adminAuth';
import {
    getDefaultHomePageConfig,
    normalizeHomePageConfig,
    type HomePageConfig,
    type HomeCarouselSlide,
    type HomePromoCircle,
    type HomeVideoAd,
    type CircleTone,
} from '../../lib/homePageConfig';
import { adminApi, type AdminNotificationEntry, type AdminSettingEntry, type AdminUserDetails, type AdminUserListItem } from '../../services/adminApi';
import { auctionService } from '../../services/api';
import type { AuctionProduct } from '../../types';

interface AdminDashboardPageProps {
    onLogout: () => void;
}

type AdminSection = 'overview' | 'homepage' | 'users';
type SuspensionUnit = 'minutes' | 'hours' | 'days';
type QueueFilter = 'all' | 'high' | 'medium' | 'low' | 'missing-phone' | 'dormant' | 'seller-pending-kyc';
type UserReviewTab = 'overview' | 'seller' | 'documents' | 'actions' | 'advanced';
type UserActionPanel = 'suspension' | 'seller';
type HomepageDialogType = 'circle' | 'slide' | 'mini-slide' | 'video';
type NotificationFilter = 'all' | 'user' | 'seller' | 'bid' | 'kyc' | 'analytics';
type AdminGlobalSearchResult =
    | { id: string; type: 'user'; title: string; subtitle: string; onSelect: () => void }
    | { id: string; type: 'setting'; title: string; subtitle: string; onSelect: () => void }
    | { id: string; type: 'notification'; title: string; subtitle: string; onSelect: () => void };

type HomepageCreateDialogState =
    | { type: 'circle'; draft: HomePromoCircle }
    | { type: 'slide'; draft: HomeCarouselSlide }
    | { type: 'mini-slide'; draft: HomeCarouselSlide }
    | { type: 'video'; draft: HomeVideoAd };

type HomepageDeleteDialogState = {
    type: HomepageDialogType;
    id: string;
    title: string;
    message: string;
};

const NOTIF_TYPE_LABELS: Record<string, string> = {
    bid: 'Bid',
    bid_placed: 'Bid',
    outbid: 'Outbid',
    won: 'Won',
    auction_won: 'Won',
    ended: 'Ended',
    auction_ended: 'Ended',
    seller: 'Seller',
    seller_comment: 'Comment',
    comment: 'Comment',
    kyc: 'KYC',
    user: 'User',
    analytics: 'Analytics',
    payment: 'Payment',
    payment_due: 'Payment Due',
    refund: 'Refund',
    info: 'Info',
    system: 'System',
};

const formatNotifTypeLabel = (type: string): string =>
    NOTIF_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const ADMIN_SECTIONS: AdminSection[] = ['overview', 'homepage', 'users'];
const HOMEPAGE_IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.jfif,.png,.gif,.webp,.bmp,.tif,.tiff,.svg,.avif,.heic,.heif';

const isAdminSection = (value: string | null): value is AdminSection => {
    return value !== null && ADMIN_SECTIONS.includes(value as AdminSection);
};

const getInitialAdminSection = (): AdminSection => {
    if (typeof window === 'undefined') {
        return 'overview';
    }

    const fromHash = window.location.hash.startsWith('#section=')
        ? window.location.hash.replace('#section=', '')
        : null;
    if (isAdminSection(fromHash)) {
        return fromHash;
    }

    const fromQuery = new URLSearchParams(window.location.search).get('section');
    if (isAdminSection(fromQuery)) {
        return fromQuery;
    }

    const fromStorage = window.localStorage.getItem('admin-active-section');
    if (isAdminSection(fromStorage)) {
        return fromStorage;
    }

    return 'overview';
};

const makeId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

const resolveAdminMediaUrl = (url?: string) => {
    if (!url) {
        return '';
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
    if (!apiBase) {
        return url;
    }

    return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
};

const DashboardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const HomepageIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 10.5L12 4l8 6.5" />
        <path d="M6.5 9.5V20h11V9.5" />
        <path d="M10 20v-5h4v5" />
    </svg>
);

const UsersIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" />
        <circle cx="9.5" cy="8" r="3.5" />
        <path d="M21 21v-1.5a4 4 0 0 0-3-3.86" />
        <path d="M15.5 4.2a3.5 3.5 0 0 1 0 6.6" />
    </svg>
);

const ExternalLinkIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 5h5v5" />
        <path d="M10 14L19 5" />
        <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
);

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5" />
        <path d="M21 12H9" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 .99-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51.99H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const BellIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M10 17a2 2 0 0 0 4 0" />
    </svg>
);

const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
    </svg>
);

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onLogout }) => {
    const [activeSection, setActiveSection] = useState<AdminSection>(() => getInitialAdminSection());
    const [config, setConfig] = useState<HomePageConfig>(getDefaultHomePageConfig());
    const [savedConfig, setSavedConfig] = useState<HomePageConfig>(getDefaultHomePageConfig());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rawUsers, setRawUsers] = useState<AdminUserListItem[]>([]);
    const [marketProducts, setMarketProducts] = useState<AuctionProduct[]>([]);
    const [search, setSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [sellerReason, setSellerReason] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [userActionMfaCode, setUserActionMfaCode] = useState('');
    const [userActionRecoveryCode, setUserActionRecoveryCode] = useState('');
    const [useUserActionRecoveryCode, setUseUserActionRecoveryCode] = useState(false);
    const [isApplyingUserAction, setIsApplyingUserAction] = useState(false);
    const [suspensionUnit, setSuspensionUnit] = useState<SuspensionUnit>('days');
    const [suspensionValue, setSuspensionValue] = useState('1');
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
    const [userReviewTab, setUserReviewTab] = useState<UserReviewTab>('overview');
    const [openActionPanel, setOpenActionPanel] = useState<UserActionPanel>('suspension');
    const [showDangerActions, setShowDangerActions] = useState(false);
    const [dangerAcknowledge, setDangerAcknowledge] = useState(false);
    const [confirmDangerActionOpen, setConfirmDangerActionOpen] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [docPreviewUrls, setDocPreviewUrls] = useState<Record<string, string>>({});
    const [confirmDangerInput, setConfirmDangerInput] = useState('');
    const [uploadingMediaKey, setUploadingMediaKey] = useState<string | null>(null);
    const [createDialog, setCreateDialog] = useState<HomepageCreateDialogState | null>(null);
    const [deleteDialog, setDeleteDialog] = useState<HomepageDeleteDialogState | null>(null);
    const [dialogErrors, setDialogErrors] = useState<Record<string, string>>({});
    const [dialogUploadingKey, setDialogUploadingKey] = useState<string | null>(null);
    const [saveFabExpanded, setSaveFabExpanded] = useState(false);
    const [showAdminSearchModal, setShowAdminSearchModal] = useState(false);
    const [settingsGroupFilter, setSettingsGroupFilter] = useState<'all' | string>('all');

    // Notifications
    const [showNotificationPanel, setShowNotificationPanel] = useState(false);
    const [notifications, setNotifications] = useState<AdminNotificationEntry[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');

    // Settings
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [settingsPanelTab, setSettingsPanelTab] = useState<'settings' | 'password' | 'mfa'>('settings');
    const [settings, setSettings] = useState<AdminSettingEntry[]>([]);
    const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Change password
    const [cpCurrent, setCpCurrent] = useState('');
    const [cpNext, setCpNext] = useState('');
    const [cpConfirm, setCpConfirm] = useState('');
    const [cpLoading, setCpLoading] = useState(false);
    const [mfaStatusLoading, setMfaStatusLoading] = useState(false);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [mfaRecoveryCodesRemaining, setMfaRecoveryCodesRemaining] = useState(0);
    const [mfaSetupSecret, setMfaSetupSecret] = useState<string | null>(null);
    const [mfaSetupUri, setMfaSetupUri] = useState<string | null>(null);
    const [mfaSetupCode, setMfaSetupCode] = useState('');
    const [mfaRecoveryCodes, setMfaRecoveryCodes] = useState<string[]>([]);
    const [mfaActionCode, setMfaActionCode] = useState('');
    const [mfaActionLoading, setMfaActionLoading] = useState(false);
    const [mfaCopiedField, setMfaCopiedField] = useState<'secret' | 'uri' | 'recovery' | null>(null);

    // Calendar navigation
    const [calendarViewDate, setCalendarViewDate] = useState(() => new Date());

        // Studio tab
        const [studioTab, setStudioTab] = useState<'circles' | 'slides' | 'mini-slides' | 'videos'>('circles');

    const notificationPanelRef = useRef<HTMLDivElement>(null);
    const settingsPanelRef = useRef<HTMLDivElement>(null);
    const adminSearchRef = useRef<HTMLDivElement>(null);

    const mfaQrCodeUrl = useMemo(() => {
        if (!mfaSetupUri) {
            return null;
        }

        return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mfaSetupUri)}`;
    }, [mfaSetupUri]);

    const copyToClipboard = React.useCallback(async (value: string, field: 'secret' | 'uri' | 'recovery') => {
        const trimmed = value.trim();

        if (!trimmed) {
            return;
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(trimmed);
            } else {
                const fallbackInput = document.createElement('textarea');
                fallbackInput.value = trimmed;
                fallbackInput.style.position = 'fixed';
                fallbackInput.style.opacity = '0';
                document.body.appendChild(fallbackInput);
                fallbackInput.focus();
                fallbackInput.select();
                document.execCommand('copy');
                document.body.removeChild(fallbackInput);
            }

            setMfaCopiedField(field);
            window.setTimeout(() => {
                setMfaCopiedField((current) => (current === field ? null : current));
            }, 1500);
        } catch {
            toast.error('Unable to copy text automatically. Please copy it manually.');
        }
    }, []);

    const downloadRecoveryCodes = React.useCallback(() => {
        if (mfaRecoveryCodes.length === 0) {
            return;
        }

        const content = [
            'Auctify Admin MFA Recovery Codes',
            `Generated: ${new Date().toISOString()}`,
            '',
            ...mfaRecoveryCodes,
            '',
            'Store these codes securely. Each code can be used once.',
        ].join('\n');

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'auctify-admin-mfa-recovery-codes.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [mfaRecoveryCodes]);

    useEffect(() => {
        const originalTitle = document.title;
        const iconElement = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
        const originalHref = iconElement?.href ?? null;

        document.title = 'Auctify Admin';

        if (iconElement) {
            iconElement.href = '/icons/Admin Logo.png';
            iconElement.type = 'image/png';
        }

        return () => {
            document.title = originalTitle;
            if (iconElement && originalHref) {
                iconElement.href = originalHref;
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem('admin-active-section', activeSection);

        const nextHash = `#section=${activeSection}`;
        if (window.location.hash !== nextHash) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
        }
    }, [activeSection]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleHashChange = () => {
            const fromHash = window.location.hash.startsWith('#section=')
                ? window.location.hash.replace('#section=', '')
                : null;

            if (isAdminSection(fromHash)) {
                setActiveSection(fromHash);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const token = getAdminAuthToken();
        if (!token) {
            toast.info('Admin session expired. Please login again.');
            onLogout();
            setIsLoading(false);
            return;
        }

        const loadDashboardData = async () => {
            try {
                const [configResult, usersResult] = await Promise.allSettled([
                    adminApi.getAdminHomepageConfig(token),
                    adminApi.getUsers(token),
                ]);

                if (!isActive) {
                    return;
                }

                if (configResult.status === 'fulfilled') {
                    const normalizedConfig = normalizeHomePageConfig(configResult.value.config);
                    setConfig(normalizedConfig);
                    setSavedConfig(normalizedConfig);
                } else {
                    const message = configResult.reason instanceof Error
                        ? configResult.reason.message
                        : 'Unable to load admin homepage configuration.';
                    toast.error(message);
                }

                if (usersResult.status === 'fulfilled') {
                    setRawUsers(usersResult.value.users || []);
                } else {
                    const message = usersResult.reason instanceof Error
                        ? usersResult.reason.message
                        : 'Unable to load users list.';
                    toast.error(message);
                }
            } catch (error) {
                if (isActive) {
                    const message = error instanceof Error ? error.message : 'Unable to load admin dashboard data.';
                    toast.error(message);
                }
            } finally {
                if (isActive) {
                    setIsLoading(false);
                }
            }
        };

        void loadDashboardData();

        return () => {
            isActive = false;
        };
    }, [onLogout]);

    const users = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return rawUsers;
        }

        return rawUsers.filter((user) => {
            return user.name.toLowerCase().includes(query)
                || user.email.toLowerCase().includes(query)
                || String(user.id).includes(query);
        });
    }, [rawUsers, search]);

    const overviewStats = useMemo(() => {
        const activeUsers = rawUsers.filter((user) => !user.isSuspended).length;
        const sellerUsers = rawUsers.filter((user) => user.isSeller).length;
        const estimatedRevenue = rawUsers.reduce((sum, user) => {
            const sellerBoost = user.isSeller ? 210 : 85;
            const verifyBoost = user.isVerified ? 125 : 30;
            return sum + sellerBoost + verifyBoost;
        }, 0);

        return {
            activeUsers,
            sellerUsers,
            estimatedRevenue,
        };
    }, [rawUsers]);

    const recentUsers = useMemo(() => {
        const toTime = (value?: string | null) => {
            if (!value) {
                return 0;
            }

            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        return [...users]
            .sort((a, b) => {
                return Math.max(toTime(b.lastSeenAt), toTime(b.createdAt))
                    - Math.max(toTime(a.lastSeenAt), toTime(a.createdAt));
            })
            .slice(0, 5);
    }, [users]);

    useEffect(() => {
        let isActive = true;

        const loadMarketProducts = async () => {
            try {
                const products = await auctionService.getAllProducts();
                if (!isActive) {
                    return;
                }

                setMarketProducts(products);
            } catch {
                if (isActive) {
                    setMarketProducts([]);
                }
            }
        };

        void loadMarketProducts();

        return () => {
            isActive = false;
        };
    }, []);

    const topProducts = useMemo(() => {
        return [...marketProducts]
            .sort((a, b) => Number(b.current_price || b.starting_price || 0) - Number(a.current_price || a.starting_price || 0))
            .slice(0, 4);
    }, [marketProducts]);

    const leaderboard = useMemo(() => {
        const sellers = new Map<number, { sellerId: number; sellerName: string; shopName: string; listingCount: number; grossValue: number }>();

        marketProducts.forEach((product) => {
            const sellerId = Number(product.user?.id ?? product.user_id);
            if (!Number.isFinite(sellerId) || sellerId <= 0) {
                return;
            }

            const sellerName = product.user?.name?.trim() || `Seller #${sellerId}`;
            const shopName = product.user?.seller_registration?.shop_name?.trim() || sellerName;
            const amount = Number(product.current_price || product.starting_price || 0);

            const existing = sellers.get(sellerId);
            if (!existing) {
                sellers.set(sellerId, {
                    sellerId,
                    sellerName,
                    shopName,
                    listingCount: 1,
                    grossValue: amount,
                });
                return;
            }

            existing.listingCount += 1;
            existing.grossValue += amount;
        });

        return Array.from(sellers.values())
            .sort((a, b) => {
                if (b.listingCount === a.listingCount) {
                    return b.grossValue - a.grossValue;
                }

                return b.listingCount - a.listingCount;
            })
            .slice(0, 3);
    }, [marketProducts]);

    const userMonitoringQueue = useMemo(() => {
        const toTime = (value?: string | null) => {
            if (!value) {
                return 0;
            }

            const parsed = new Date(value).getTime();
            return Number.isNaN(parsed) ? 0 : parsed;
        };

        const now = Date.now();

        return rawUsers
            .map((user) => {
                const lastSeenAt = toTime(user.lastSeenAt);
                const createdAt = toTime(user.createdAt);
                const inactivityDays = lastSeenAt > 0 ? Math.floor((now - lastSeenAt) / 86_400_000) : 999;

                const riskSignals: string[] = [];
                let riskScore = 0;

                if (user.isSuspended) {
                    riskSignals.push('Suspended');
                    riskScore += 60;
                }

                if (!user.isVerified) {
                    riskSignals.push('Unverified');
                    riskScore += 20;
                }

                if (!user.phone) {
                    riskSignals.push('No phone');
                    riskScore += 10;
                }

                if (inactivityDays > 30) {
                    riskSignals.push('Inactive 30d+');
                    riskScore += 25;
                } else if (inactivityDays > 14) {
                    riskSignals.push('Inactive 14d+');
                    riskScore += 12;
                }

                if (user.isSeller && !user.isVerified) {
                    riskSignals.push('Seller pending KYC');
                    riskScore += 15;
                }

                return {
                    user,
                    riskScore,
                    riskLevel: riskScore >= 70 ? 'high' : riskScore >= 35 ? 'medium' : 'low',
                    riskSignals,
                    lastSeenAt,
                    createdAt,
                };
            })
            .sort((a, b) => b.riskScore - a.riskScore)
            ;
    }, [rawUsers]);

    const filteredUserMonitoringQueue = useMemo(() => {
        return userMonitoringQueue.filter((entry) => {
            if (queueFilter === 'all') {
                return true;
            }

            if (queueFilter === 'high' || queueFilter === 'medium' || queueFilter === 'low') {
                return entry.riskLevel === queueFilter;
            }

            if (queueFilter === 'missing-phone') {
                return entry.riskSignals.includes('No phone');
            }

            if (queueFilter === 'dormant') {
                return entry.riskSignals.includes('Inactive 30d+');
            }

            if (queueFilter === 'seller-pending-kyc') {
                return entry.riskSignals.includes('Seller pending KYC');
            }

            return true;
        });
    }, [queueFilter, userMonitoringQueue]);

    const visibleUserMonitoringQueue = useMemo(() => {
        return filteredUserMonitoringQueue.slice(0, 12);
    }, [filteredUserMonitoringQueue]);

    const monitoringKpis = useMemo(() => {
        const totalUsers = rawUsers.length;
        const verifiedUsers = rawUsers.filter((user) => user.isVerified).length;
        const activeUsers = rawUsers.filter((user) => !user.isSuspended).length;
        const suspendedUsers = rawUsers.filter((user) => user.isSuspended).length;
        const flaggedUsers = userMonitoringQueue.filter((entry) => entry.riskLevel !== 'low').length;

        const sevenDaysAgo = Date.now() - (7 * 86_400_000);
        const newUsers7d = rawUsers.filter((user) => {
            if (!user.createdAt) {
                return false;
            }

            const createdAt = new Date(user.createdAt).getTime();
            return !Number.isNaN(createdAt) && createdAt >= sevenDaysAgo;
        }).length;

        return {
            totalUsers,
            verifiedUsers,
            activeUsers,
            suspendedUsers,
            flaggedUsers,
            newUsers7d,
            verificationRate: totalUsers > 0 ? Math.round((verifiedUsers / totalUsers) * 100) : 0,
            activeRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
        };
    }, [rawUsers, userMonitoringQueue]);

    const monitoringInsights = useMemo(() => {
        const now = Date.now();
        const day = 86_400_000;

        let active24h = 0;
        let active7d = 0;
        let active30d = 0;
        let dormant30d = 0;
        let noPhone = 0;
        let sellerPendingKyc = 0;

        rawUsers.forEach((user) => {
            if (!user.phone) {
                noPhone += 1;
            }

            if (user.isSeller && !user.isVerified) {
                sellerPendingKyc += 1;
            }

            const lastSeen = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : Number.NaN;
            if (Number.isNaN(lastSeen)) {
                dormant30d += 1;
                return;
            }

            const diff = now - lastSeen;
            if (diff <= day) {
                active24h += 1;
            }
            if (diff <= 7 * day) {
                active7d += 1;
            }
            if (diff <= 30 * day) {
                active30d += 1;
            } else {
                dormant30d += 1;
            }
        });

        const riskHigh = userMonitoringQueue.filter((entry) => entry.riskLevel === 'high').length;
        const riskMedium = userMonitoringQueue.filter((entry) => entry.riskLevel === 'medium').length;
        const riskLow = Math.max(monitoringKpis.totalUsers - (riskHigh + riskMedium), 0);

        return {
            active24h,
            active7d,
            active30d,
            dormant30d,
            noPhone,
            sellerPendingKyc,
            riskHigh,
            riskMedium,
            riskLow,
        };
    }, [monitoringKpis.totalUsers, rawUsers, userMonitoringQueue]);

    const queueFilterLabel = useMemo(() => {
        if (queueFilter === 'all') return 'All users';
        if (queueFilter === 'high') return 'High risk';
        if (queueFilter === 'medium') return 'Medium risk';
        if (queueFilter === 'low') return 'Low risk';
        if (queueFilter === 'missing-phone') return 'Missing phone';
        if (queueFilter === 'dormant') return 'Dormant 30d+';
        return 'Seller pending KYC';
    }, [queueFilter]);

    const userGrowth7d = useMemo(() => {
        const dayKeys = Array.from({ length: 7 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (6 - index));
            return date;
        });

        const counts = new Map<string, number>();
        dayKeys.forEach((day) => counts.set(day.toISOString().slice(0, 10), 0));

        rawUsers.forEach((user) => {
            if (!user.createdAt) {
                return;
            }

            const createdAt = new Date(user.createdAt);
            if (Number.isNaN(createdAt.getTime())) {
                return;
            }

            createdAt.setHours(0, 0, 0, 0);
            const key = createdAt.toISOString().slice(0, 10);
            if (!counts.has(key)) {
                return;
            }

            counts.set(key, (counts.get(key) ?? 0) + 1);
        });

        const series = dayKeys.map((day) => {
            const key = day.toISOString().slice(0, 10);
            return {
                label: day.toLocaleDateString(undefined, { weekday: 'short' }),
                count: counts.get(key) ?? 0,
            };
        });

        const peak = series.reduce((max, item) => Math.max(max, item.count), 0);

        return {
            series,
            peak,
            total: series.reduce((sum, item) => sum + item.count, 0),
        };
    }, [rawUsers]);

    const userBreakdown = useMemo(() => {
        const total = rawUsers.length || 1;
        const verified = rawUsers.filter((user) => user.isVerified).length;
        const sellers = rawUsers.filter((user) => user.isSeller).length;
        const suspended = rawUsers.filter((user) => user.isSuspended).length;

        return {
            verified,
            sellers,
            suspended,
            unverified: rawUsers.length - verified,
            verifiedPct: Math.round((verified / total) * 100),
            sellersPct: Math.round((sellers / total) * 100),
            suspendedPct: Math.round((suspended / total) * 100),
        };
    }, [rawUsers]);

    const userMonitorSideData = useMemo(() => {
        const now = Date.now();
        const day = 86_400_000;

        const active24h = rawUsers.filter((user) => {
            if (!user.lastSeenAt) {
                return false;
            }

            const lastSeen = new Date(user.lastSeenAt).getTime();
            return !Number.isNaN(lastSeen) && (now - lastSeen) <= day;
        }).length;

        const signedUp7d = rawUsers.filter((user) => {
            if (!user.createdAt) {
                return false;
            }

            const createdAt = new Date(user.createdAt).getTime();
            return !Number.isNaN(createdAt) && createdAt >= (now - (7 * day));
        }).length;

        const noPhone = rawUsers.filter((user) => !user.phone).length;
        const suspended = rawUsers.filter((user) => user.isSuspended).length;
        const pendingSellerKyc = rawUsers.filter((user) => user.isSeller && !user.isVerified).length;

        const newestUsers = [...rawUsers]
            .sort((left, right) => {
                const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
                const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
                return rightTime - leftTime;
            })
            .slice(0, 5);

        return {
            active24h,
            signedUp7d,
            noPhone,
            suspended,
            pendingSellerKyc,
            newestUsers,
        };
    }, [rawUsers]);

    const adminCalendar = useMemo(() => {
        const realNow = new Date();
        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth();
        const isCurrentMonth =
            year === realNow.getFullYear() && month === realNow.getMonth();
        const today = isCurrentMonth ? realNow.getDate() : -1;

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startWeekday = firstDay.getDay();
        const totalDays = lastDay.getDate();

        const cells: Array<{ day: number | null; isToday: boolean }> = [];

        for (let index = 0; index < startWeekday; index += 1) {
            cells.push({ day: null, isToday: false });
        }

        for (let dayValue = 1; dayValue <= totalDays; dayValue += 1) {
            cells.push({ day: dayValue, isToday: dayValue === today });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ day: null, isToday: false });
        }

        return {
            monthLabel: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
            weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            cells,
        };
    }, [calendarViewDate]);

    const formatDisplayDate = (value?: string | null) => {
        if (!value) {
            return 'N/A';
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return 'N/A';
        }

        return parsed.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    useEffect(() => {
        let isActive = true;
        const token = getAdminAuthToken();

        if (!token || !selectedUserId) {
            setSelectedUser(null);
            return;
        }

        const loadDetails = async () => {
            setIsLoadingUserDetails(true);
            try {
                const response = await adminApi.getUserDetails(token, selectedUserId);
                if (isActive) {
                    setSelectedUser(response.user);
                }
            } catch (error) {
                if (isActive) {
                    const message = error instanceof Error ? error.message : 'Unable to load user details.';
                    toast.error(message);
                }
            } finally {
                if (isActive) {
                    setIsLoadingUserDetails(false);
                }
            }
        };

        void loadDetails();

        return () => {
            isActive = false;
        };
    }, [selectedUserId]);

    const persistHomepageConfig = async (nextConfig: HomePageConfig, successMessage = 'Homepage settings saved.') => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return false;
        }

        if (isSaving) {
            return false;
        }

        setIsSaving(true);

        try {
            const response = await adminApi.updateAdminHomepageConfig(token, nextConfig);
            const normalizedConfig = normalizeHomePageConfig(response.config);
            setConfig(normalizedConfig);
            setSavedConfig(normalizedConfig);
            toast.success(successMessage);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save homepage settings.';
            toast.error(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveChanges = async () => {
        if (JSON.stringify(config) === JSON.stringify(savedConfig)) {
            toast.info('No homepage changes to save.');
            return;
        }

        await persistHomepageConfig(config, 'Homepage settings saved.');
    };

    const handleDiscardHomepageChanges = () => {
        setConfig(savedConfig);
        toast.info('Unsaved homepage changes were discarded.');
    };

    const openAddCircleDialog = () => {
        setCreateDialog({
            type: 'circle',
            draft: { id: makeId('circle'), label: '', discount: '', tone: 'black' },
        });
    };

    const openAddSlideDialog = () => {
        setCreateDialog({
            type: 'slide',
            draft: {
                id: makeId('slide'),
                subtitle: '',
                title: '',
                price: '',
                brands: [],
                disclaimer: '',
                image: '',
            },
        });
    };

    const openAddMiniSlideDialog = () => {
        setCreateDialog({
            type: 'mini-slide',
            draft: {
                id: makeId('mini-slide'),
                subtitle: '',
                title: '',
                price: '',
                brands: [],
                disclaimer: '',
                image: '',
            },
        });
    };

    const openAddVideoDialog = () => {
        setCreateDialog({
            type: 'video',
            draft: {
                id: makeId('video'),
                title: '',
                subtitle: '',
                image: '',
                description: '',
                videoUrl: '',
                imageUrl: '',
            },
        });
    };

    const confirmCreateDialog = () => {
        if (!createDialog) {
            return;
        }

        if (createDialog.type === 'circle') {
            const errors: Record<string, string> = {};
            if (!createDialog.draft.label.trim()) errors.label = 'Circle title is required.';
            if (!createDialog.draft.discount.trim()) errors.discount = 'Subtitle / discount is required.';
            if (Object.keys(errors).length > 0) { setDialogErrors(errors); return; }

            setConfig((prev) => ({ ...prev, circles: [...prev.circles, createDialog.draft] }));
            setCreateDialog(null);
            setDialogErrors({});
            return;
        }

        if (createDialog.type === 'slide') {
            const errors: Record<string, string> = {};
            if (!createDialog.draft.subtitle.trim()) errors.subtitle = 'Small header is required.';
            if (!createDialog.draft.title.trim()) errors.slideTitle = 'Main title is required.';
            if (!createDialog.draft.price.trim()) errors.price = 'Discount text is required.';
            if (Object.keys(errors).length > 0) { setDialogErrors(errors); return; }

            setConfig((prev) => ({ ...prev, slides: [...prev.slides, createDialog.draft] }));
            setCreateDialog(null);
            setDialogErrors({});
            return;
        }

        if (createDialog.type === 'mini-slide') {
            const errors: Record<string, string> = {};
            if (!createDialog.draft.subtitle.trim()) errors.subtitle = 'Small header is required.';
            if (!createDialog.draft.title.trim()) errors.slideTitle = 'Main title is required.';
            if (!createDialog.draft.price.trim()) errors.price = 'Promo text is required.';
            if (Object.keys(errors).length > 0) { setDialogErrors(errors); return; }

            setConfig((prev) => ({ ...prev, miniSlides: [...prev.miniSlides, createDialog.draft] }));
            setCreateDialog(null);
            setDialogErrors({});
            return;
        }

        const errors: Record<string, string> = {};
        if (!createDialog.draft.title.trim()) errors.videoTitle = 'Ad title is required.';
        if (!createDialog.draft.description?.trim()) errors.description = 'Description is required.';
        if (Object.keys(errors).length > 0) { setDialogErrors(errors); return; }

        setConfig((prev) => ({ ...prev, videoAds: [...prev.videoAds, createDialog.draft] }));
        setCreateDialog(null);
        setDialogErrors({});
    };

    const openDeleteDialog = (type: HomepageDialogType, id: string, title: string) => {
        const labels: Record<HomepageDialogType, string> = {
            circle: 'promo circle',
            slide: 'carousel slide',
            'mini-slide': 'mini banner slide',
            video: 'video ad',
        };

        setDeleteDialog({
            type,
            id,
            title,
            message: `This ${labels[type]} will be removed from the current admin draft. Save changes to publish the deletion on the homepage.`,
        });
    };

    const confirmDeleteDialog = () => {
        if (!deleteDialog) {
            return;
        }

        if (deleteDialog.type === 'circle') {
            removeCircle(deleteDialog.id);
        } else if (deleteDialog.type === 'slide') {
            removeSlide(deleteDialog.id);
        } else if (deleteDialog.type === 'mini-slide') {
            removeMiniSlide(deleteDialog.id);
        } else {
            removeVideo(deleteDialog.id);
        }

        setDeleteDialog(null);
    };

    // ── Notifications ─────────────────────────────────────────────────────────

    const loadNotifications = async () => {
        const token = getAdminAuthToken();
        if (!token) return;
        setNotificationsLoading(true);
        try {
            const res = await adminApi.getNotifications(token);
            setNotifications(res.notifications);
            setUnreadCount(res.unreadCount);
        } catch {
            // silent
        } finally {
            setNotificationsLoading(false);
        }
    };

    const handleMarkNotificationRead = async (id: number) => {
        const token = getAdminAuthToken();
        if (!token) return;
        try {
            await adminApi.markNotificationRead(token, id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const handleMarkAllRead = async () => {
        const token = getAdminAuthToken();
        if (!token) return;
        try {
            await adminApi.markAllNotificationsRead(token);
            setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
            setUnreadCount(0);
        } catch { /* silent */ }
    };

    const handleDeleteNotification = async (id: number) => {
        const token = getAdminAuthToken();
        if (!token) return;
        try {
            await adminApi.deleteNotification(token, id);
            const wasUnread = notifications.find((n) => n.id === id)?.readAt === null;
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch { /* silent */ }
    };

    const renderNotificationAnalytics = (notif: AdminNotificationEntry) => {
        const analytics = (notif.data as {
            analytics?: {
                users?: { total?: number };
                sellers?: { active?: number; revoked?: number };
                marketplace?: { active_listings?: number; total_bids?: number; closed_sales?: number };
            };
        } | null)?.analytics;

        if (!analytics) {
            return null;
        }

        return (
            <small className="admin-notif-analytics-inline">
                Users: {Number(analytics.users?.total ?? 0).toLocaleString()} • Sellers: {Number(analytics.sellers?.active ?? 0).toLocaleString()} active • Sales: ₱{Number(analytics.marketplace?.closed_sales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </small>
        );
    };

    const filteredNotifications = useMemo(() => {
        if (notificationFilter === 'all') {
            return notifications;
        }

        return notifications.filter((notification) => {
            return notification.type.toLowerCase() === notificationFilter;
        });
    }, [notificationFilter, notifications]);

    // ── Settings ──────────────────────────────────────────────────────────────

    const loadSettings = async () => {
        const token = getAdminAuthToken();
        if (!token) return;
        setSettingsLoading(true);
        try {
            const res = await adminApi.getSettings(token);
            setSettings(res.settings);
            const draft: Record<string, string> = {};
            res.settings.forEach((s) => { draft[s.key] = s.value; });
            setSettingsDraft(draft);
        } catch { /* silent */ } finally {
            setSettingsLoading(false);
        }
    };

    useEffect(() => {
        void loadSettings();
    }, []);

    const handleChangeAdminPassword = async () => {
        if (!cpCurrent.trim() || !cpNext.trim() || !cpConfirm.trim()) {
            toast.error('Fill in all password fields.');
            return;
        }
        if (cpNext !== cpConfirm) {
            toast.error('New passwords do not match.');
            return;
        }
        if (cpNext.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }
        const token = getAdminAuthToken();
        if (!token) return;
        setCpLoading(true);
        try {
            const res = await adminApi.changePassword(token, cpCurrent, cpNext, cpConfirm);
            if (res.user) {
                updateAdminSession({
                    userId: res.user.id,
                    email: res.user.email,
                    name: res.user.name,
                });
            }
            toast.success(res.message);
            setCpCurrent('');
            setCpNext('');
            setCpConfirm('');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to change password.');
        } finally {
            setCpLoading(false);
        }
    };

    const loadMfaStatus = async () => {
        const token = getAdminAuthToken();

        if (!token) {
            return;
        }

        setMfaStatusLoading(true);

        try {
            const status = await adminApi.getMfaStatus(token);
            setMfaEnabled(status.enabled);
            setMfaRecoveryCodesRemaining(status.recovery_codes_remaining);
        } catch {
            // Keep panel stable if status fails to load.
        } finally {
            setMfaStatusLoading(false);
        }
    };

    const handleStartMfaSetup = async () => {
        const token = getAdminAuthToken();

        if (!token) {
            return;
        }

        setMfaActionLoading(true);

        try {
            const setup = await adminApi.setupMfa(token);
            setMfaSetupSecret(setup.secret);
            setMfaSetupUri(setup.otpauth_uri);
            setMfaSetupCode('');
            setMfaRecoveryCodes([]);
            toast.info('MFA secret generated. Add it to your authenticator app, then verify with a code.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to start MFA setup.');
        } finally {
            setMfaActionLoading(false);
        }
    };

    const handleEnableMfa = async () => {
        const token = getAdminAuthToken();

        if (!token || !mfaSetupSecret) {
            return;
        }

        if (!mfaSetupCode.trim()) {
            toast.error('Enter a 6-digit code from your authenticator app.');
            return;
        }

        setMfaActionLoading(true);

        try {
            const result = await adminApi.enableMfa(token, mfaSetupSecret, mfaSetupCode);
            setMfaEnabled(true);
            setMfaRecoveryCodes(result.recovery_codes);
            setMfaSetupCode('');
            setMfaSetupSecret(null);
            setMfaSetupUri(null);
            setMfaRecoveryCodesRemaining(result.recovery_codes.length);
            toast.success(result.message);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to enable MFA.');
        } finally {
            setMfaActionLoading(false);
            void loadMfaStatus();
        }
    };

    const handleDisableMfa = async () => {
        const token = getAdminAuthToken();

        if (!token) {
            return;
        }

        if (!mfaActionCode.trim()) {
            toast.error('Enter your authenticator code to disable MFA.');
            return;
        }

        setMfaActionLoading(true);

        try {
            const result = await adminApi.disableMfa(token, mfaActionCode);
            setMfaEnabled(false);
            setMfaActionCode('');
            setMfaSetupSecret(null);
            setMfaSetupUri(null);
            setMfaRecoveryCodes([]);
            setMfaRecoveryCodesRemaining(0);
            toast.success(result.message);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to disable MFA.');
        } finally {
            setMfaActionLoading(false);
            void loadMfaStatus();
        }
    };

    const handleSaveSettings = async () => {
        const token = getAdminAuthToken();
        if (!token) return;
        setIsSavingSettings(true);
        try {
            const res = await adminApi.updateSettings(token, settingsDraft);
            setSettings(res.settings);
            const draft: Record<string, string> = {};
            res.settings.forEach((setting) => {
                draft[setting.key] = setting.value;
            });
            setSettingsDraft(draft);
            toast.success('Settings saved.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Open notification panel: load notifications lazily
    const handleToggleNotificationPanel = () => {
        const next = !showNotificationPanel;
        setShowNotificationPanel(next);
        if (next) {
            setShowSettingsPanel(false);
            setNotificationFilter('all');
            void loadNotifications();
        }
    };

    const handleToggleSettingsPanel = () => {
        const next = !showSettingsPanel;
        setShowSettingsPanel(next);
        if (next) {
            setShowNotificationPanel(false);
            setSettingsGroupFilter('all');
            void loadSettings();
            void loadMfaStatus();
        }
    };

    const formatGroupLabel = (group: string) => {
        return group
            .replace(/[_-]+/g, ' ')
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    };

    const featureFlagHealth = useMemo(() => {
        const featureFlags = settings.filter((setting) => (setting.group ?? 'general') === 'features' && setting.type === 'boolean');
        const enabled = featureFlags.filter((flag) => settingsDraft[flag.key] === 'true').length;
        const disabled = Math.max(featureFlags.length - enabled, 0);

        return {
            total: featureFlags.length,
            enabled,
            disabled,
            flags: featureFlags,
        };
    }, [settings, settingsDraft]);

    const settingsGroups = useMemo(() => {
        const grouped = new Map<string, AdminSettingEntry[]>();

        settings.forEach((setting) => {
            const group = setting.group ?? 'general';
            const existing = grouped.get(group) ?? [];
            existing.push(setting);
            grouped.set(group, existing);
        });

        const preferredOrder = ['general', 'features', 'limits', 'compliance', 'contact'];

        return Array.from(grouped.entries())
            .sort(([left], [right]) => {
                const leftIndex = preferredOrder.indexOf(left);
                const rightIndex = preferredOrder.indexOf(right);

                if (leftIndex === -1 && rightIndex === -1) {
                    return left.localeCompare(right);
                }
                if (leftIndex === -1) {
                    return 1;
                }
                if (rightIndex === -1) {
                    return -1;
                }
                return leftIndex - rightIndex;
            })
            .map(([group, groupSettings]) => ({
                group,
                label: formatGroupLabel(group),
                settings: [...groupSettings].sort((a, b) => a.label.localeCompare(b.label)),
            }));
    }, [settings]);

    const visibleSettingsGroups = useMemo(() => {
        if (settingsGroupFilter === 'all') {
            return settingsGroups;
        }

        return settingsGroups.filter((group) => group.group === settingsGroupFilter);
    }, [settingsGroupFilter, settingsGroups]);

    const adminSearchLimit = useMemo(() => {
        const rawLimit = Number(settingsDraft.max_admin_search_results ?? '8');
        return Number.isFinite(rawLimit) ? Math.min(20, Math.max(3, Math.floor(rawLimit))) : 8;
    }, [settingsDraft.max_admin_search_results]);

    const adminGlobalResults = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return [] as AdminGlobalSearchResult[];
        }

        const userResults: AdminGlobalSearchResult[] = users
            .slice(0, adminSearchLimit)
            .map((user) => ({
                id: `user-${user.id}`,
                type: 'user',
                title: user.name,
                subtitle: `${user.email} • ID ${user.id}`,
                onSelect: () => {
                    setActiveSection('users');
                    setSelectedUserId(user.id);
                    setShowAdminSearchModal(false);
                },
            }));

        const settingResults: AdminGlobalSearchResult[] = settings
            .filter((setting) => {
                const blob = `${setting.label} ${setting.key} ${setting.description ?? ''}`.toLowerCase();
                return blob.includes(query);
            })
            .slice(0, adminSearchLimit)
            .map((setting) => ({
                id: `setting-${setting.key}`,
                type: 'setting',
                title: setting.label,
                subtitle: `${formatGroupLabel(setting.group ?? 'general')} • ${setting.key}`,
                onSelect: () => {
                    setShowAdminSearchModal(false);
                    setShowNotificationPanel(false);
                    setShowSettingsPanel(true);
                    setSettingsGroupFilter(setting.group ?? 'general');
                    void loadSettings();
                },
            }));

        const notificationResults: AdminGlobalSearchResult[] = notifications
            .filter((notification) => {
                const blob = `${notification.title} ${notification.message}`.toLowerCase();
                return blob.includes(query);
            })
            .slice(0, adminSearchLimit)
            .map((notification) => ({
                id: `notif-${notification.id}`,
                type: 'notification',
                title: notification.title,
                subtitle: notification.message,
                onSelect: () => {
                    setShowAdminSearchModal(false);
                    setShowSettingsPanel(false);
                    setShowNotificationPanel(true);
                    void loadNotifications();
                },
            }));

        return [...userResults, ...settingResults, ...notificationResults].slice(0, adminSearchLimit);
    }, [adminSearchLimit, loadSettings, loadNotifications, notifications, search, settings, users]);

    // Close panels when clicking outside
    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (adminSearchRef.current && !adminSearchRef.current.contains(target)) {
                setShowAdminSearchModal(false);
            }
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(target)) {
                setShowNotificationPanel(false);
            }
            if (settingsPanelRef.current && !settingsPanelRef.current.contains(target)) {
                setShowSettingsPanel(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowAdminSearchModal(false);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    // Poll unread count with a lightweight endpoint.
    useEffect(() => {
        const token = getAdminAuthToken();
        if (!token) return;

        const pollUnread = async () => {
            try {
                const res = await adminApi.getNotificationUnreadCount(token);
                setUnreadCount(res.unreadCount);
            } catch { /* silent */ }
        };

        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void pollUnread();
            }
        }, 60_000);
        return () => window.clearInterval(id);
    }, []);

    // ── Dialog Upload ──────────────────────────────────────────────────────────

    const handleDialogUploadMedia = async (file: File, mediaType: 'video' | 'image') => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        const key = `dialog-${mediaType}`;
        setDialogUploadingKey(key);

        try {
            const response = await adminApi.uploadHomepageMedia(token, file, mediaType);

            setCreateDialog((prev) => {
                if (!prev) return prev;
                if (prev.type === 'slide' && mediaType === 'image') {
                    return { ...prev, draft: { ...prev.draft, image: response.url } };
                }
                if (prev.type === 'video') {
                    if (mediaType === 'video') {
                        return { ...prev, draft: { ...prev.draft, videoUrl: response.url } };
                    }
                    return { ...prev, draft: { ...prev.draft, imageUrl: response.url, image: response.url } };
                }
                return prev;
            });

            toast.success(mediaType === 'video' ? 'Video uploaded.' : 'Image uploaded.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Upload failed.');
        } finally {
            setDialogUploadingKey(null);
        }
    };

    // ── Reorder helpers ───────────────────────────────────────────────────────

    const moveCircle = (id: string, direction: 'up' | 'down') => {
        const arr = [...config.circles];
        const idx = arr.findIndex((c) => c.id === id);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        setConfig({ ...config, circles: arr });
    };

    const moveSlide = (id: string, direction: 'up' | 'down') => {
        const arr = [...config.slides];
        const idx = arr.findIndex((s) => s.id === id);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        setConfig({ ...config, slides: arr });
    };

    const moveVideo = (id: string, direction: 'up' | 'down') => {
        const arr = [...config.videoAds];
        const idx = arr.findIndex((v) => v.id === id);
        if (idx < 0) return;
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= arr.length) return;
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        setConfig({ ...config, videoAds: arr });
    };

    const hasUnsavedHomepageChanges = useMemo(() => {
        return JSON.stringify(config) !== JSON.stringify(savedConfig);
    }, [config, savedConfig]);

    const isAdminOverlayOpen = Boolean(createDialog || deleteDialog || selectedUserId || confirmDangerActionOpen || lightboxUrl);

    useEffect(() => {
        if (!hasUnsavedHomepageChanges) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedHomepageChanges]);

    useEffect(() => {
        if (!isAdminOverlayOpen) {
            return;
        }

        const originalBodyOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalBodyOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
        };
    }, [isAdminOverlayOpen]);

    const handleUserAction = async (action: 'suspend' | 'unsuspend' | 'delete' | 'revoke-seller' | 'unrevoke-seller', reasonInput: string) => {
        if (!selectedUser) {
            return;
        }

        const requiresStepUp = action === 'suspend' || action === 'revoke-seller' || action === 'delete';

        const reason = reasonInput.trim();
        if (reason.length < 5) {
            toast.error('Please enter a reason with at least 5 characters.');
            return;
        }

        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        setIsApplyingUserAction(true);
        try {
            if (requiresStepUp) {
                if (useUserActionRecoveryCode) {
                    if (!userActionRecoveryCode.trim()) {
                        toast.error('Enter an MFA recovery code for this destructive action.');
                        setIsApplyingUserAction(false);
                        return;
                    }

                    await adminApi.stepUpMfa(token, undefined, userActionRecoveryCode.trim());
                } else {
                    if (!userActionMfaCode.trim()) {
                        toast.error('Enter an MFA code for this destructive action.');
                        setIsApplyingUserAction(false);
                        return;
                    }

                    await adminApi.stepUpMfa(token, userActionMfaCode.trim());
                }
            }

            if (action === 'suspend') {
                const parsedDuration = Number(suspensionValue);
                if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
                    toast.error('Suspend duration must be a positive whole number.');
                    setIsApplyingUserAction(false);
                    return;
                }

                await adminApi.suspendUser(token, selectedUser.id, reason, {
                    unit: suspensionUnit,
                    value: parsedDuration,
                });
            } else if (action === 'unsuspend') {
                await adminApi.unsuspendUser(token, selectedUser.id, reason);
            } else if (action === 'delete') {
                await adminApi.deleteUser(token, selectedUser.id, reason);
                setSelectedUser(null);
                setSelectedUserId(null);
            } else if (action === 'unrevoke-seller') {
                await adminApi.unrevokeSeller(token, selectedUser.id, reason);
            } else {
                await adminApi.revokeSeller(token, selectedUser.id, reason);
            }

            const refreshedUsers = await adminApi.getUsers(token);
            setRawUsers(refreshedUsers.users || []);

            if (selectedUserId) {
                try {
                    const detailResponse = await adminApi.getUserDetails(token, selectedUserId);
                    setSelectedUser(detailResponse.user);
                } catch {
                    // User may have been deleted; leave modal closed state handled above.
                }
            }

            if (action === 'suspend' || action === 'unsuspend') {
                setSuspensionReason('');
            }
            if (action === 'revoke-seller' || action === 'unrevoke-seller') {
                setSellerReason('');
            }
            if (action === 'delete') {
                setDeleteReason('');
            }

            if (requiresStepUp) {
                setUserActionMfaCode('');
                setUserActionRecoveryCode('');
                setUseUserActionRecoveryCode(false);
            }

            toast.success('Action applied successfully.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to apply action.';
            toast.error(message);
        } finally {
            setIsApplyingUserAction(false);
        }
    };

    useEffect(() => {
        if (!selectedUserId) {
            setSuspensionReason('');
            setSellerReason('');
            setDeleteReason('');
            setUserActionMfaCode('');
            setUserActionRecoveryCode('');
            setUseUserActionRecoveryCode(false);
            setUserActionMfaCode('');
            setUserActionRecoveryCode('');
            setUseUserActionRecoveryCode(false);
            setSuspensionUnit('days');
            setSuspensionValue('1');
            setUserReviewTab('overview');
            setOpenActionPanel('suspension');
            setShowDangerActions(false);
            setDangerAcknowledge(false);
            setConfirmDangerActionOpen(false);
            setConfirmDangerInput('');
            return;
        }

        setUserReviewTab('overview');
        setOpenActionPanel('suspension');
        setShowDangerActions(false);
        setDangerAcknowledge(false);
        setConfirmDangerActionOpen(false);
        setConfirmDangerInput('');
    }, [selectedUserId]);

    const updateCircle = (id: string, next: Partial<HomePromoCircle>) => {
        setConfig({
            ...config,
            circles: config.circles.map((circle) => (circle.id === id ? { ...circle, ...next } : circle)),
        });
    };

    const addCircle = () => {
        openAddCircleDialog();
    };

    const removeCircle = (id: string) => {
        if (config.circles.length <= 1) {
            toast.info('At least one promo circle is required.');
            return;
        }

        const nextConfig: HomePageConfig = {
            ...config,
            circles: config.circles.filter((circle) => circle.id !== id),
        };

        setConfig(nextConfig);
    };

    const updateSlide = (id: string, next: Partial<HomeCarouselSlide>) => {
        setConfig({
            ...config,
            slides: config.slides.map((slide) => (slide.id === id ? { ...slide, ...next } : slide)),
        });
    };

    const addSlide = () => {
        openAddSlideDialog();
    };

    const removeSlide = (id: string) => {
        if (config.slides.length <= 1) {
            toast.info('At least one carousel slide is required.');
            return;
        }

        const nextConfig: HomePageConfig = {
            ...config,
            slides: config.slides.filter((slide) => slide.id !== id),
        };

        setConfig(nextConfig);
    };

    const handleUploadSlideImage = async (slideId: string, file: File) => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        const uploadKey = `slide-image-${slideId}`;
        setUploadingMediaKey(uploadKey);

        try {
            const response = await adminApi.uploadHomepageMedia(token, file, 'image');
            setConfig((prev) => ({
                ...prev,
                slides: prev.slides.map((slide) => (
                    slide.id === slideId ? { ...slide, image: response.url } : slide
                )),
            }));
            toast.success('Carousel image uploaded. Save changes to publish it on the homepage.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to upload image.';
            toast.error(message);
        } finally {
            setUploadingMediaKey(null);
        }
    };

    const updateMiniSlide = (id: string, next: Partial<HomeCarouselSlide>) => {
        setConfig((prev) => ({
            ...prev,
            miniSlides: prev.miniSlides.map((slide) => (slide.id === id ? { ...slide, ...next } : slide)),
        }));
    };

    const addMiniSlide = () => {
        openAddMiniSlideDialog();
    };

    const removeMiniSlide = (id: string) => {
        if (config.miniSlides.length <= 1) {
            toast.info('At least one mini banner slide is required.');
            return;
        }

        setConfig((prev) => ({
            ...prev,
            miniSlides: prev.miniSlides.filter((slide) => slide.id !== id),
        }));
    };

    const moveMiniSlide = (id: string, direction: 'up' | 'down') => {
        setConfig((prev) => {
            const arr = [...prev.miniSlides];
            const idx = arr.findIndex((s) => s.id === id);
            if (idx < 0) return prev;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= arr.length) return prev;
            [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
            return { ...prev, miniSlides: arr };
        });
    };

    const handleUploadMiniSlideImage = async (slideId: string, file: File) => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        const uploadKey = `mini-slide-image-${slideId}`;
        setUploadingMediaKey(uploadKey);

        try {
            const response = await adminApi.uploadHomepageMedia(token, file, 'image');
            setConfig((prev) => ({
                ...prev,
                miniSlides: prev.miniSlides.map((slide) => (
                    slide.id === slideId ? { ...slide, image: response.url } : slide
                )),
            }));
            toast.success('Mini banner image uploaded. Save changes to publish.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to upload image.';
            toast.error(message);
        } finally {
            setUploadingMediaKey(null);
        }
    };

    const updateVideo = (id: string, next: Partial<HomeVideoAd>) => {
        setConfig({
            ...config,
            videoAds: config.videoAds.map((video) => (video.id === id ? { ...video, ...next } : video)),
        });
    };

    const addVideo = () => {
        openAddVideoDialog();
    };

    const removeVideo = (id: string) => {
        if (config.videoAds.length <= 1) {
            toast.info('At least one video ad block is required.');
            return;
        }

        const nextConfig: HomePageConfig = {
            ...config,
            videoAds: config.videoAds.filter((video) => video.id !== id),
        };

        setConfig(nextConfig);
    };

    const handleUploadVideoMedia = async (videoId: string, file: File, type: 'video' | 'image') => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        const uploadKey = `${type}-${videoId}`;
        setUploadingMediaKey(uploadKey);

        try {
            const response = await adminApi.uploadHomepageMedia(token, file, type);
            setConfig((prev) => ({
                ...prev,
                videoAds: prev.videoAds.map((video) => {
                    if (video.id !== videoId) {
                        return video;
                    }

                    if (type === 'video') {
                        return { ...video, videoUrl: response.url };
                    }

                    return { ...video, imageUrl: response.url, image: response.url };
                }),
            }));
            toast.success(
                type === 'video'
                    ? 'Video uploaded. Save changes to publish it on the homepage.'
                    : 'Fallback image uploaded. Save changes to publish it on the homepage.',
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to upload file.';
            toast.error(message);
        } finally {
            setUploadingMediaKey(null);
        }
    };

    const handleLogout = () => {
        logoutAdmin();
        onLogout();
    };

    const selectedUserMedia = useMemo(() => {
        if (!selectedUser) {
            return [] as Array<{ key: string; label: string; fileName: string; previewUrl: string | null }>;
        }

        const verificationMedia = (selectedUser.verification?.media ?? [])
            .filter((item) => item.uploaded)
            .map((item) => ({
                key: item.key,
                label: item.label,
                fileName: item.fileName ?? 'Uploaded file',
                previewUrl: item.previewUrl ?? null,
            }));

        if (verificationMedia.length > 0) {
            return verificationMedia;
        }

        const sellerDocFallback: Array<{ key: string; label: string; fileName?: string | null }> = [
            {
                key: 'primary-document',
                label: selectedUser.sellerRegistration?.primaryDocumentType || 'Primary document',
                fileName: selectedUser.sellerRegistration?.primaryDocumentName,
            },
            {
                key: 'government-id',
                label: selectedUser.sellerRegistration?.governmentIdType || 'Government ID',
                fileName: selectedUser.sellerRegistration?.governmentIdFrontName,
            },
            {
                key: 'bir-certificate',
                label: 'BIR Certificate',
                fileName: selectedUser.sellerRegistration?.birCertificateName,
            },
        ];

        return sellerDocFallback
            .filter((item) => Boolean(item.fileName))
            .map((item) => ({
                key: item.key,
                label: item.label,
                fileName: item.fileName || 'Document',
                previewUrl: null,
            }));
    }, [selectedUser]);

    useEffect(() => {
        const objectUrls: string[] = [];
        let isActive = true;
        const token = getAdminAuthToken();

        setDocPreviewUrls({});

        if (!selectedUser || !token) {
            return () => {
                objectUrls.forEach((url) => URL.revokeObjectURL(url));
            };
        }

        const needsFetch = selectedUserMedia
            .filter((media) => !media.previewUrl)
            .filter((media) => ['selfie', 'government-id', 'utility-bill', 'bank-statement'].includes(media.key));

        if (needsFetch.length === 0) {
            return () => {
                objectUrls.forEach((url) => URL.revokeObjectURL(url));
            };
        }

        const loadPreviews = async () => {
            for (const media of needsFetch) {
                try {
                    const response = await fetch(`/api/admin/users/${selectedUser.id}/verification-media/${encodeURIComponent(media.key)}`, {
                        credentials: 'include',
                    });

                    if (!response.ok) {
                        continue;
                    }

                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    objectUrls.push(objectUrl);

                    if (!isActive) {
                        URL.revokeObjectURL(objectUrl);
                        continue;
                    }

                    setDocPreviewUrls((prev) => ({
                        ...prev,
                        [media.key]: objectUrl,
                    }));
                } catch {
                    // Keep fallback preview if fetch fails.
                }
            }
        };

        void loadPreviews();

        return () => {
            isActive = false;
            objectUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [selectedUser, selectedUserMedia]);

    const dangerConfirmationHint = useMemo(() => {
        if (!selectedUser) {
            return '';
        }

        return `${selectedUser.name} or ${selectedUser.id}`;
    }, [selectedUser]);

    const isDangerConfirmationValid = useMemo(() => {
        if (!selectedUser) {
            return false;
        }

        const input = confirmDangerInput.trim();
        if (!input) {
            return false;
        }

        if (input === String(selectedUser.id)) {
            return true;
        }

        return input.toLowerCase() === selectedUser.name.trim().toLowerCase();
    }, [confirmDangerInput, selectedUser]);

    return (
        <main className="admin-neo-shell">
            <aside className="admin-neo-sidebar" aria-label="Admin navigation">
                <div className="admin-neo-brand">
                    <img src="/icons/Admin Logo.png" alt="Auctify Admin" className="admin-neo-brand-logo" />
                    <span className="admin-neo-brand-name">Auctify</span>
                </div>
                <nav className="admin-neo-menu-group" role="navigation">
                    <p className="admin-neo-nav-section-label">MAIN</p>
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveSection('overview')}
                        title="Open dashboard overview"
                    >
                        <span className="admin-neo-menu-icon" aria-hidden="true"><DashboardIcon /></span>
                        <span className="admin-neo-menu-label">Dashboard</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'homepage' ? 'active' : ''}`}
                        onClick={() => setActiveSection('homepage')}
                        title="Open homepage content studio"
                    >
                        <span className="admin-neo-menu-icon" aria-hidden="true"><HomepageIcon /></span>
                        <span className="admin-neo-menu-label">Content</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveSection('users')}
                        title="Open user monitor"
                    >
                        <span className="admin-neo-menu-icon" aria-hidden="true"><UsersIcon /></span>
                        <span className="admin-neo-menu-label">Users</span>
                    </button>
                </nav>

                <div className="admin-neo-sidebar-bottom">
                    <p className="admin-neo-nav-section-label">TOOLS</p>
                    <button type="button" className="admin-neo-menu-btn" onClick={() => window.open('/', '_blank', 'noopener,noreferrer')} title="Open public homepage in new tab">
                        <span className="admin-neo-menu-icon" aria-hidden="true"><ExternalLinkIcon /></span>
                        <span className="admin-neo-menu-label">Preview</span>
                    </button>
                    <button type="button" className="admin-neo-menu-btn admin-neo-menu-btn-danger" onClick={handleLogout} title="Log out from admin">
                        <span className="admin-neo-menu-icon" aria-hidden="true"><LogoutIcon /></span>
                        <span className="admin-neo-menu-label">Log out</span>
                    </button>
                </div>
            </aside>

            <section className="admin-neo-main">
                <header className="admin-neo-topbar">
                    <div className="admin-neo-search-wrap" ref={adminSearchRef}>
                        <label className="admin-neo-search" htmlFor="admin-global-search">
                            <span aria-hidden="true"><SearchIcon /></span>
                            <input
                                id="admin-global-search"
                                type="search"
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setShowAdminSearchModal(true);
                                }}
                                onFocus={() => {
                                    setShowAdminSearchModal(true);
                                    if (settings.length === 0) {
                                        void loadSettings();
                                    }
                                    if (notifications.length === 0) {
                                        void loadNotifications();
                                    }
                                }}
                                placeholder="Search users, settings, notifications"
                            />
                        </label>
                        {showAdminSearchModal && search.trim().length > 0 && (
                            <div className="admin-global-search-modal">
                                {adminGlobalResults.length === 0 && (
                                    <p className="admin-panel-dropdown-empty">No quick matches found.</p>
                                )}
                                {adminGlobalResults.map((result) => (
                                    <button
                                        key={result.id}
                                        type="button"
                                        className="admin-global-search-item"
                                        onClick={result.onSelect}
                                    >
                                        <span className={`admin-global-search-type is-${result.type}`}>{result.type}</span>
                                        <span className="admin-global-search-copy">
                                            <strong>{result.title}</strong>
                                            <small>{result.subtitle}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="admin-neo-topbar-right">
                        <div className="admin-settings-health-badge" title="Feature toggle health">
                            <span>Flags</span>
                            <strong>{featureFlagHealth.enabled} ON</strong>
                            <small>{featureFlagHealth.disabled} OFF</small>
                        </div>
                        <div className="admin-neo-tool-group" aria-label="Admin quick tools">
                            <div className="admin-tool-btn-wrap" ref={settingsPanelRef}>
                                <button
                                    type="button"
                                    className={`admin-neo-tool-btn ${showSettingsPanel ? 'active' : ''}`}
                                    aria-label="Settings"
                                    title="Admin settings"
                                    onClick={handleToggleSettingsPanel}
                                >
                                    <SettingsIcon />
                                </button>
                                {showSettingsPanel && (
                                    <div className="admin-panel-dropdown admin-settings-dropdown">
                                        <div className="admin-panel-dropdown-header">
                                            <div>
                                                <strong>
                                                    {settingsPanelTab === 'settings'
                                                        ? 'System Settings'
                                                        : settingsPanelTab === 'password'
                                                            ? 'Change Password'
                                                            : 'Admin MFA'}
                                                </strong>
                                                <p>
                                                    {settingsPanelTab === 'settings'
                                                        ? 'Operational controls, limits, and safety defaults.'
                                                        : settingsPanelTab === 'password'
                                                            ? 'Update your admin account password.'
                                                            : 'Manage authenticator-based multi-factor access.'}
                                                </p>
                                            </div>
                                            {featureFlagHealth.total > 0 && settingsPanelTab === 'settings' && (
                                                <div className="admin-settings-health-inline">
                                                    <span>{featureFlagHealth.enabled} ON</span>
                                                    <span>{featureFlagHealth.disabled} OFF</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="admin-settings-panel-tabs" role="tablist" aria-label="Settings panel sections">
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={settingsPanelTab === 'settings'}
                                                className={`admin-settings-panel-tab ${settingsPanelTab === 'settings' ? 'is-active' : ''}`}
                                                onClick={() => setSettingsPanelTab('settings')}
                                            >
                                                System Settings
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={settingsPanelTab === 'password'}
                                                className={`admin-settings-panel-tab ${settingsPanelTab === 'password' ? 'is-active' : ''}`}
                                                onClick={() => setSettingsPanelTab('password')}
                                            >
                                                Change Password
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={settingsPanelTab === 'mfa'}
                                                className={`admin-settings-panel-tab ${settingsPanelTab === 'mfa' ? 'is-active' : ''}`}
                                                onClick={() => {
                                                    setSettingsPanelTab('mfa');
                                                    void loadMfaStatus();
                                                }}
                                            >
                                                MFA Security
                                            </button>
                                        </div>

                                        {settingsPanelTab === 'settings' && (
                                            <>
                                                {!settingsLoading && settingsGroups.length > 0 && (
                                                    <div className="admin-settings-group-tabs" role="tablist" aria-label="Settings groups">
                                                        <button
                                                            type="button"
                                                            className={`admin-settings-group-tab ${settingsGroupFilter === 'all' ? 'is-active' : ''}`}
                                                            onClick={() => setSettingsGroupFilter('all')}
                                                        >
                                                            All
                                                        </button>
                                                        {settingsGroups.map((group) => (
                                                            <button
                                                                key={group.group}
                                                                type="button"
                                                                className={`admin-settings-group-tab ${settingsGroupFilter === group.group ? 'is-active' : ''}`}
                                                                onClick={() => setSettingsGroupFilter(group.group)}
                                                            >
                                                                {group.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                {settingsLoading && <p className="admin-panel-dropdown-empty">Loading settings…</p>}
                                                {!settingsLoading && settings.length > 0 && (
                                                    <>
                                                        <div className="admin-settings-grid">
                                                            {visibleSettingsGroups.map((group) => (
                                                                <section key={group.group} className="admin-settings-group admin-settings-group-modern">
                                                                    <p className="admin-settings-group-label">{group.label}</p>
                                                                    {group.settings.map((setting) => (
                                                                        <label key={setting.key} className="admin-settings-row">
                                                                            <div className="admin-settings-row-copy">
                                                                                <span>{setting.label}</span>
                                                                                {setting.description && <small>{setting.description}</small>}
                                                                            </div>
                                                                            {setting.type === 'boolean' ? (
                                                                                <button
                                                                                    type="button"
                                                                                    className={`admin-settings-toggle ${settingsDraft[setting.key] === 'true' ? 'is-on' : ''}`}
                                                                                    onClick={() => setSettingsDraft((prev) => ({
                                                                                        ...prev,
                                                                                        [setting.key]: settingsDraft[setting.key] === 'true' ? 'false' : 'true',
                                                                                    }))}
                                                                                    aria-pressed={settingsDraft[setting.key] === 'true'}
                                                                                >
                                                                                    <span />
                                                                                </button>
                                                                            ) : (
                                                                                <input
                                                                                    type={setting.type === 'integer' ? 'number' : 'text'}
                                                                                    className="admin-settings-input"
                                                                                    value={settingsDraft[setting.key] ?? ''}
                                                                                    min={setting.type === 'integer' ? 0 : undefined}
                                                                                    onChange={(event) => setSettingsDraft((prev) => ({ ...prev, [setting.key]: event.target.value }))}
                                                                                />
                                                                            )}
                                                                        </label>
                                                                    ))}
                                                                </section>
                                                            ))}
                                                        </div>
                                                        <div className="admin-panel-dropdown-footer">
                                                            <button
                                                                type="button"
                                                                className="admin-neo-ghost-btn"
                                                                onClick={() => {
                                                                    const draft: Record<string, string> = {};
                                                                    settings.forEach((setting) => {
                                                                        draft[setting.key] = setting.value;
                                                                    });
                                                                    setSettingsDraft(draft);
                                                                }}
                                                            >
                                                                Reset Draft
                                                            </button>
                                                            <button type="button" className="admin-neo-primary-btn" onClick={() => void handleSaveSettings()} disabled={isSavingSettings}>
                                                                {isSavingSettings ? 'Saving…' : 'Save Settings'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}

                                        {settingsPanelTab === 'password' && (
                                            <div className="admin-settings-cp-section">
                                                <div className="admin-settings-cp-fields">
                                                    <input
                                                        type="password"
                                                        className="admin-settings-input"
                                                        placeholder="Current password"
                                                        autoComplete="current-password"
                                                        value={cpCurrent}
                                                        onChange={(event) => setCpCurrent(event.target.value)}
                                                    />
                                                    <input
                                                        type="password"
                                                        className="admin-settings-input"
                                                        placeholder="New password (min 8 chars)"
                                                        autoComplete="new-password"
                                                        value={cpNext}
                                                        onChange={(event) => setCpNext(event.target.value)}
                                                    />
                                                    <input
                                                        type="password"
                                                        className="admin-settings-input"
                                                        placeholder="Confirm new password"
                                                        autoComplete="new-password"
                                                        value={cpConfirm}
                                                        onChange={(event) => setCpConfirm(event.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="admin-neo-primary-btn"
                                                        disabled={cpLoading}
                                                        onClick={() => void handleChangeAdminPassword()}
                                                    >
                                                        {cpLoading ? 'Updating…' : 'Update Password'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {settingsPanelTab === 'mfa' && (
                                            <div className="admin-settings-cp-section">
                                                <div className="admin-settings-cp-fields">
                                                    {mfaStatusLoading ? (
                                                        <p className="admin-panel-dropdown-empty">Loading MFA status…</p>
                                                    ) : (
                                                        <>
                                                            <p>
                                                                MFA Status: <strong>{mfaEnabled ? 'Enabled' : 'Disabled'}</strong>
                                                            </p>
                                                            <p>
                                                                Recovery codes remaining: <strong>{mfaRecoveryCodesRemaining}</strong>
                                                            </p>
                                                        </>
                                                    )}

                                                    {!mfaEnabled && !mfaSetupSecret && (
                                                        <button
                                                            type="button"
                                                            className="admin-neo-primary-btn"
                                                            disabled={mfaActionLoading}
                                                            onClick={() => void handleStartMfaSetup()}
                                                        >
                                                            {mfaActionLoading ? 'Preparing…' : 'Start MFA Setup'}
                                                        </button>
                                                    )}

                                                    {mfaSetupSecret && (
                                                        <>
                                                            {mfaQrCodeUrl && (
                                                                <div className="admin-mfa-qr-wrap">
                                                                    <img
                                                                        className="admin-mfa-qr-image"
                                                                        src={mfaQrCodeUrl}
                                                                        alt="Scan this QR code in your authenticator app"
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="admin-mfa-inline-actions">
                                                                <input
                                                                    type="text"
                                                                    className="admin-settings-input"
                                                                    value={mfaSetupSecret}
                                                                    readOnly
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={() => void copyToClipboard(mfaSetupSecret, 'secret')}
                                                                >
                                                                    {mfaCopiedField === 'secret' ? 'Copied' : 'Copy secret'}
                                                                </button>
                                                            </div>
                                                            {mfaSetupUri && (
                                                                <div className="admin-mfa-inline-actions admin-mfa-inline-actions-stack">
                                                                    <textarea
                                                                        className="admin-settings-input"
                                                                        value={mfaSetupUri}
                                                                        readOnly
                                                                        rows={3}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        className="admin-neo-ghost-btn"
                                                                        onClick={() => void copyToClipboard(mfaSetupUri, 'uri')}
                                                                    >
                                                                        {mfaCopiedField === 'uri' ? 'Copied' : 'Copy setup URI'}
                                                                    </button>
                                                                </div>
                                                            )}
                                                            <input
                                                                type="text"
                                                                className="admin-settings-input"
                                                                placeholder="Enter 6-digit authenticator code"
                                                                value={mfaSetupCode}
                                                                onChange={(event) => setMfaSetupCode(event.target.value)}
                                                                inputMode="numeric"
                                                            />
                                                            <button
                                                                type="button"
                                                                className="admin-neo-primary-btn"
                                                                disabled={mfaActionLoading}
                                                                onClick={() => void handleEnableMfa()}
                                                            >
                                                                {mfaActionLoading ? 'Enabling…' : 'Enable MFA'}
                                                            </button>
                                                        </>
                                                    )}

                                                    {mfaEnabled && (
                                                        <>
                                                            <input
                                                                type="text"
                                                                className="admin-settings-input"
                                                                placeholder="Enter current MFA code to disable"
                                                                value={mfaActionCode}
                                                                onChange={(event) => setMfaActionCode(event.target.value)}
                                                                inputMode="numeric"
                                                            />
                                                            <button
                                                                type="button"
                                                                className="admin-neo-ghost-btn"
                                                                disabled={mfaActionLoading}
                                                                onClick={() => void handleDisableMfa()}
                                                            >
                                                                {mfaActionLoading ? 'Disabling…' : 'Disable MFA'}
                                                            </button>
                                                        </>
                                                    )}

                                                    {mfaRecoveryCodes.length > 0 && (
                                                        <div className="admin-settings-group admin-settings-group-modern">
                                                            <p className="admin-settings-group-label">Recovery Codes (shown once)</p>
                                                            <div className="admin-mfa-recovery-actions">
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={() => void copyToClipboard(mfaRecoveryCodes.join('\n'), 'recovery')}
                                                                >
                                                                    {mfaCopiedField === 'recovery' ? 'Copied' : 'Copy all codes'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={downloadRecoveryCodes}
                                                                >
                                                                    Download .txt
                                                                </button>
                                                            </div>
                                                            {mfaRecoveryCodes.map((code) => (
                                                                <input key={code} className="admin-settings-input" type="text" value={code} readOnly />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="admin-tool-btn-wrap" ref={notificationPanelRef}>
                                <button
                                    type="button"
                                    className={`admin-neo-tool-btn ${showNotificationPanel ? 'active' : ''}`}
                                    aria-label="Notifications"
                                    title="Admin notifications"
                                    onClick={handleToggleNotificationPanel}
                                >
                                    <BellIcon />
                                    {unreadCount > 0 && (
                                        <span className="admin-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                                    )}
                                </button>
                                {showNotificationPanel && (
                                    <div className="admin-panel-dropdown admin-notif-dropdown">
                                        <div className="admin-panel-dropdown-header">
                                            <strong>Notifications</strong>
                                            {unreadCount > 0 && (
                                                <button type="button" className="admin-notif-mark-all" onClick={() => void handleMarkAllRead()}>
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="admin-notif-filter-bar" role="tablist" aria-label="Filter notifications">
                                            {(['all', 'user', 'seller', 'bid', 'kyc', 'analytics'] as NotificationFilter[]).map((filter) => (
                                                <button
                                                    key={filter}
                                                    type="button"
                                                    className={`admin-notif-filter-btn ${notificationFilter === filter ? 'is-active' : ''}`}
                                                    onClick={() => setNotificationFilter(filter)}
                                                    role="tab"
                                                    aria-selected={notificationFilter === filter}
                                                >
                                                    {filter === 'all' ? 'All' : filter.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="admin-notif-list">
                                        {notificationsLoading && <p className="admin-panel-dropdown-empty">Loading…</p>}
                                        {!notificationsLoading && filteredNotifications.length === 0 && (
                                            <p className="admin-panel-dropdown-empty">No notifications yet.</p>
                                        )}
                                        {!notificationsLoading && filteredNotifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                className={`admin-notif-item ${notif.readAt ? '' : 'is-unread'} admin-notif-type-${notif.type}`}
                                                onClick={() => { if (!notif.readAt) void handleMarkNotificationRead(notif.id); }}
                                            >
                                                <div className="admin-notif-item-body">
                                                    <span className={`admin-notif-type-chip admin-notif-chip-${notif.type}`}>{formatNotifTypeLabel(notif.type)}</span>
                                                    <strong>{notif.title}</strong>
                                                    <p>{notif.message}</p>
                                                    {renderNotificationAnalytics(notif)}
                                                    <small>{new Date(notif.createdAt).toLocaleString()}</small>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="admin-notif-item-dismiss"
                                                    onClick={(e) => { e.stopPropagation(); void handleDeleteNotification(notif.id); }}
                                                    title="Dismiss"
                                                    aria-label="Dismiss notification"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <div className={`admin-neo-layout-grid ${activeSection === 'homepage' ? 'homepage-focus' : ''}`}>
                    <section className="admin-neo-main-column">
                        {activeSection === 'overview' && (
                            <div className="admin-overview-section">
                                <div className="admin-neo-monitor-grid">
                                    <article className="admin-neo-monitor-card is-users">
                                        <p className="admin-neo-monitor-label">User Base</p>
                                        <strong>{monitoringKpis.totalUsers.toLocaleString()}</strong>
                                        <p className="admin-neo-monitor-meta">+{monitoringKpis.newUsers7d} new in the last 7 days</p>
                                        <div className="admin-neo-monitor-meter" aria-label="Active user ratio">
                                            <span style={{ width: `${monitoringKpis.activeRate}%` }} />
                                        </div>
                                        <p className="admin-neo-monitor-foot">{monitoringKpis.activeUsers} active accounts ({monitoringKpis.activeRate}%)</p>
                                    </article>

                                    <article className="admin-neo-monitor-card is-kyc">
                                        <p className="admin-neo-monitor-label">Verification Health</p>
                                        <strong>{monitoringKpis.verificationRate}%</strong>
                                        <p className="admin-neo-monitor-meta">{monitoringKpis.verifiedUsers} verified, {userBreakdown.unverified} pending</p>
                                        <div className="admin-neo-monitor-meter" aria-label="KYC completion ratio">
                                            <span style={{ width: `${monitoringKpis.verificationRate}%` }} />
                                        </div>
                                        <p className="admin-neo-monitor-foot">Seller accounts: {overviewStats.sellerUsers}</p>
                                    </article>

                                    <article className="admin-neo-monitor-card is-risk">
                                        <p className="admin-neo-monitor-label">Risk Watchlist</p>
                                        <strong>{monitoringKpis.flaggedUsers}</strong>
                                        <p className="admin-neo-monitor-meta">{monitoringKpis.suspendedUsers} currently suspended</p>
                                        <div className="admin-neo-monitor-tags">
                                            <span>High risk</span>
                                            <span>Compliance</span>
                                        </div>
                                        <p className="admin-neo-monitor-foot">Review queue below for action</p>
                                        <button type="button" className="admin-monitor-link-btn" onClick={() => setQueueFilter('high')}>Open high-risk queue</button>
                                    </article>

                                    <article className="admin-neo-monitor-card is-activity">
                                        <p className="admin-neo-monitor-label">Users Active (24h)</p>
                                        <strong>{monitoringInsights.active24h}</strong>
                                        <p className="admin-neo-monitor-meta">{monitoringInsights.active7d} active in 7 days</p>
                                        <div className="admin-neo-monitor-meter" aria-label="24-hour activity share">
                                            <span style={{ width: `${monitoringKpis.totalUsers > 0 ? Math.round((monitoringInsights.active24h / monitoringKpis.totalUsers) * 100) : 0}%` }} />
                                        </div>
                                        <p className="admin-neo-monitor-foot">{monitoringInsights.active30d} active in 30 days</p>
                                        <button type="button" className="admin-monitor-link-btn" onClick={() => setQueueFilter('dormant')}>Show dormant users</button>
                                    </article>

                                    <article className="admin-neo-monitor-card is-backlog">
                                        <p className="admin-neo-monitor-label">Compliance Backlog</p>
                                        <strong>{monitoringInsights.sellerPendingKyc}</strong>
                                        <p className="admin-neo-monitor-meta">Seller accounts pending verification</p>
                                        <div className="admin-neo-monitor-tags">
                                            <span>No phone: {monitoringInsights.noPhone}</span>
                                            <span>Dormant 30d+: {monitoringInsights.dormant30d}</span>
                                        </div>
                                        <p className="admin-neo-monitor-foot">Prioritize these accounts for review</p>
                                        <button type="button" className="admin-monitor-link-btn" onClick={() => setQueueFilter('seller-pending-kyc')}>Filter KYC backlog</button>
                                    </article>
                                </div>

                                <article className="admin-panel-card admin-neo-surface">
                                    <div className="admin-panel-title-row">
                                        <h2>User Monitoring Queue</h2>
                                        <button type="button" onClick={() => setActiveSection('users')}>View all</button>
                                    </div>
                                    <div className="admin-monitor-queue-headline">
                                        <p className="admin-panel-subtitle">Prioritized by account risk score and inactivity signals.</p>
                                        <div className="admin-monitor-filter-bar" aria-label="Active queue filter">
                                            <span className="admin-monitor-filter-pill">{queueFilterLabel}</span>
                                            {queueFilter !== 'all' && (
                                                <button type="button" className="admin-monitor-clear-filter" onClick={() => setQueueFilter('all')}>
                                                    Clear filter
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="admin-users-table-wrap">
                                        <table className="admin-users-table admin-neo-table admin-monitor-table">
                                            <thead>
                                                <tr>
                                                    <th>User</th>
                                                    <th>Risk</th>
                                                    <th>Last Seen</th>
                                                    <th>Signals</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visibleUserMonitoringQueue.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="admin-users-empty">No users match the selected queue filter.</td>
                                                    </tr>
                                                )}
                                                {visibleUserMonitoringQueue.map((entry) => (
                                                    <tr key={entry.user.id} className="admin-users-row-clickable" onClick={() => setSelectedUserId(entry.user.id)}>
                                                        <td>
                                                            <div className="admin-monitor-user-cell">
                                                                <span className="admin-neo-avatar-dot">{entry.user.name.slice(0, 1).toUpperCase()}</span>
                                                                <div>
                                                                    <strong>{entry.user.name}</strong>
                                                                    <small>{entry.user.email}</small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`admin-user-chip ${entry.riskLevel === 'high' ? 'pending' : entry.riskLevel === 'medium' ? 'pending' : 'verified'}`}>
                                                                {entry.riskLevel.toUpperCase()} ({entry.riskScore})
                                                            </span>
                                                        </td>
                                                        <td>{entry.lastSeenAt > 0 ? new Date(entry.lastSeenAt).toLocaleString() : 'No activity'}</td>
                                                        <td className="admin-monitor-signals-cell">
                                                            {(entry.riskSignals.length > 0 ? entry.riskSignals : ['Healthy']).map((signal) => (
                                                                <span key={`${entry.user.id}-${signal}`} className="admin-monitor-signal-chip">{signal}</span>
                                                            ))}
                                                        </td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="admin-neo-ghost-btn"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    setSelectedUserId(entry.user.id);
                                                                }}
                                                            >
                                                                Review
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="admin-monitor-summary-grid" aria-label="Queue summary">
                                        <article className="admin-monitor-summary-card is-clickable" onClick={() => setQueueFilter('high')}>
                                            <p>High Risk Accounts</p>
                                            <strong>{monitoringInsights.riskHigh}</strong>
                                            <small>Immediate manual review recommended</small>
                                        </article>
                                        <article className="admin-monitor-summary-card is-clickable" onClick={() => setQueueFilter('medium')}>
                                            <p>Medium Risk Accounts</p>
                                            <strong>{monitoringInsights.riskMedium}</strong>
                                            <small>Watchlist with follow-up actions</small>
                                        </article>
                                        <article className="admin-monitor-summary-card is-clickable" onClick={() => setQueueFilter('missing-phone')}>
                                            <p>Profiles Missing Phone</p>
                                            <strong>{monitoringInsights.noPhone}</strong>
                                            <small>Low trust signal for account recovery</small>
                                        </article>
                                    </div>
                                </article>

                                <div className="admin-neo-bottom-grid">
                                    <article className="admin-panel-card admin-neo-surface">
                                        <h2>User Growth (7 days)</h2>
                                        <p className="admin-panel-subtitle">{userGrowth7d.total} new registrations this week.</p>
                                        <div className="admin-neo-trend-chart" aria-label="User growth over the last 7 days">
                                            {userGrowth7d.series.map((point, idx) => {
                                                const height = userGrowth7d.peak > 0 ? Math.max(14, Math.round((point.count / userGrowth7d.peak) * 100)) : 14;
                                                const rank = [...userGrowth7d.series].sort((a, b) => b.count - a.count).findIndex((p) => p.label === point.label) + 1;
                                                return (
                                                    <div
                                                        key={point.label}
                                                        className="admin-neo-trend-bar-wrap"
                                                        data-tip={`${point.label}: ${point.count} user${point.count !== 1 ? 's' : ''} · Rank #${rank} of 7`}
                                                    >
                                                        <span className="admin-neo-trend-bar" style={{ height: `${height}%` }} />
                                                        <small>{point.label}</small>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </article>

                                    <article className="admin-panel-card admin-neo-surface admin-neo-illustration">
                                        <h2>User Health Breakdown</h2>
                                        <p>Distribution of verification, sellers, and suspended accounts.</p>
                                        <div className="admin-neo-infographic">
                                            <div
                                                className="admin-neo-donut"
                                                aria-hidden="true"
                                                style={{
                                                    background: `conic-gradient(
                                                        #0f766e 0 ${userBreakdown.verifiedPct}%,
                                                        #2563eb ${userBreakdown.verifiedPct}% ${userBreakdown.verifiedPct + userBreakdown.sellersPct}%,
                                                        #be123c ${userBreakdown.verifiedPct + userBreakdown.sellersPct}% ${userBreakdown.verifiedPct + userBreakdown.sellersPct + userBreakdown.suspendedPct}%,
                                                        #cbd5e1 ${userBreakdown.verifiedPct + userBreakdown.sellersPct + userBreakdown.suspendedPct}% 100%
                                                    )`,
                                                }}
                                            >
                                                <span>{rawUsers.length}</span>
                                                <small>users</small>
                                            </div>

                                            <div className="admin-neo-breakdown-list">
                                                <p data-tip={`${userBreakdown.verifiedPct}% of ${rawUsers.length} users are verified`}><span className="dot verified" />Verified: {userBreakdown.verified} ({userBreakdown.verifiedPct}%)</p>
                                                <p data-tip={`${userBreakdown.sellersPct}% of ${rawUsers.length} users are active sellers`}><span className="dot seller" />Sellers: {userBreakdown.sellers} ({userBreakdown.sellersPct}%)</p>
                                                <p data-tip={`${userBreakdown.suspendedPct}% of ${rawUsers.length} users are suspended`}><span className="dot suspended" />Suspended: {userBreakdown.suspended} ({userBreakdown.suspendedPct}%)</p>
                                                <p data-tip={`${rawUsers.length > 0 ? Math.round((userBreakdown.unverified / rawUsers.length) * 100) : 0}% of ${rawUsers.length} users are unverified`}><span className="dot pending" />Unverified: {userBreakdown.unverified}</p>
                                            </div>
                                        </div>
                                        <div className="admin-neo-bottom-actions">
                                            <button type="button" className="admin-neo-primary-btn" onClick={() => setActiveSection('homepage')}>Edit homepage</button>
                                            <button type="button" className="admin-neo-ghost-btn" onClick={() => setActiveSection('users')}>Review users</button>
                                        </div>
                                    </article>

                                    <article className="admin-panel-card admin-neo-surface">
                                        <h2>Engagement Cohort</h2>
                                        <p className="admin-panel-subtitle">Distribution of user activity windows for retention monitoring.</p>
                                        <div className="admin-cohort-list">
                                            <div className="admin-cohort-row">
                                                <span>Active within 24h</span>
                                                <strong>{monitoringInsights.active24h}</strong>
                                                <div className="admin-cohort-bar"><i style={{ width: `${monitoringKpis.totalUsers > 0 ? Math.round((monitoringInsights.active24h / monitoringKpis.totalUsers) * 100) : 0}%` }} /></div>
                                            </div>
                                            <div className="admin-cohort-row">
                                                <span>Active 2-7 days</span>
                                                <strong>{Math.max(monitoringInsights.active7d - monitoringInsights.active24h, 0)}</strong>
                                                <div className="admin-cohort-bar"><i style={{ width: `${monitoringKpis.totalUsers > 0 ? Math.round((Math.max(monitoringInsights.active7d - monitoringInsights.active24h, 0) / monitoringKpis.totalUsers) * 100) : 0}%` }} /></div>
                                            </div>
                                            <div className="admin-cohort-row">
                                                <span>Active 8-30 days</span>
                                                <strong>{Math.max(monitoringInsights.active30d - monitoringInsights.active7d, 0)}</strong>
                                                <div className="admin-cohort-bar"><i style={{ width: `${monitoringKpis.totalUsers > 0 ? Math.round((Math.max(monitoringInsights.active30d - monitoringInsights.active7d, 0) / monitoringKpis.totalUsers) * 100) : 0}%` }} /></div>
                                            </div>
                                            <div className="admin-cohort-row">
                                                <span>Dormant 30d+</span>
                                                <strong>{monitoringInsights.dormant30d}</strong>
                                                <div className="admin-cohort-bar"><i style={{ width: `${monitoringKpis.totalUsers > 0 ? Math.round((monitoringInsights.dormant30d / monitoringKpis.totalUsers) * 100) : 0}%` }} /></div>
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            </div>
                        )}

                        {activeSection === 'homepage' && (
                            <section className="admin-dashboard-content admin-home-editor" aria-label="Homepage controls">
                                <header className="admin-home-editor-head">
                                    <div>
                                        <h2>Homepage Content Studio</h2>
                                        <p>Manage promo circles, hero carousel, and ad blocks with live-style previews. Changes stay in draft until you save them.</p>
                                    </div>
                                </header>

                                <div className="admin-home-studio-tabs" role="tablist" aria-label="Studio sections">
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={studioTab === 'circles'}
                                                className={`admin-home-studio-tab-btn ${studioTab === 'circles' ? 'is-active' : ''}`}
                                                onClick={() => setStudioTab('circles')}
                                            >
                                                Promo Circles
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={studioTab === 'slides'}
                                                className={`admin-home-studio-tab-btn ${studioTab === 'slides' ? 'is-active' : ''}`}
                                                onClick={() => setStudioTab('slides')}
                                            >
                                                Carousel Slides
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={studioTab === 'mini-slides'}
                                                className={`admin-home-studio-tab-btn ${studioTab === 'mini-slides' ? 'is-active' : ''}`}
                                                onClick={() => setStudioTab('mini-slides')}
                                            >
                                                Mini Banner
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={studioTab === 'videos'}
                                                className={`admin-home-studio-tab-btn ${studioTab === 'videos' ? 'is-active' : ''}`}
                                                onClick={() => setStudioTab('videos')}
                                            >
                                                Video Ads
                                            </button>
                                    </div>

                                {/* ── Promo Circles ── */}
                                {studioTab === 'circles' && (
                                <article className="admin-home-editor-card">
                                    <div className="admin-home-section-head">
                                        <div>
                                            <h3>Promo Circles</h3>
                                            <p>Top horizontal chips shown above the homepage hero section.</p>
                                        </div>
                                        <button type="button" className="admin-home-section-add-btn" onClick={addCircle} title="Add a new promo circle">
                                            <span>+</span> Add Circle
                                        </button>
                                    </div>
                                    <div className="admin-home-editor-list">
                                        {config.circles.map((circle, circleIndex) => (
                                            <div key={circle.id} className="admin-editor-card-modern">
                                                <div className="admin-editor-card-modern-head">
                                                    <span className="admin-editor-card-modern-badge">Circle {circleIndex + 1}</span>
                                                    <div className="admin-editor-card-modern-controls">
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveCircle(circle.id, 'up')}
                                                            disabled={circleIndex === 0}
                                                            title="Move up"
                                                        >↑</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveCircle(circle.id, 'down')}
                                                            disabled={circleIndex === config.circles.length - 1}
                                                            title="Move down"
                                                        >↓</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-delete-btn"
                                                            onClick={() => openDeleteDialog('circle', circle.id, circle.label || 'Promo circle')}
                                                            title="Delete this promo circle"
                                                        >Delete</button>
                                                    </div>
                                                </div>
                                                <div className="admin-editor-card-modern-body admin-editor-circle-body">
                                                    <div className="admin-editor-circle-preview-col">
                                                        <div className={`admin-home-circle-preview is-${circle.tone}`}>
                                                            <span>{circle.label || 'CIRCLE'}</span>
                                                        </div>
                                                        <p className="admin-editor-preview-caption">{circle.discount || 'Discount text'}</p>
                                                    </div>
                                                    <div className="admin-editor-card-modern-fields">
                                                        <label className="admin-editor-field-label">
                                                            <span>Circle Title</span>
                                                            <input
                                                                type="text"
                                                                value={circle.label}
                                                                onChange={(event) => updateCircle(circle.id, { label: event.target.value })}
                                                                placeholder="e.g. Flash Sale"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Subtitle / Discount</span>
                                                            <input
                                                                type="text"
                                                                value={circle.discount}
                                                                onChange={(event) => updateCircle(circle.id, { discount: event.target.value })}
                                                                placeholder="e.g. Up to 70% Off"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Circle Style</span>
                                                            <select
                                                                value={circle.tone}
                                                                onChange={(event) => updateCircle(circle.id, { tone: event.target.value as CircleTone })}
                                                            >
                                                                <option value="black">Black</option>
                                                                <option value="yellow">Yellow</option>
                                                                <option value="green">Green</option>
                                                                <option value="blue">Blue</option>
                                                                <option value="red">Red</option>
                                                                <option value="purple">Purple</option>
                                                                <option value="teal">Teal</option>
                                                                <option value="navy">Navy</option>
                                                                <option value="silver">Silver</option>
                                                            </select>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                                )}

                                {/* ── Carousel Slides ── */}
                                {studioTab === 'slides' && (
                                <article className="admin-home-editor-card">
                                    <div className="admin-home-section-head">
                                        <div>
                                            <h3>Carousel Slides</h3>
                                            <p>Main homepage hero with brand tags, discount, image, and campaign copy.</p>
                                        </div>
                                        <button type="button" className="admin-home-section-add-btn" onClick={addSlide} title="Add a new carousel slide">
                                            <span>+</span> Add Slide
                                        </button>
                                    </div>
                                    <div className="admin-home-editor-list">
                                        {config.slides.map((slide, slideIndex) => (
                                            <div key={slide.id} className="admin-editor-card-modern">
                                                <div className="admin-editor-card-modern-head">
                                                    <span className="admin-editor-card-modern-badge">Slide {slideIndex + 1}</span>
                                                    <div className="admin-editor-card-modern-controls">
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveSlide(slide.id, 'up')}
                                                            disabled={slideIndex === 0}
                                                            title="Move up"
                                                        >↑</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveSlide(slide.id, 'down')}
                                                            disabled={slideIndex === config.slides.length - 1}
                                                            title="Move down"
                                                        >↓</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-delete-btn"
                                                            onClick={() => openDeleteDialog('slide', slide.id, slide.title || 'Carousel slide')}
                                                            title="Delete this carousel slide"
                                                        >Delete</button>
                                                    </div>
                                                </div>
                                                <div className="admin-editor-card-modern-body admin-editor-slide-body">
                                                    <div
                                                        className="admin-home-slide-preview"
                                                        style={slide.image.trim() ? { backgroundImage: `url('${resolveAdminMediaUrl(slide.image)}')` } : undefined}
                                                    >
                                                        <div className="admin-home-slide-preview-overlay" />
                                                        <div className="admin-home-slide-preview-copy">
                                                            <p>{slide.subtitle || 'SMALL HEADER'}</p>
                                                            <strong>{slide.title || 'Main title'}</strong>
                                                            <span>{slide.price || 'Discount text'}</span>
                                                            <div className="admin-home-slide-preview-brands">
                                                                {(slide.brands || []).slice(0, 4).map((brand) => (
                                                                    <em key={`${slide.id}-${brand}`}>{brand}</em>
                                                                ))}
                                                            </div>
                                                            <small>{slide.disclaimer || 'Description text'}</small>
                                                        </div>
                                                        <button type="button" className="admin-home-slide-preview-cta">BID NOW →</button>
                                                        <div className="admin-home-slide-preview-nav" aria-hidden="true">
                                                            {config.slides.map((_, dotIndex) => (
                                                                <span
                                                                    key={`${slide.id}-dot-${dotIndex}`}
                                                                    className={`admin-home-slide-preview-dot ${dotIndex === slideIndex ? 'active' : ''}`}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="admin-editor-card-modern-fields admin-editor-slide-fields">
                                                        <label className="admin-editor-field-label">
                                                            <span>Small Header</span>
                                                            <input
                                                                type="text"
                                                                value={slide.subtitle}
                                                                onChange={(event) => updateSlide(slide.id, { subtitle: event.target.value })}
                                                                placeholder="e.g. WEEKEND SPECIAL"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Main Title</span>
                                                            <input
                                                                type="text"
                                                                value={slide.title}
                                                                onChange={(event) => updateSlide(slide.id, { title: event.target.value })}
                                                                placeholder="e.g. Exceptional Finds"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Discount Text</span>
                                                            <input
                                                                type="text"
                                                                value={slide.price}
                                                                onChange={(event) => updateSlide(slide.id, { price: event.target.value })}
                                                                placeholder="e.g. Up to 60% Off"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Brand Tags <small>(comma separated)</small></span>
                                                            <input
                                                                type="text"
                                                                value={slide.brands.join(', ')}
                                                                onChange={(event) => {
                                                                    const brands = event.target.value
                                                                        .split(',')
                                                                        .map((item) => item.trim())
                                                                        .filter((item) => item.length > 0);
                                                                    updateSlide(slide.id, { brands });
                                                                }}
                                                                placeholder="e.g. Rolex, Ferrari, Picasso"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Image URL</span>
                                                            <input
                                                                type="text"
                                                                value={slide.image}
                                                                onChange={(event) => updateSlide(slide.id, { image: event.target.value })}
                                                                placeholder="Path or URL"
                                                            />
                                                        </label>
                                                        <label className="admin-upload-control admin-editor-upload-btn" title="Upload a local image for this slide">
                                                            <span>{uploadingMediaKey === `slide-image-${slide.id}` ? '⏳ Uploading…' : '↑ Upload Slide Image'}</span>
                                                            <input
                                                                type="file"
                                                                accept={HOMEPAGE_IMAGE_ACCEPT}
                                                                disabled={uploadingMediaKey !== null}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (file) void handleUploadSlideImage(slide.id, file);
                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label admin-editor-slide-disclaimer">
                                                            <span>Campaign Description</span>
                                                            <textarea
                                                                value={slide.disclaimer}
                                                                onChange={(event) => updateSlide(slide.id, { disclaimer: event.target.value })}
                                                                placeholder="Campaign note or auction message"
                                                                rows={3}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                                )}

                                {/* ── Mini Banner Slides ── */}
                                {studioTab === 'mini-slides' && (
                                <article className="admin-home-editor-card">
                                    <div className="admin-home-section-head">
                                        <div>
                                            <h3>Mini Banner Slides</h3>
                                            <p>Smaller rotating banner strip shown below the main hero carousel on the homepage.</p>
                                        </div>
                                        <button type="button" className="admin-home-section-add-btn" onClick={addMiniSlide} title="Add a mini banner slide">
                                            <span>+</span> Add Slide
                                        </button>
                                    </div>
                                    <div className="admin-home-editor-list">
                                        {config.miniSlides.map((slide, slideIndex) => (
                                            <div key={slide.id} className="admin-editor-card-modern">
                                                <div className="admin-editor-card-modern-head">
                                                    <span className="admin-editor-card-modern-badge">Mini Slide {slideIndex + 1}</span>
                                                    <div className="admin-editor-card-modern-controls">
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveMiniSlide(slide.id, 'up')}
                                                            disabled={slideIndex === 0}
                                                            title="Move up"
                                                        >↑</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveMiniSlide(slide.id, 'down')}
                                                            disabled={slideIndex === config.miniSlides.length - 1}
                                                            title="Move down"
                                                        >↓</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-delete-btn"
                                                            onClick={() => openDeleteDialog('mini-slide', slide.id, slide.title || 'Mini banner slide')}
                                                            title="Delete this mini slide"
                                                        >Delete</button>
                                                    </div>
                                                </div>
                                                <div className="admin-editor-card-modern-body admin-editor-slide-body">
                                                    <div
                                                        className="admin-home-slide-preview admin-home-mini-slide-preview"
                                                        style={slide.image.trim() ? { backgroundImage: `url('${resolveAdminMediaUrl(slide.image)}')` } : undefined}
                                                    >
                                                        <div className="admin-home-slide-preview-overlay" />
                                                        <div className="admin-home-slide-preview-copy">
                                                            <p>{slide.subtitle || 'EYEBROW TEXT'}</p>
                                                            <strong>{slide.title || 'Banner title'}</strong>
                                                            <span>{slide.price || 'Promo text'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="admin-editor-card-modern-fields admin-editor-slide-fields">
                                                        <label className="admin-editor-field-label">
                                                            <span>Eyebrow / Category</span>
                                                            <input
                                                                type="text"
                                                                value={slide.subtitle}
                                                                onChange={(event) => updateMiniSlide(slide.id, { subtitle: event.target.value })}
                                                                placeholder="e.g. NEW ARRIVALS"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Banner Title</span>
                                                            <input
                                                                type="text"
                                                                value={slide.title}
                                                                onChange={(event) => updateMiniSlide(slide.id, { title: event.target.value })}
                                                                placeholder="e.g. Fresh Picks This Week"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Promo / Sub-text</span>
                                                            <input
                                                                type="text"
                                                                value={slide.price}
                                                                onChange={(event) => updateMiniSlide(slide.id, { price: event.target.value })}
                                                                placeholder="e.g. Starting from ₱500"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Category Tags <small>(comma separated)</small></span>
                                                            <input
                                                                type="text"
                                                                value={slide.brands.join(', ')}
                                                                onChange={(event) => {
                                                                    const brands = event.target.value
                                                                        .split(',')
                                                                        .map((item) => item.trim())
                                                                        .filter((item) => item.length > 0);
                                                                    updateMiniSlide(slide.id, { brands });
                                                                }}
                                                                placeholder="e.g. Art, Electronics"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Background Image URL</span>
                                                            <input
                                                                type="text"
                                                                value={slide.image}
                                                                onChange={(event) => updateMiniSlide(slide.id, { image: event.target.value })}
                                                                placeholder="Path or URL"
                                                            />
                                                        </label>
                                                        <label className="admin-upload-control admin-editor-upload-btn" title="Upload a local image for this mini slide">
                                                            <span>{uploadingMediaKey === `mini-slide-image-${slide.id}` ? '⏳ Uploading…' : '↑ Upload Image'}</span>
                                                            <input
                                                                type="file"
                                                                accept={HOMEPAGE_IMAGE_ACCEPT}
                                                                disabled={uploadingMediaKey !== null}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (file) void handleUploadMiniSlideImage(slide.id, file);
                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                                )}

                                {/* ── Video Ads ── */}
                                {studioTab === 'videos' && (
                                <article className="admin-home-editor-card admin-home-editor-card-full">
                                    <div className="admin-home-section-head">
                                        <div>
                                            <h3>Video Ads</h3>
                                            <p>Publish video URL ads or fallback image ads shown in the homepage ad block.</p>
                                        </div>
                                        <button type="button" className="admin-home-section-add-btn" onClick={addVideo} title="Add a new video ad">
                                            <span>+</span> Add Video Ad
                                        </button>
                                    </div>
                                    <div className="admin-home-editor-list">
                                        {config.videoAds.map((video, videoIndex) => (
                                            <div key={video.id} className="admin-editor-card-modern admin-editor-card-modern-video">
                                                <div className="admin-editor-card-modern-head">
                                                    <span className="admin-editor-card-modern-badge">Video Ad {videoIndex + 1}</span>
                                                    <div className="admin-editor-card-modern-controls">
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveVideo(video.id, 'up')}
                                                            disabled={videoIndex === 0}
                                                            title="Move up"
                                                        >↑</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-reorder-btn"
                                                            onClick={() => moveVideo(video.id, 'down')}
                                                            disabled={videoIndex === config.videoAds.length - 1}
                                                            title="Move down"
                                                        >↓</button>
                                                        <button
                                                            type="button"
                                                            className="admin-editor-delete-btn"
                                                            onClick={() => openDeleteDialog('video', video.id, video.title || 'Video ad')}
                                                            title="Delete this video ad"
                                                        >Delete</button>
                                                    </div>
                                                </div>
                                                <div className="admin-editor-card-modern-body admin-editor-video-body">
                                                    <div
                                                        className="admin-home-video-preview"
                                                        style={
                                                            !video.videoUrl && (video.imageUrl || video.image).trim()
                                                                ? { backgroundImage: `url('${resolveAdminMediaUrl((video.imageUrl || video.image).trim())}')` }
                                                                : undefined
                                                        }
                                                    >
                                                        {(video.videoUrl || '').trim().length > 0 && (
                                                            <video
                                                                className="admin-home-video-preview-media"
                                                                src={resolveAdminMediaUrl(video.videoUrl)}
                                                                poster={(video.imageUrl || video.image).trim() ? resolveAdminMediaUrl((video.imageUrl || video.image).trim()) : undefined}
                                                                controls
                                                                controlsList="nodownload noremoteplayback"
                                                                disablePictureInPicture
                                                                playsInline
                                                                autoPlay
                                                                loop
                                                                muted
                                                                preload="metadata"
                                                                onContextMenu={(event) => event.preventDefault()}
                                                            />
                                                        )}
                                                        <div className="admin-home-video-preview-overlay" />
                                                        <div className="admin-home-video-preview-copy">
                                                            <strong>{video.title || 'Ad title'}</strong>
                                                            <p>{video.description || video.subtitle || 'Ad description'}</p>
                                                            <span className={`admin-video-status-pill ${video.videoUrl ? 'is-active' : ''}`}>
                                                                {video.videoUrl ? '● Video Active' : '◌ Image Fallback'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="admin-editor-card-modern-fields admin-editor-video-fields">
                                                        <label className="admin-editor-field-label">
                                                            <span>Ad Title</span>
                                                            <input
                                                                type="text"
                                                                value={video.title}
                                                                onChange={(event) => updateVideo(video.id, { title: event.target.value })}
                                                                placeholder="e.g. Luxury Drop"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Description</span>
                                                            <input
                                                                type="text"
                                                                value={video.description ?? ''}
                                                                onChange={(event) => updateVideo(video.id, { description: event.target.value, subtitle: event.target.value })}
                                                                placeholder="Short campaign description"
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Video URL</span>
                                                            <input
                                                                type="text"
                                                                value={video.videoUrl ?? ''}
                                                                onChange={(event) => updateVideo(video.id, { videoUrl: event.target.value })}
                                                                placeholder="Streaming URL"
                                                            />
                                                        </label>
                                                        <label className="admin-upload-control admin-editor-upload-btn" title="Upload a local video file">
                                                            <span>{uploadingMediaKey === `video-${video.id}` ? '⏳ Uploading…' : '↑ Upload Video File'}</span>
                                                            <input
                                                                type="file"
                                                                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-m4v,video/*"
                                                                disabled={uploadingMediaKey !== null}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (file) void handleUploadVideoMedia(video.id, file, 'video');
                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                        <label className="admin-editor-field-label">
                                                            <span>Fallback Image URL</span>
                                                            <input
                                                                type="text"
                                                                value={video.imageUrl ?? video.image}
                                                                onChange={(event) => updateVideo(video.id, { imageUrl: event.target.value, image: event.target.value })}
                                                                placeholder="Shown when video unavailable"
                                                            />
                                                        </label>
                                                        <label className="admin-upload-control admin-editor-upload-btn" title="Upload a fallback image">
                                                            <span>{uploadingMediaKey === `image-${video.id}` ? '⏳ Uploading…' : '↑ Upload Fallback Image'}</span>
                                                            <input
                                                                type="file"
                                                                accept={HOMEPAGE_IMAGE_ACCEPT}
                                                                disabled={uploadingMediaKey !== null}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (file) void handleUploadVideoMedia(video.id, file, 'image');
                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </article>
                                )}
                            </section>
                        )}

                        {activeSection === 'users' && (
                            <section className="admin-dashboard-content" aria-label="User monitor">
                    <article className="admin-panel-card admin-panel-card-full">
                        <div className="admin-panel-title-row">
                            <h2>Users Table</h2>
                            <input
                                className="admin-search-input"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by name, email, or id"
                            />
                        </div>
                        <p className="admin-panel-subtitle">Live users list from the main users table.</p>
                        <div className="admin-users-table-wrap">
                            <table className="admin-users-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                        <th>Seller</th>
                                        <th>Status</th>
                                        <th>Last Seen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="admin-users-empty">No users found.</td>
                                        </tr>
                                    )}
                                    {users.map((user: AdminUserListItem) => (
                                        <tr
                                            key={`${user.email}-${user.id}`}
                                            className="admin-users-row-clickable"
                                            onClick={() => setSelectedUserId(user.id)}
                                        >
                                            <td>{user.id}</td>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone || 'N/A'}</td>
                                            <td>
                                                <span className={`admin-user-chip ${user.isSeller ? 'verified' : 'pending'}`}>
                                                    {user.sellerStatus || (user.isSeller ? 'Seller' : 'No')}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`admin-user-chip ${user.isSuspended ? 'pending' : 'verified'}`}>
                                                    {user.isSuspended ? 'Suspended' : 'Active'}
                                                </span>
                                            </td>
                                            <td>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                            </section>
                        )}
                    </section>

                    {activeSection !== 'homepage' && (
                    <aside className="admin-neo-right-column">
                        <article className="admin-panel-card admin-neo-surface admin-neo-profile-card">
                            <div className="admin-neo-profile-avatar">A</div>
                            <div>
                                <p className="admin-neo-profile-name">Admin Operator</p>
                                <p className="admin-neo-profile-sub">Auctify Control</p>
                            </div>
                        </article>

                        <article className="admin-panel-card admin-neo-surface admin-neo-side-card admin-side-calendar-card">
                            <div className="admin-panel-title-row">
                                <h2>Calendar</h2>
                                <div className="admin-side-calendar-nav">
                                    <button
                                        type="button"
                                        className="admin-side-calendar-nav-btn"
                                        title="Previous month"
                                        onClick={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                                        aria-label="Previous month"
                                    >
                                        ‹
                                    </button>
                                    <span className="admin-side-calendar-label">{adminCalendar.monthLabel}</span>
                                    <button
                                        type="button"
                                        className="admin-side-calendar-nav-btn"
                                        title="Next month"
                                        onClick={() => setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                                        aria-label="Next month"
                                    >
                                        ›
                                    </button>
                                </div>
                            </div>
                            <div className="admin-side-calendar-grid" role="grid" aria-label="Admin calendar">
                                {adminCalendar.weekdays.map((weekday) => (
                                    <span key={weekday} className="admin-side-calendar-weekday">{weekday}</span>
                                ))}
                                {adminCalendar.cells.map((cell, index) => (
                                    <span
                                        key={`calendar-cell-${index}`}
                                        className={`admin-side-calendar-day${cell.day === null ? ' is-empty' : ''}${cell.isToday ? ' is-today' : ''}`}
                                    >
                                        {cell.day ?? ''}
                                    </span>
                                ))}
                            </div>
                        </article>

                        {activeSection === 'users' && (
                            <>
                                <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                                    <div className="admin-panel-title-row">
                                        <h2>User Monitor KPIs</h2>
                                    </div>
                                    <div className="admin-side-widget-list">
                                        <p><strong>{userMonitorSideData.active24h}</strong> active in 24h</p>
                                        <p><strong>{userMonitorSideData.signedUp7d}</strong> new in 7 days</p>
                                        <p><strong>{userMonitorSideData.pendingSellerKyc}</strong> seller KYC pending</p>
                                        <p><strong>{userMonitorSideData.noPhone}</strong> missing phone number</p>
                                        <p><strong>{userMonitorSideData.suspended}</strong> suspended users</p>
                                    </div>
                                </article>

                                <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                                    <div className="admin-panel-title-row">
                                        <h2>Newest Accounts</h2>
                                    </div>
                                    <div className="admin-neo-side-list">
                                        {userMonitorSideData.newestUsers.length === 0 && <p className="admin-panel-subtitle">No user data yet.</p>}
                                        {userMonitorSideData.newestUsers.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                className="admin-neo-side-item"
                                                onClick={() => setSelectedUserId(user.id)}
                                            >
                                                <span className="admin-neo-side-avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                                                <span className="admin-neo-side-copy">
                                                    <strong>{user.name}</strong>
                                                    <small>{user.email}</small>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </article>
                            </>
                        )}

                        {activeSection !== 'users' && (
                        <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                            <div className="admin-panel-title-row">
                                <h2>Top products</h2>
                                <button type="button" onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>View all</button>
                            </div>
                            <div className="admin-neo-side-list">
                                {topProducts.length === 0 && <p className="admin-panel-subtitle">No product data yet.</p>}
                                {topProducts.map((product) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        className="admin-neo-side-item"
                                        onClick={() => window.open(`/auction/${product.id}`, '_blank', 'noopener,noreferrer')}
                                    >
                                        <span className="admin-neo-side-avatar">{(product.title || 'P').slice(0, 1).toUpperCase()}</span>
                                        <span className="admin-neo-side-copy">
                                            <strong>{product.title}</strong>
                                            <small>{product.user?.seller_registration?.shop_name || product.user?.name || `Seller #${product.user_id}`}</small>
                                        </span>
                                        <span className="admin-neo-side-price">₱{Number(product.current_price || product.starting_price || 0).toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </article>
                        )}

                        {activeSection !== 'users' && (
                        <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                            <div className="admin-panel-title-row">
                                <h2>Leaderboard</h2>
                                <button type="button" onClick={() => setActiveSection('users')}>View all</button>
                            </div>
                            <div className="admin-neo-leaderboard">
                                {leaderboard.map((entry, index) => (
                                    <button
                                        key={entry.sellerId}
                                        type="button"
                                        className="admin-neo-leader-row"
                                        onClick={() => window.open(`/seller-store/${entry.sellerId}?name=${encodeURIComponent(entry.shopName)}`, '_blank', 'noopener,noreferrer')}
                                    >
                                        <span className="admin-neo-rank">#{index + 1}</span>
                                        <div className="admin-neo-leader-copy">
                                            <strong>{entry.shopName}</strong>
                                            <small>{entry.listingCount} listing{entry.listingCount > 1 ? 's' : ''}</small>
                                        </div>
                                        <span className="admin-neo-leader-score">₱{Math.round(entry.grossValue).toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </article>
                        )}
                    </aside>
                    )}
                </div>

                {isLoading && <p className="admin-panel-subtitle">Loading admin data...</p>}
            </section>

            {createDialog && (
                <div className="admin-home-dialog-overlay" onClick={() => { setCreateDialog(null); setDialogErrors({}); }}>
                    <div className="admin-home-dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-home-dialog-header">
                            <div>
                                <p className="admin-home-dialog-kicker">Create homepage content</p>
                                <h3>
                                    {createDialog.type === 'circle'
                                        ? 'Add Promo Circle'
                                        : createDialog.type === 'slide'
                                            ? 'Add Carousel Slide'
                                            : createDialog.type === 'mini-slide'
                                                ? 'Add Mini Banner Slide'
                                                : 'Add Video Ad'}
                                </h3>
                            </div>
                            <button type="button" className="admin-home-dialog-close" onClick={() => { setCreateDialog(null); setDialogErrors({}); }} aria-label="Close dialog">×</button>
                        </div>
                        <div className="admin-home-dialog-body">
                            {createDialog.type === 'circle' && (
                                <div className="admin-home-dialog-grid">
                                    <label>
                                        <span>Circle title <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.label}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, label: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.label; return n; });
                                            }}
                                            placeholder="Flash Sale"
                                            className={dialogErrors.label ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.label && <p className="admin-dialog-field-error">{dialogErrors.label}</p>}
                                    </label>
                                    <label>
                                        <span>Subtitle / discount <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.discount}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, discount: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.discount; return n; });
                                            }}
                                            placeholder="Up to 70% Off"
                                            className={dialogErrors.discount ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.discount && <p className="admin-dialog-field-error">{dialogErrors.discount}</p>}
                                    </label>
                                    <label>
                                        <span>Circle style</span>
                                        <select
                                            value={createDialog.draft.tone}
                                            onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, tone: event.target.value as CircleTone } })}
                                        >
                                            <option value="black">Black</option>
                                            <option value="yellow">Yellow</option>
                                            <option value="green">Green</option>
                                            <option value="blue">Blue</option>
                                            <option value="red">Red</option>
                                            <option value="purple">Purple</option>
                                            <option value="teal">Teal</option>
                                            <option value="navy">Navy</option>
                                            <option value="silver">Silver</option>
                                        </select>
                                    </label>
                                </div>
                            )}

                            {createDialog.type === 'slide' && (
                                <div className="admin-home-dialog-grid">
                                    <label>
                                        <span>Small header <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.subtitle}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, subtitle: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.subtitle; return n; });
                                            }}
                                            placeholder="Weekend Special"
                                            className={dialogErrors.subtitle ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.subtitle && <p className="admin-dialog-field-error">{dialogErrors.subtitle}</p>}
                                    </label>
                                    <label>
                                        <span>Main title <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.title}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, title: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.slideTitle; return n; });
                                            }}
                                            placeholder="Exceptional Finds"
                                            className={dialogErrors.slideTitle ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.slideTitle && <p className="admin-dialog-field-error">{dialogErrors.slideTitle}</p>}
                                    </label>
                                    <label>
                                        <span>Discount text <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.price}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, price: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.price; return n; });
                                            }}
                                            placeholder="Up to 60% Off"
                                            className={dialogErrors.price ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.price && <p className="admin-dialog-field-error">{dialogErrors.price}</p>}
                                    </label>
                                    <label>
                                        <span>Brand tags <small>(comma separated)</small></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.brands.join(', ')}
                                            onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, brands: event.target.value.split(',').map((i) => i.trim()).filter((i) => i.length > 0) } })}
                                            placeholder="Rolex, Ferrari, Picasso"
                                        />
                                    </label>
                                    <label className="admin-home-dialog-grid-full">
                                        <span>Slide Image</span>
                                        <div className="admin-dialog-upload-row">
                                            <input
                                                type="text"
                                                value={createDialog.draft.image}
                                                onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, image: event.target.value } })}
                                                placeholder="Image URL or upload below"
                                            />
                                            <label className="admin-upload-control admin-dialog-upload-btn">
                                                <span>{dialogUploadingKey === 'dialog-image' ? '⏳ Uploading…' : '↑ Upload Image'}</span>
                                                <input
                                                    type="file"
                                                    accept={HOMEPAGE_IMAGE_ACCEPT}
                                                    disabled={dialogUploadingKey !== null}
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) void handleDialogUploadMedia(file, 'image');
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {createDialog.draft.image && (
                                            <img src={resolveAdminMediaUrl(createDialog.draft.image)} alt="Preview" className="admin-dialog-img-preview" />
                                        )}
                                    </label>
                                    <label className="admin-home-dialog-grid-full">
                                        <span>Campaign description</span>
                                        <textarea value={createDialog.draft.disclaimer} onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, disclaimer: event.target.value } })} rows={3} placeholder="Campaign note or auction message" />
                                    </label>
                                </div>
                            )}

                            {createDialog.type === 'mini-slide' && (
                                <div className="admin-home-dialog-grid">
                                    <label>
                                        <span>Eyebrow / Category <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.subtitle}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, subtitle: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.subtitle; return n; });
                                            }}
                                            placeholder="NEW ARRIVALS"
                                            className={dialogErrors.subtitle ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.subtitle && <p className="admin-dialog-field-error">{dialogErrors.subtitle}</p>}
                                    </label>
                                    <label>
                                        <span>Banner Title <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.title}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, title: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.slideTitle; return n; });
                                            }}
                                            placeholder="Fresh Picks This Week"
                                            className={dialogErrors.slideTitle ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.slideTitle && <p className="admin-dialog-field-error">{dialogErrors.slideTitle}</p>}
                                    </label>
                                    <label>
                                        <span>Promo Text <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.price}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, price: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.price; return n; });
                                            }}
                                            placeholder="Starting from ₱500"
                                            className={dialogErrors.price ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.price && <p className="admin-dialog-field-error">{dialogErrors.price}</p>}
                                    </label>
                                    <label>
                                        <span>Category Tags <small>(comma separated)</small></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.brands.join(', ')}
                                            onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, brands: event.target.value.split(',').map((i) => i.trim()).filter((i) => i.length > 0) } })}
                                            placeholder="Art, Electronics"
                                        />
                                    </label>
                                    <label className="admin-home-dialog-grid-full">
                                        <span>Background Image</span>
                                        <div className="admin-dialog-upload-row">
                                            <input
                                                type="text"
                                                value={createDialog.draft.image}
                                                onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, image: event.target.value } })}
                                                placeholder="Image URL or upload below"
                                            />
                                            <label className="admin-upload-control admin-dialog-upload-btn">
                                                <span>{dialogUploadingKey === 'dialog-image' ? '⏳ Uploading…' : '↑ Upload Image'}</span>
                                                <input
                                                    type="file"
                                                    accept={HOMEPAGE_IMAGE_ACCEPT}
                                                    disabled={dialogUploadingKey !== null}
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) void handleDialogUploadMedia(file, 'image');
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {createDialog.draft.image && (
                                            <img src={resolveAdminMediaUrl(createDialog.draft.image)} alt="Preview" className="admin-dialog-img-preview" />
                                        )}
                                    </label>
                                </div>
                            )}

                            {createDialog.type === 'video' && (
                                <div className="admin-home-dialog-grid">
                                    <label>
                                        <span>Ad title <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.title}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, title: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.videoTitle; return n; });
                                            }}
                                            placeholder="Luxury drop"
                                            className={dialogErrors.videoTitle ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.videoTitle && <p className="admin-dialog-field-error">{dialogErrors.videoTitle}</p>}
                                    </label>
                                    <label>
                                        <span>Description <em className="admin-dialog-required">*</em></span>
                                        <input
                                            type="text"
                                            value={createDialog.draft.description ?? ''}
                                            onChange={(event) => {
                                                setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, description: event.target.value, subtitle: event.target.value } });
                                                setDialogErrors((prev) => { const n = { ...prev }; delete n.description; return n; });
                                            }}
                                            placeholder="A short campaign description"
                                            className={dialogErrors.description ? 'is-invalid' : ''}
                                        />
                                        {dialogErrors.description && <p className="admin-dialog-field-error">{dialogErrors.description}</p>}
                                    </label>
                                    <label className="admin-home-dialog-grid-full">
                                        <span>Video File</span>
                                        <div className="admin-dialog-upload-row">
                                            <input
                                                type="text"
                                                value={createDialog.draft.videoUrl ?? ''}
                                                onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, videoUrl: event.target.value } })}
                                                placeholder="Video URL (or upload)"
                                            />
                                            <label className="admin-upload-control admin-dialog-upload-btn">
                                                <span>{dialogUploadingKey === 'dialog-video' ? '⏳ Uploading…' : '↑ Upload Video'}</span>
                                                <input
                                                    type="file"
                                                    accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                                                    disabled={dialogUploadingKey !== null}
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) void handleDialogUploadMedia(file, 'video');
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    </label>
                                    <label className="admin-home-dialog-grid-full">
                                        <span>Fallback Image</span>
                                        <div className="admin-dialog-upload-row">
                                            <input
                                                type="text"
                                                value={createDialog.draft.imageUrl ?? ''}
                                                onChange={(event) => setCreateDialog({ ...createDialog, draft: { ...createDialog.draft, imageUrl: event.target.value, image: event.target.value } })}
                                                placeholder="Fallback image URL (or upload)"
                                            />
                                            <label className="admin-upload-control admin-dialog-upload-btn">
                                                <span>{dialogUploadingKey === 'dialog-image' ? '⏳ Uploading…' : '↑ Upload Image'}</span>
                                                <input
                                                    type="file"
                                                    accept={HOMEPAGE_IMAGE_ACCEPT}
                                                    disabled={dialogUploadingKey !== null}
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0];
                                                        if (file) void handleDialogUploadMedia(file, 'image');
                                                        event.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {(createDialog.draft.imageUrl || createDialog.draft.image) && (
                                            <img src={resolveAdminMediaUrl(createDialog.draft.imageUrl || createDialog.draft.image)} alt="Fallback preview" className="admin-dialog-img-preview" />
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>
                        <div className="admin-home-dialog-actions">
                            <button type="button" className="admin-neo-ghost-btn" onClick={() => { setCreateDialog(null); setDialogErrors({}); }}>Cancel</button>
                            <button type="button" className="admin-neo-primary-btn" onClick={confirmCreateDialog} disabled={dialogUploadingKey !== null}>
                                {dialogUploadingKey ? 'Uploading…' : 'Create Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteDialog && (
                <div className="admin-home-dialog-overlay" onClick={() => setDeleteDialog(null)}>
                    <div className="admin-home-dialog admin-home-dialog-compact" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-home-dialog-header">
                            <div>
                                <p className="admin-home-dialog-kicker">Confirm deletion</p>
                                <h3>Delete {deleteDialog.title}?</h3>
                            </div>
                            <button type="button" className="admin-home-dialog-close" onClick={() => setDeleteDialog(null)} aria-label="Close dialog">×</button>
                        </div>
                        <div className="admin-home-dialog-body">
                            <p className="admin-home-dialog-message">{deleteDialog.message}</p>
                        </div>
                        <div className="admin-home-dialog-actions">
                            <button type="button" className="admin-neo-ghost-btn" onClick={() => setDeleteDialog(null)}>Cancel</button>
                            <button type="button" className="admin-danger-btn" onClick={confirmDeleteDialog}>Delete Draft Item</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Homepage save FAB ── */}
            {activeSection === 'homepage' && (
                <div className={`admin-save-fab-shell ${saveFabExpanded ? 'is-expanded' : ''} ${hasUnsavedHomepageChanges ? 'is-dirty' : ''}`}>
                    <button
                        type="button"
                        className="admin-save-fab-trigger"
                        onClick={() => setSaveFabExpanded((prev) => !prev)}
                        title={hasUnsavedHomepageChanges ? 'Unsaved changes — click to save or discard' : 'Homepage is up to date'}
                        aria-label="Homepage save status"
                    >
                        {hasUnsavedHomepageChanges ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                    </button>
                    <div className="admin-save-fab-panel">
                        <p className="admin-save-fab-label">
                            {hasUnsavedHomepageChanges ? 'Unsaved changes' : 'All changes saved'}
                        </p>
                        <div className="admin-save-fab-actions">
                            <button
                                type="button"
                                className="admin-save-fab-discard"
                                onClick={() => { handleDiscardHomepageChanges(); setSaveFabExpanded(false); }}
                                disabled={!hasUnsavedHomepageChanges || isSaving}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className="admin-save-fab-save"
                                onClick={() => { void handleSaveChanges(); setSaveFabExpanded(false); }}
                                disabled={isSaving || !hasUnsavedHomepageChanges}
                            >
                                {isSaving ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedUserId && (
                <div className="delete-modal-overlay" onClick={() => setSelectedUserId(null)}>
                    <div className={`delete-modal admin-user-modal admin-user-modal-wide${userReviewTab === 'documents' ? ' admin-user-modal-docs' : ''}`} onClick={(event) => event.stopPropagation()}>
                        <div className="delete-modal-header admin-user-modal-header">
                            <div>
                                <p className="admin-user-modal-kicker">Admin review workspace</p>
                                <h2 className="delete-modal-title">User Management</h2>
                            </div>
                            <button
                                type="button"
                                className="delete-modal-close"
                                onClick={() => setSelectedUserId(null)}
                                aria-label="Close user review"
                            >
                                ×
                            </button>
                        </div>
                        <div className="delete-modal-body admin-user-modal-body">
                            {isLoadingUserDetails && <p className="delete-modal-text">Loading user details...</p>}
                            {!isLoadingUserDetails && selectedUser && (
                                <>
                                    <div className="admin-user-review-tabs" role="tablist" aria-label="User review sections">
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={userReviewTab === 'overview'}
                                            className={`admin-user-review-tab ${userReviewTab === 'overview' ? 'active' : ''}`}
                                            onClick={() => setUserReviewTab('overview')}
                                        >
                                            Overview
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={userReviewTab === 'seller'}
                                            className={`admin-user-review-tab ${userReviewTab === 'seller' ? 'active' : ''}`}
                                            onClick={() => setUserReviewTab('seller')}
                                        >
                                            Seller Info
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={userReviewTab === 'documents'}
                                            className={`admin-user-review-tab ${userReviewTab === 'documents' ? 'active' : ''}`}
                                            onClick={() => setUserReviewTab('documents')}
                                        >
                                            Documents
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={userReviewTab === 'actions'}
                                            className={`admin-user-review-tab ${userReviewTab === 'actions' ? 'active' : ''}`}
                                            onClick={() => setUserReviewTab('actions')}
                                        >
                                            Actions
                                        </button>
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={userReviewTab === 'advanced'}
                                            className={`admin-user-review-tab ${userReviewTab === 'advanced' ? 'active' : ''}`}
                                            onClick={() => setUserReviewTab('advanced')}
                                        >
                                            Advanced
                                        </button>
                                    </div>

                                    {userReviewTab === 'overview' && (
                                        <section className="admin-user-review-panel" role="tabpanel">
                                            <div className="admin-user-overview-layout">
                                                <article className="admin-user-profile-main admin-user-overview-primary">
                                                    <header className="admin-user-profile-hero">
                                                        <img
                                                            src={selectedUser.avatar || '/icons/user.png'}
                                                            alt={selectedUser.name}
                                                            className="admin-user-profile-avatar"
                                                        />
                                                        <div className="admin-user-profile-copy">
                                                            <h3>{selectedUser.name}</h3>
                                                            <p>{selectedUser.email}</p>
                                                            <div className="admin-user-profile-tags">
                                                                <span className={selectedUser.isSuspended ? 'is-danger' : 'is-success'}>
                                                                    {selectedUser.isSuspended ? 'Suspended' : 'Active'}
                                                                </span>
                                                                <span className={selectedUser.isVerified ? 'is-success' : 'is-muted'}>
                                                                    {selectedUser.isVerified ? 'Verified' : 'Not Verified'}
                                                                </span>
                                                                <span className={selectedUser.sellerRegistration ? 'is-brand' : 'is-muted'}>
                                                                    {selectedUser.sellerRegistration ? 'Seller Profile' : 'Regular User'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </header>

                                                    <div className="admin-user-overview-metrics">
                                                        <article className="admin-user-overview-metric">
                                                            <span>Account health</span>
                                                            <strong>{selectedUser.isSuspended ? 'Flagged' : 'Good'}</strong>
                                                        </article>
                                                        <article className="admin-user-overview-metric">
                                                            <span>Verification</span>
                                                            <strong>{selectedUser.isVerified ? 'Complete' : 'Pending'}</strong>
                                                        </article>
                                                        <article className="admin-user-overview-metric">
                                                            <span>Access tier</span>
                                                            <strong>{selectedUser.sellerRegistration ? 'Seller' : 'Buyer'}</strong>
                                                        </article>
                                                    </div>

                                                    <div className="admin-user-detail-grid">
                                                        <p><strong>User ID</strong><span>{selectedUser.id}</span></p>
                                                        <p><strong>Phone</strong><span>{selectedUser.phone || 'N/A'}</span></p>
                                                        <p><strong>Birthday</strong><span>{selectedUser.birthday || 'N/A'}</span></p>
                                                        <p><strong>Joined</strong><span>{formatDisplayDate(selectedUser.createdAt)}</span></p>
                                                        <p><strong>Last Active</strong><span>{formatDisplayDate(selectedUser.lastSeenAt)}</span></p>
                                                        <p><strong>Updated</strong><span>{formatDisplayDate(selectedUser.updatedAt)}</span></p>
                                                        <p><strong>Suspended At</strong><span>{formatDisplayDate(selectedUser.suspendedAt)}</span></p>
                                                        <p><strong>Suspended Until</strong><span>{formatDisplayDate(selectedUser.suspendedUntil)}</span></p>
                                                        <p className="admin-user-detail-grid-full"><strong>Suspension Reason</strong><span>{selectedUser.suspendedReason || 'N/A'}</span></p>
                                                    </div>
                                                </article>

                                                <article className="admin-user-profile-card admin-user-overview-side-card">
                                                    <h4>Account Signals</h4>
                                                    <div className="admin-user-overview-signal-list">
                                                        <p><strong>Primary status</strong><span>{selectedUser.isSuspended ? 'Suspended account' : 'Active account'}</span></p>
                                                        <p><strong>Seller profile</strong><span>{selectedUser.sellerRegistration ? 'Registered and monitored' : 'Not enrolled as seller'}</span></p>
                                                        <p><strong>Verification state</strong><span>{selectedUser.isVerified ? 'Identity verified' : 'Verification pending'}</span></p>
                                                        <p><strong>Moderation focus</strong><span>{selectedUser.isSuspended ? 'Review suspension reason and expiry' : 'Monitor activity and KYC evidence'}</span></p>
                                                    </div>
                                                </article>
                                            </div>
                                        </section>
                                    )}

                                    {userReviewTab === 'seller' && (
                                        <section className="admin-user-review-panel" role="tabpanel">
                                            <div className="admin-user-seller-layout">
                                                <article className="admin-user-profile-card admin-user-seller-summary">
                                                    <h4>Seller Information</h4>
                                                    {!selectedUser.sellerRegistration && (
                                                        <div className="admin-user-doc-empty">This user does not have an active seller registration profile.</div>
                                                    )}
                                                    {selectedUser.sellerRegistration && (
                                                        <>
                                                            <div className="admin-user-overview-metrics admin-user-seller-metrics">
                                                                <article className="admin-user-overview-metric">
                                                                    <span>Current status</span>
                                                                    <strong>{selectedUser.sellerRegistration?.status || 'N/A'}</strong>
                                                                </article>
                                                                <article className="admin-user-overview-metric">
                                                                    <span>Seller type</span>
                                                                    <strong>{selectedUser.sellerRegistration?.sellerType || 'N/A'}</strong>
                                                                </article>
                                                                <article className="admin-user-overview-metric">
                                                                    <span>VAT profile</span>
                                                                    <strong>{selectedUser.sellerRegistration?.vatStatus || 'N/A'}</strong>
                                                                </article>
                                                            </div>
                                                            <div className="admin-user-seller-grid">
                                                                <p><strong>Shop Name</strong><span>{selectedUser.sellerRegistration?.shopName || 'N/A'}</span></p>
                                                                <p><strong>Location</strong><span>{selectedUser.sellerRegistration?.generalLocation || 'N/A'}</span></p>
                                                                <p><strong>Contact Email</strong><span>{selectedUser.sellerRegistration?.contactEmail || 'N/A'}</span></p>
                                                                <p><strong>Contact Phone</strong><span>{selectedUser.sellerRegistration?.contactPhone || 'N/A'}</span></p>
                                                                <p><strong>Business Email</strong><span>{selectedUser.sellerRegistration?.businessEmail || 'N/A'}</span></p>
                                                                <p><strong>Business Phone</strong><span>{selectedUser.sellerRegistration?.businessPhoneNumber || 'N/A'}</span></p>
                                                                <p><strong>TIN</strong><span>{selectedUser.sellerRegistration?.taxTin || 'N/A'}</span></p>
                                                                <p><strong>Registered Address</strong><span>{selectedUser.sellerRegistration?.registeredAddress || 'N/A'}</span></p>
                                                            </div>
                                                        </>
                                                    )}
                                                </article>

                                                {selectedUser.sellerRegistration && (
                                                    <article className="admin-user-profile-card admin-user-seller-governance">
                                                        <h4>Governance & Compliance</h4>
                                                        <div className="admin-user-overview-signal-list">
                                                            <p><strong>Seller state</strong><span>{selectedUser.sellerRegistration?.status || 'N/A'}</span></p>
                                                            <p><strong>Revocation reason</strong><span>{selectedUser.sellerRegistration?.revokedReason || 'None recorded'}</span></p>
                                                            <p><strong>Moderation checkpoint</strong><span>{selectedUser.sellerRegistration?.status === 'revoked' ? 'Awaiting restoration review' : 'Eligible for marketplace operations'}</span></p>
                                                        </div>
                                                    </article>
                                                )}
                                            </div>
                                        </section>
                                    )}

                                    {userReviewTab === 'documents' && (
                                        <section className="admin-user-review-panel" role="tabpanel">
                                            <article className="admin-user-profile-card admin-user-documents-shell">
                                                <header className="admin-user-documents-header">
                                                    <div>
                                                        <h4>Verified Seller Documents</h4>
                                                        <p>Use this gallery to verify identity evidence quality before approving high-risk account actions.</p>
                                                    </div>
                                                    <span className="admin-user-advanced-intro-badge">{selectedUserMedia.length} file{selectedUserMedia.length === 1 ? '' : 's'}</span>
                                                </header>

                                                <div className="admin-user-verification-grid admin-user-documents-grid">
                                                    {selectedUserMedia.length === 0 && (
                                                        <div className="admin-user-doc-empty">No uploaded verification media available for this account.</div>
                                                    )}
                                                    {selectedUserMedia.map((media) => {
                                                        const effectivePreviewUrl = media.previewUrl ?? docPreviewUrls[media.key] ?? null;

                                                        return (
                                                        <figure key={media.key} className="admin-user-doc-card">
                                                            {effectivePreviewUrl ? (
                                                                <button
                                                                    type="button"
                                                                    className="admin-user-doc-preview-wrap admin-user-doc-preview-action"
                                                                    onClick={() => setLightboxUrl(effectivePreviewUrl)}
                                                                    title="Open full-size document"
                                                                >
                                                                    <img src={effectivePreviewUrl} alt={media.label} />
                                                                </button>
                                                            ) : (
                                                                <div className="admin-user-doc-preview-wrap">
                                                                    <img src="/icons/Auctify1.jpg" alt={media.label} />
                                                                </div>
                                                            )}
                                                            <figcaption>
                                                                <strong>{media.label}</strong>
                                                                <small>{media.fileName}</small>
                                                                <span className="admin-user-doc-status">{effectivePreviewUrl ? 'Click to open full size' : 'Fallback preview'}</span>
                                                            </figcaption>
                                                        </figure>
                                                    );})}
                                                </div>
                                            </article>
                                        </section>
                                    )}

                                    {userReviewTab === 'actions' && (
                                        <section className="admin-user-action-panels" role="tabpanel">
                                            <div className="admin-user-action-tabs" role="tablist" aria-label="User action types">
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={openActionPanel === 'suspension'}
                                                    className={`admin-user-action-tab ${openActionPanel === 'suspension' ? 'active' : ''}`}
                                                    onClick={() => setOpenActionPanel('suspension')}
                                                >
                                                    Account Suspension
                                                </button>
                                                <button
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={openActionPanel === 'seller'}
                                                    className={`admin-user-action-tab ${openActionPanel === 'seller' ? 'active' : ''}`}
                                                    onClick={() => setOpenActionPanel('seller')}
                                                >
                                                    Seller Access
                                                </button>
                                            </div>

                                            <article className="admin-user-action-panel admin-user-action-panel-tabbed">
                                                {openActionPanel === 'suspension' && (
                                                    <div className="admin-user-action-body is-visible">
                                                        <p>Lock or restore account access with reason and duration.</p>
                                                        <label className="admin-user-reason-label" htmlFor="admin-suspension-reason">Suspension reason</label>
                                                        <textarea
                                                            id="admin-suspension-reason"
                                                            className="admin-user-reason-input"
                                                            value={suspensionReason}
                                                            onChange={(event) => setSuspensionReason(event.target.value)}
                                                            rows={3}
                                                            placeholder="Explain why this user should be suspended or restored"
                                                        />
                                                        <div className="admin-user-suspension-controls">
                                                            <label className="admin-user-reason-label" htmlFor="admin-suspension-duration">Suspension duration</label>
                                                            <div className="admin-user-suspension-inputs">
                                                                <input
                                                                    id="admin-suspension-duration"
                                                                    type="number"
                                                                    min={1}
                                                                    step={1}
                                                                    value={suspensionValue}
                                                                    onChange={(event) => setSuspensionValue(event.target.value)}
                                                                    disabled={isApplyingUserAction}
                                                                />
                                                                <select
                                                                    value={suspensionUnit}
                                                                    onChange={(event) => setSuspensionUnit(event.target.value as SuspensionUnit)}
                                                                    disabled={isApplyingUserAction}
                                                                >
                                                                    <option value="minutes">Minutes</option>
                                                                    <option value="hours">Hours</option>
                                                                    <option value="days">Days</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="admin-user-action-row">
                                                            <button
                                                                type="button"
                                                                className="admin-user-action-btn is-warning"
                                                                onClick={() => handleUserAction('suspend', suspensionReason)}
                                                                disabled={isApplyingUserAction || selectedUser.isSuspended || selectedUser.isAdmin}
                                                            >
                                                                Suspend account
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-user-action-btn is-neutral"
                                                                onClick={() => handleUserAction('unsuspend', suspensionReason)}
                                                                disabled={isApplyingUserAction || !selectedUser.isSuspended || selectedUser.isAdmin}
                                                            >
                                                                Restore account
                                                            </button>
                                                        </div>

                                                        <div className="admin-user-mfa-stepup">
                                                            <p className="admin-user-mfa-stepup-title">MFA step-up required for suspension actions</p>
                                                            <div className="admin-user-mfa-stepup-toggle-row">
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={() => setUseUserActionRecoveryCode((prev) => !prev)}
                                                                >
                                                                    {useUserActionRecoveryCode ? 'Use authenticator code' : 'Use recovery code'}
                                                                </button>
                                                            </div>
                                                            {!useUserActionRecoveryCode ? (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionMfaCode}
                                                                    onChange={(event) => setUserActionMfaCode(event.target.value)}
                                                                    placeholder="Enter 6-digit MFA code"
                                                                    inputMode="numeric"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionRecoveryCode}
                                                                    onChange={(event) => setUserActionRecoveryCode(event.target.value)}
                                                                    placeholder="Enter MFA recovery code"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {openActionPanel === 'seller' && (
                                                    <div className="admin-user-action-body is-visible">
                                                        <p>Manage marketplace privileges independent from account suspension.</p>
                                                        <label className="admin-user-reason-label" htmlFor="admin-seller-reason">Seller action reason</label>
                                                        <textarea
                                                            id="admin-seller-reason"
                                                            className="admin-user-reason-input"
                                                            value={sellerReason}
                                                            onChange={(event) => setSellerReason(event.target.value)}
                                                            rows={3}
                                                            placeholder="State why seller status should be revoked or restored"
                                                        />
                                                        <div className="admin-user-action-row">
                                                            <button
                                                                type="button"
                                                                className="admin-user-action-btn is-warning"
                                                                onClick={() => handleUserAction('revoke-seller', sellerReason)}
                                                                disabled={isApplyingUserAction || !selectedUser.sellerRegistration}
                                                            >
                                                                Revoke seller
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-user-action-btn is-neutral"
                                                                onClick={() => handleUserAction('unrevoke-seller', sellerReason)}
                                                                disabled={
                                                                    isApplyingUserAction
                                                                    || !selectedUser.sellerRegistration
                                                                    || selectedUser.sellerRegistration.status !== 'revoked'
                                                                }
                                                            >
                                                                Restore seller
                                                            </button>
                                                        </div>

                                                        <div className="admin-user-mfa-stepup">
                                                            <p className="admin-user-mfa-stepup-title">MFA step-up required for seller revocation</p>
                                                            <div className="admin-user-mfa-stepup-toggle-row">
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={() => setUseUserActionRecoveryCode((prev) => !prev)}
                                                                >
                                                                    {useUserActionRecoveryCode ? 'Use authenticator code' : 'Use recovery code'}
                                                                </button>
                                                            </div>
                                                            {!useUserActionRecoveryCode ? (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionMfaCode}
                                                                    onChange={(event) => setUserActionMfaCode(event.target.value)}
                                                                    placeholder="Enter 6-digit MFA code"
                                                                    inputMode="numeric"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionRecoveryCode}
                                                                    onChange={(event) => setUserActionRecoveryCode(event.target.value)}
                                                                    placeholder="Enter MFA recovery code"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        </section>
                                    )}

                                    {userReviewTab === 'advanced' && (
                                        <section className="admin-user-review-panel admin-user-review-panel-advanced" role="tabpanel">
                                            <article className="admin-user-profile-card admin-user-advanced-intro-card">
                                                <div className="admin-user-advanced-intro-copy">
                                                    <p className="admin-user-danger-eyebrow">Advanced controls</p>
                                                    <h4>Restricted account operations</h4>
                                                    <p>
                                                        Use this area only when standard moderation actions are no longer appropriate and a permanent intervention is required.
                                                    </p>
                                                </div>
                                                <div className="admin-user-advanced-intro-badge">Permanent actions</div>
                                            </article>

                                            <article className="admin-user-danger-shell">
                                                <header className="admin-user-danger-header">
                                                    <div className="admin-user-danger-title-group">
                                                        <p className="admin-user-danger-eyebrow">Restricted operations</p>
                                                        <h4 className="admin-user-danger-title">
                                                            <span className="admin-user-danger-icon" aria-hidden="true">⚠</span>
                                                            Danger Zone
                                                        </h4>
                                                        <p className="admin-user-danger-subtitle">
                                                            Permanent account removal should only be used for compromised, duplicate, or policy-violating accounts.
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="admin-user-danger-toggle"
                                                        onClick={() => setShowDangerActions((prev) => !prev)}
                                                    >
                                                        {showDangerActions ? 'Hide Destructive Actions' : 'Show Destructive Actions'}
                                                    </button>
                                                </header>

                                                {showDangerActions && (
                                                    <div className="admin-user-danger-content">
                                                        <div className="admin-user-danger-note">
                                                            <strong>Permanent deletion is final.</strong>
                                                            <span>This removes the account record and ends active access immediately.</span>
                                                        </div>

                                                        <label className="admin-user-reason-label" htmlFor="admin-delete-reason">Deletion reason</label>
                                                        <textarea
                                                            id="admin-delete-reason"
                                                            className="admin-user-reason-input"
                                                            value={deleteReason}
                                                            onChange={(event) => setDeleteReason(event.target.value)}
                                                            rows={3}
                                                            placeholder="Enter a clear and irreversible deletion reason"
                                                        />

                                                        <label className="admin-user-danger-ack">
                                                            <input
                                                                type="checkbox"
                                                                checked={dangerAcknowledge}
                                                                onChange={(event) => setDangerAcknowledge(event.target.checked)}
                                                            />
                                                            <span>I understand that this action is irreversible and cannot be undone.</span>
                                                        </label>

                                                        <div className="admin-user-action-row">
                                                            <button
                                                                type="button"
                                                                className="admin-user-action-btn is-danger"
                                                                onClick={() => setConfirmDangerActionOpen(true)}
                                                                disabled={
                                                                    isApplyingUserAction
                                                                    || selectedUser.isAdmin
                                                                    || !dangerAcknowledge
                                                                    || deleteReason.trim().length < 5
                                                                }
                                                            >
                                                                Permanently delete account
                                                            </button>
                                                        </div>

                                                        <div className="admin-user-mfa-stepup">
                                                            <p className="admin-user-mfa-stepup-title">MFA step-up required for permanent deletion</p>
                                                            <div className="admin-user-mfa-stepup-toggle-row">
                                                                <button
                                                                    type="button"
                                                                    className="admin-neo-ghost-btn"
                                                                    onClick={() => setUseUserActionRecoveryCode((prev) => !prev)}
                                                                >
                                                                    {useUserActionRecoveryCode ? 'Use authenticator code' : 'Use recovery code'}
                                                                </button>
                                                            </div>
                                                            {!useUserActionRecoveryCode ? (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionMfaCode}
                                                                    onChange={(event) => setUserActionMfaCode(event.target.value)}
                                                                    placeholder="Enter 6-digit MFA code"
                                                                    inputMode="numeric"
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    className="admin-user-reason-input"
                                                                    value={userActionRecoveryCode}
                                                                    onChange={(event) => setUserActionRecoveryCode(event.target.value)}
                                                                    placeholder="Enter MFA recovery code"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </article>
                                        </section>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {confirmDangerActionOpen && selectedUser && (
                        <div
                            className="delete-modal-overlay admin-danger-confirm-overlay"
                            onClick={(event) => {
                                event.stopPropagation();
                                setConfirmDangerActionOpen(false);
                            }}
                        >
                            <div className="delete-modal admin-danger-confirm-modal" onClick={(event) => event.stopPropagation()}>
                                <div className="delete-modal-header">
                                    <h2 className="delete-modal-title">Confirm Permanent Deletion</h2>
                                </div>
                                <div className="delete-modal-body">
                                    <p className="admin-user-danger-confirm-kicker">Final confirmation required</p>
                                    <p className="delete-modal-text">
                                        Type <strong>{dangerConfirmationHint}</strong> to confirm deleting this account.
                                    </p>
                                    <input
                                        type="text"
                                        className="admin-user-reason-input"
                                        value={confirmDangerInput}
                                        onChange={(event) => setConfirmDangerInput(event.target.value)}
                                        placeholder={`Type ${dangerConfirmationHint}`}
                                    />
                                    <p className="admin-user-danger-confirm-helper">
                                        The confirmation must exactly match the user ID or the full account name.
                                    </p>

                                    <div className="admin-user-action-row">
                                        <button
                                            type="button"
                                            className="admin-user-action-btn is-neutral"
                                            onClick={() => setConfirmDangerActionOpen(false)}
                                            disabled={isApplyingUserAction}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-user-action-btn is-danger"
                                            onClick={async () => {
                                                await handleUserAction('delete', deleteReason);
                                                setConfirmDangerActionOpen(false);
                                                setConfirmDangerInput('');
                                            }}
                                            disabled={!isDangerConfirmationValid || isApplyingUserAction || selectedUser.isAdmin}
                                        >
                                            Confirm delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {lightboxUrl && (
                <div
                    className="admin-lightbox-overlay"
                    role="dialog"
                    aria-label="Document preview"
                    aria-modal="true"
                    onClick={() => setLightboxUrl(null)}
                >
                    <div className="admin-lightbox-frame" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="admin-lightbox-close"
                            onClick={() => setLightboxUrl(null)}
                            aria-label="Close preview"
                        >×</button>
                        <img src={lightboxUrl} alt="Document preview" className="admin-lightbox-img" />
                    </div>
                </div>
            )}
        </main>
    );
};





