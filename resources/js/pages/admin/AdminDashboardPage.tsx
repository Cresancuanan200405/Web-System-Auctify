import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getAdminAuthToken, logoutAdmin } from '../../lib/adminAuth';
import {
    getDefaultHomePageConfig,
    normalizeHomePageConfig,
    type HomePageConfig,
    type HomeCarouselSlide,
    type HomePromoCircle,
    type HomeVideoAd,
} from '../../lib/homePageConfig';
import { adminApi, type AdminUserDetails, type AdminUserListItem } from '../../services/adminApi';

interface AdminDashboardPageProps {
    onLogout: () => void;
}

type AdminSection = 'overview' | 'homepage' | 'users';
type SuspensionUnit = 'minutes' | 'hours' | 'days';
type QueueFilter = 'all' | 'high' | 'medium' | 'low' | 'missing-phone' | 'dormant' | 'seller-pending-kyc';
type UserReviewTab = 'overview' | 'seller' | 'documents' | 'actions' | 'advanced';
type UserActionPanel = 'suspension' | 'seller';

const makeId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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
    const [activeSection, setActiveSection] = useState<AdminSection>('overview');
    const [config, setConfig] = useState<HomePageConfig>(getDefaultHomePageConfig());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [rawUsers, setRawUsers] = useState<AdminUserListItem[]>([]);
    const [search, setSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<AdminUserDetails | null>(null);
    const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');
    const [sellerReason, setSellerReason] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [isApplyingUserAction, setIsApplyingUserAction] = useState(false);
    const [suspensionUnit, setSuspensionUnit] = useState<SuspensionUnit>('days');
    const [suspensionValue, setSuspensionValue] = useState('1');
    const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
    const [userReviewTab, setUserReviewTab] = useState<UserReviewTab>('overview');
    const [openActionPanel, setOpenActionPanel] = useState<UserActionPanel>('suspension');
    const [showDangerActions, setShowDangerActions] = useState(false);
    const [dangerAcknowledge, setDangerAcknowledge] = useState(false);
    const [confirmDangerActionOpen, setConfirmDangerActionOpen] = useState(false);
    const [confirmDangerInput, setConfirmDangerInput] = useState('');

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

    const loadUsers = async (token: string) => {
        const usersResponse = await adminApi.getUsers(token);
        setRawUsers(usersResponse.users || []);
    };

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
                const [configResponse] = await Promise.all([
                    adminApi.getAdminHomepageConfig(token),
                ]);

                if (!isActive) {
                    return;
                }

                setConfig(normalizeHomePageConfig(configResponse.config));
                await loadUsers(token);
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

    const featuredSellers = useMemo(() => {
        return [...rawUsers]
            .filter((user) => user.isSeller)
            .sort((a, b) => (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0))
            .slice(0, 4);
    }, [rawUsers]);

    const leaderboard = useMemo(() => {
        return [...rawUsers]
            .sort((a, b) => {
                const scoreA = (a.isVerified ? 40 : 10) + (a.isSeller ? 30 : 5) + (a.isSuspended ? 0 : 20);
                const scoreB = (b.isVerified ? 40 : 10) + (b.isSeller ? 30 : 5) + (b.isSuspended ? 0 : 20);
                return scoreB - scoreA;
            })
            .slice(0, 3);
    }, [rawUsers]);

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

    const handleSaveChanges = async () => {
        const token = getAdminAuthToken();
        if (!token) {
            toast.error('Admin session expired. Please login again.');
            return;
        }

        setIsSaving(true);

        try {
            const response = await adminApi.updateAdminHomepageConfig(token, config);
            setConfig(normalizeHomePageConfig(response.config));
            toast.success('Homepage settings saved.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save homepage settings.';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUserAction = async (action: 'suspend' | 'unsuspend' | 'delete' | 'revoke-seller' | 'unrevoke-seller', reasonInput: string) => {
        if (!selectedUser) {
            return;
        }

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

            await loadUsers(token);

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
        setConfig({
            ...config,
            circles: [
                ...config.circles,
                { id: makeId('circle'), label: 'NEW CIRCLE', discount: 'Up to 10% Off', tone: 'black' },
            ],
        });
        toast.success('Circle added to homepage controls.');
    };

    const removeCircle = (id: string) => {
        if (config.circles.length <= 1) {
            toast.info('At least one promo circle is required.');
            return;
        }

        setConfig({
            ...config,
            circles: config.circles.filter((circle) => circle.id !== id),
        });
    };

    const updateSlide = (id: string, next: Partial<HomeCarouselSlide>) => {
        setConfig({
            ...config,
            slides: config.slides.map((slide) => (slide.id === id ? { ...slide, ...next } : slide)),
        });
    };

    const addSlide = () => {
        setConfig({
            ...config,
            slides: [
                ...config.slides,
                {
                    id: makeId('slide'),
                    subtitle: 'NEW SALE',
                    title: 'Title Here',
                    price: 'Up to 20% Off',
                    brands: ['Brand A', 'Brand B'],
                    disclaimer: 'New campaign disclaimer.',
                    image: '/carousel/1.jpg',
                },
            ],
        });
        toast.success('Carousel item added.');
    };

    const removeSlide = (id: string) => {
        if (config.slides.length <= 1) {
            toast.info('At least one carousel slide is required.');
            return;
        }

        setConfig({
            ...config,
            slides: config.slides.filter((slide) => slide.id !== id),
        });
    };

    const updateVideo = (id: string, next: Partial<HomeVideoAd>) => {
        setConfig({
            ...config,
            videoAds: config.videoAds.map((video) => (video.id === id ? { ...video, ...next } : video)),
        });
    };

    const addVideo = () => {
        setConfig({
            ...config,
            videoAds: [
                ...config.videoAds,
                {
                    id: makeId('video'),
                    title: 'NEW VIDEO AD',
                    subtitle: '1920 x 600 recommended',
                    image: '',
                },
            ],
        });
        toast.success('Video ad block added.');
    };

    const removeVideo = (id: string) => {
        if (config.videoAds.length <= 1) {
            toast.info('At least one video ad block is required.');
            return;
        }

        setConfig({
            ...config,
            videoAds: config.videoAds.filter((video) => video.id !== id),
        });
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
                </div>
                <div className="admin-neo-menu-group">
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveSection('overview')}
                    >
                        <span className="admin-neo-menu-icon admin-neo-menu-icon-brand" aria-hidden="true"><DashboardIcon /></span>
                        <span>Dashboard</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'homepage' ? 'active' : ''}`}
                        onClick={() => setActiveSection('homepage')}
                    >
                        <span className="admin-neo-menu-icon admin-neo-menu-icon-brand" aria-hidden="true"><HomepageIcon /></span>
                        <span>Homepage</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-neo-menu-btn ${activeSection === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveSection('users')}
                    >
                        <span className="admin-neo-menu-icon admin-neo-menu-icon-brand" aria-hidden="true"><UsersIcon /></span>
                        <span>User Monitor</span>
                    </button>
                </div>

                <div className="admin-neo-sidebar-bottom">
                    <button type="button" className="admin-neo-menu-btn" onClick={() => window.open('/', '_blank', 'noopener,noreferrer')}>
                        <span className="admin-neo-menu-icon admin-neo-menu-icon-brand" aria-hidden="true"><ExternalLinkIcon /></span>
                        <span>Open Home</span>
                    </button>
                    <button type="button" className="admin-neo-menu-btn admin-neo-menu-btn-danger" onClick={handleLogout}>
                        <span className="admin-neo-menu-icon admin-neo-menu-icon-brand" aria-hidden="true"><LogoutIcon /></span>
                        <span>Log out</span>
                    </button>
                </div>
            </aside>

            <section className="admin-neo-main">
                <header className="admin-neo-topbar">
                    <label className="admin-neo-search" htmlFor="admin-global-search">
                        <span aria-hidden="true"><SearchIcon /></span>
                        <input
                            id="admin-global-search"
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search users, id, email"
                        />
                    </label>

                    <div className="admin-neo-topbar-right">
                        <div className="admin-neo-tool-group" aria-label="Admin quick tools">
                            <button type="button" className="admin-neo-tool-btn" aria-label="Settings"><SettingsIcon /></button>
                            <button type="button" className="admin-neo-tool-btn" aria-label="Notifications"><BellIcon /></button>
                        </div>
                        {activeSection === 'homepage' && (
                            <button type="button" className="admin-neo-primary-btn" onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save changes'}
                            </button>
                        )}
                    </div>
                </header>

                <div className="admin-neo-layout-grid">
                    <section className="admin-neo-main-column">
                        {activeSection === 'overview' && (
                            <>
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
                                            {userGrowth7d.series.map((point) => {
                                                const height = userGrowth7d.peak > 0 ? Math.max(14, Math.round((point.count / userGrowth7d.peak) * 100)) : 14;
                                                return (
                                                    <div key={point.label} className="admin-neo-trend-bar-wrap">
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
                                                <p><span className="dot verified" />Verified: {userBreakdown.verified} ({userBreakdown.verifiedPct}%)</p>
                                                <p><span className="dot seller" />Sellers: {userBreakdown.sellers} ({userBreakdown.sellersPct}%)</p>
                                                <p><span className="dot suspended" />Suspended: {userBreakdown.suspended} ({userBreakdown.suspendedPct}%)</p>
                                                <p><span className="dot pending" />Unverified: {userBreakdown.unverified}</p>
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
                            </>
                        )}

                        {activeSection === 'homepage' && (
                            <section className="admin-dashboard-content admin-home-control-grid" aria-label="Homepage controls">
                    <article className="admin-panel-card">
                        <div className="admin-panel-title-row">
                            <h2>Promo Circles</h2>
                            <button type="button" onClick={addCircle}>Add Circle</button>
                        </div>
                        <p className="admin-panel-subtitle">Add, remove, and edit top circular tags (Flash Sale, Rolex Omega, etc.).</p>
                        <div className="admin-form-list">
                            {config.circles.map((circle) => (
                                <div key={circle.id} className="admin-form-item">
                                    <input
                                        type="text"
                                        value={circle.label}
                                        onChange={(event) => updateCircle(circle.id, { label: event.target.value })}
                                        placeholder="Circle label"
                                    />
                                    <input
                                        type="text"
                                        value={circle.discount}
                                        onChange={(event) => updateCircle(circle.id, { discount: event.target.value })}
                                        placeholder="Discount text"
                                    />
                                    <select
                                        value={circle.tone}
                                        onChange={(event) => updateCircle(circle.id, { tone: event.target.value === 'yellow' ? 'yellow' : 'black' })}
                                    >
                                        <option value="black">Black</option>
                                        <option value="yellow">Yellow</option>
                                    </select>
                                    <button type="button" className="admin-danger-btn" onClick={() => removeCircle(circle.id)}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="admin-panel-card">
                        <div className="admin-panel-title-row">
                            <h2>Carousel Slides</h2>
                            <button type="button" onClick={addSlide}>Add Slide</button>
                        </div>
                        <p className="admin-panel-subtitle">Change hero text, price callout, brand tags, and image URL.</p>
                        <div className="admin-form-list">
                            {config.slides.map((slide) => (
                                <div key={slide.id} className="admin-form-item admin-form-item-stack">
                                    <input
                                        type="text"
                                        value={slide.subtitle}
                                        onChange={(event) => updateSlide(slide.id, { subtitle: event.target.value })}
                                        placeholder="Subtitle"
                                    />
                                    <input
                                        type="text"
                                        value={slide.title}
                                        onChange={(event) => updateSlide(slide.id, { title: event.target.value })}
                                        placeholder="Title"
                                    />
                                    <input
                                        type="text"
                                        value={slide.price}
                                        onChange={(event) => updateSlide(slide.id, { price: event.target.value })}
                                        placeholder="Price text"
                                    />
                                    <input
                                        type="text"
                                        value={slide.image}
                                        onChange={(event) => updateSlide(slide.id, { image: event.target.value })}
                                        placeholder="Image URL or /carousel/file.jpg"
                                    />
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
                                        placeholder="Brands (comma separated)"
                                    />
                                    <textarea
                                        value={slide.disclaimer}
                                        onChange={(event) => updateSlide(slide.id, { disclaimer: event.target.value })}
                                        placeholder="Disclaimer"
                                        rows={2}
                                    />
                                    <button type="button" className="admin-danger-btn" onClick={() => removeSlide(slide.id)}>Delete Slide</button>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="admin-panel-card admin-panel-card-full">
                        <div className="admin-panel-title-row">
                            <h2>Video Ads</h2>
                            <div className="admin-dashboard-head-actions">
                                <button type="button" onClick={addVideo}>Add Video Ad</button>
                                <button type="button" onClick={handleSaveChanges} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                        <p className="admin-panel-subtitle">Add, edit, and remove video ad placeholders or image-backed ad tiles.</p>
                        <div className="admin-form-list">
                            {config.videoAds.map((video) => (
                                <div key={video.id} className="admin-form-item">
                                    <input
                                        type="text"
                                        value={video.title}
                                        onChange={(event) => updateVideo(video.id, { title: event.target.value })}
                                        placeholder="Video ad title"
                                    />
                                    <input
                                        type="text"
                                        value={video.subtitle}
                                        onChange={(event) => updateVideo(video.id, { subtitle: event.target.value })}
                                        placeholder="Video ad subtitle"
                                    />
                                    <input
                                        type="text"
                                        value={video.image}
                                        onChange={(event) => updateVideo(video.id, { image: event.target.value })}
                                        placeholder="Image URL (optional)"
                                    />
                                    <button type="button" className="admin-danger-btn" onClick={() => removeVideo(video.id)}>Delete</button>
                                </div>
                            ))}
                        </div>
                    </article>
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

                    <aside className="admin-neo-right-column">
                        <article className="admin-panel-card admin-neo-surface admin-neo-profile-card">
                            <div className="admin-neo-profile-avatar">A</div>
                            <div>
                                <p className="admin-neo-profile-name">Admin Operator</p>
                                <p className="admin-neo-profile-sub">Auctify Control</p>
                            </div>
                        </article>

                        <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                            <div className="admin-panel-title-row">
                                <h2>Top products</h2>
                                <button type="button" onClick={() => setActiveSection('users')}>View all</button>
                            </div>
                            <div className="admin-neo-side-list">
                                {featuredSellers.length === 0 && <p className="admin-panel-subtitle">No seller data yet.</p>}
                                {featuredSellers.map((seller) => (
                                    <button
                                        key={seller.id}
                                        type="button"
                                        className="admin-neo-side-item"
                                        onClick={() => setSelectedUserId(seller.id)}
                                    >
                                        <span className="admin-neo-side-avatar">{seller.name.slice(0, 1).toUpperCase()}</span>
                                        <span className="admin-neo-side-copy">
                                            <strong>{seller.sellerStatus || seller.name}</strong>
                                            <small>{seller.email}</small>
                                        </span>
                                        <span className="admin-neo-side-price">${(seller.id * 7).toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </article>

                        <article className="admin-panel-card admin-neo-surface admin-neo-side-card">
                            <div className="admin-panel-title-row">
                                <h2>Leaderboard</h2>
                                <button type="button" onClick={() => setActiveSection('users')}>View all</button>
                            </div>
                            <div className="admin-neo-leaderboard">
                                {leaderboard.map((user, index) => (
                                    <button
                                        key={user.id}
                                        type="button"
                                        className="admin-neo-leader-row"
                                        onClick={() => setSelectedUserId(user.id)}
                                    >
                                        <span className="admin-neo-rank">#{index + 1}</span>
                                        <div className="admin-neo-leader-copy">
                                            <strong>{user.name}</strong>
                                            <small>{formatDisplayDate(user.lastSeenAt || user.createdAt)}</small>
                                        </div>
                                        <span className="admin-neo-leader-score">${((index + 3) * 5000).toLocaleString()}</span>
                                    </button>
                                ))}
                            </div>
                        </article>
                    </aside>
                </div>

                {isLoading && <p className="admin-panel-subtitle">Loading admin data...</p>}
            </section>

            {selectedUserId && (
                <div className="delete-modal-overlay" onClick={() => setSelectedUserId(null)}>
                    <div className="delete-modal admin-user-modal admin-user-modal-wide" onClick={(event) => event.stopPropagation()}>
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
                                                    {selectedUserMedia.map((media) => (
                                                        <figure key={media.key} className="admin-user-doc-card">
                                                            <div className="admin-user-doc-preview-wrap">
                                                                {media.previewUrl ? (
                                                                    <img src={media.previewUrl} alt={media.label} />
                                                                ) : (
                                                                    <img src="/icons/Auctify1.jpg" alt={media.label} />
                                                                )}
                                                            </div>
                                                            <figcaption>
                                                                <strong>{media.label}</strong>
                                                                <small>{media.fileName}</small>
                                                                <span className="admin-user-doc-status">{media.previewUrl ? 'Preview available' : 'Fallback preview'}</span>
                                                            </figcaption>
                                                        </figure>
                                                    ))}
                                                </div>
                                            </article>
                                        </section>
                                    )}

                                    {userReviewTab === 'actions' && (
                                        <section className="admin-user-action-panels" role="tabpanel">
                                            <div className="admin-user-action-primary">
                                                <article className="admin-user-action-panel">
                                                    <button
                                                        type="button"
                                                        className={`admin-user-action-head ${openActionPanel === 'suspension' ? 'active' : ''}`}
                                                        onClick={() => setOpenActionPanel('suspension')}
                                                    >
                                                        <strong>1. Account Suspension</strong>
                                                        <span>{openActionPanel === 'suspension' ? 'Hide' : 'Open'}</span>
                                                    </button>
                                                    <div className={`admin-user-action-body ${openActionPanel === 'suspension' ? 'open' : ''}`} aria-hidden={openActionPanel !== 'suspension'}>
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
                                                        </div>
                                                </article>

                                                <article className="admin-user-action-panel">
                                                    <button
                                                        type="button"
                                                        className={`admin-user-action-head ${openActionPanel === 'seller' ? 'active' : ''}`}
                                                        onClick={() => setOpenActionPanel('seller')}
                                                    >
                                                        <strong>2. Seller Access</strong>
                                                        <span>{openActionPanel === 'seller' ? 'Hide' : 'Open'}</span>
                                                    </button>
                                                    <div className={`admin-user-action-body ${openActionPanel === 'seller' ? 'open' : ''}`} aria-hidden={openActionPanel !== 'seller'}>
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
                                                        </div>
                                                </article>
                                            </div>
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
        </main>
    );
};





