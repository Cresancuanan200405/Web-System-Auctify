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
    const [actionReason, setActionReason] = useState('');
    const [isApplyingUserAction, setIsApplyingUserAction] = useState(false);
    const [suspensionUnit, setSuspensionUnit] = useState<SuspensionUnit>('days');
    const [suspensionValue, setSuspensionValue] = useState('1');

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

    const handleUserAction = async (action: 'suspend' | 'unsuspend' | 'delete' | 'revoke-seller' | 'unrevoke-seller') => {
        if (!selectedUser) {
            return;
        }

        const reason = actionReason.trim();
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

            setActionReason('');
            toast.success('Action applied successfully.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to apply action.';
            toast.error(message);
        } finally {
            setIsApplyingUserAction(false);
        }
    };

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
                                <div className="admin-neo-stat-grid">
                                    <article className="admin-neo-stat-card revenue">
                                        <p>Today Revenue</p>
                                        <strong>${overviewStats.estimatedRevenue.toLocaleString()}</strong>
                                        <span>+10%</span>
                                    </article>
                                    <article className="admin-neo-stat-card visitors">
                                        <p>Today Visitors</p>
                                        <strong>{overviewStats.activeUsers.toLocaleString()}</strong>
                                        <span>+10%</span>
                                    </article>
                                    <article className="admin-neo-stat-card sold">
                                        <p>Product Sold</p>
                                        <strong>{overviewStats.sellerUsers.toLocaleString()}</strong>
                                        <span>-10%</span>
                                    </article>
                                </div>

                                <article className="admin-panel-card admin-neo-surface">
                                    <div className="admin-panel-title-row">
                                        <h2>Recent Order</h2>
                                        <button type="button" onClick={() => setActiveSection('users')}>View all</button>
                                    </div>
                                    <div className="admin-users-table-wrap">
                                        <table className="admin-users-table admin-neo-table">
                                            <thead>
                                                <tr>
                                                    <th>Photo</th>
                                                    <th>Product Name</th>
                                                    <th>Price</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentUsers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="admin-users-empty">No recent users available.</td>
                                                    </tr>
                                                )}
                                                {recentUsers.map((user) => (
                                                    <tr key={user.id} className="admin-users-row-clickable" onClick={() => setSelectedUserId(user.id)}>
                                                        <td>
                                                            <span className="admin-neo-avatar-dot">{user.name.slice(0, 1).toUpperCase()}</span>
                                                        </td>
                                                        <td>{user.sellerStatus || user.name}</td>
                                                        <td>${(user.id * 13).toLocaleString()}</td>
                                                        <td>
                                                            <span className={`admin-user-chip ${user.isSuspended ? 'pending' : 'verified'}`}>
                                                                {user.isSuspended ? 'Pending' : 'Delivered'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </article>

                                <div className="admin-neo-bottom-grid">
                                    <article className="admin-panel-card admin-neo-surface">
                                        <h2>Earning revenues</h2>
                                        <div className="admin-neo-chart">
                                            <span style={{ height: '54%' }} />
                                            <span style={{ height: '62%' }} />
                                            <span style={{ height: '46%' }} />
                                            <span style={{ height: '68%' }} />
                                            <span style={{ height: '58%' }} />
                                            <span style={{ height: '73%' }} />
                                            <span style={{ height: '49%' }} />
                                        </div>
                                    </article>

                                    <article className="admin-panel-card admin-neo-surface admin-neo-illustration">
                                        <h2>Track your profit</h2>
                                        <p>Manage homepage campaigns and moderation actions from one command center.</p>
                                        <div className="admin-neo-orbital" aria-hidden="true">
                                            <span className="orb o1" />
                                            <span className="orb o2" />
                                            <span className="orb o3" />
                                        </div>
                                        <div className="admin-neo-bottom-actions">
                                            <button type="button" className="admin-neo-primary-btn" onClick={() => setActiveSection('homepage')}>Edit homepage</button>
                                            <button type="button" className="admin-neo-ghost-btn" onClick={() => setActiveSection('users')}>Review users</button>
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
                    <div className="delete-modal admin-user-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">User Management</h2>
                        </div>
                        <div className="delete-modal-body">
                            {isLoadingUserDetails && <p className="delete-modal-text">Loading user details...</p>}
                            {!isLoadingUserDetails && selectedUser && (
                                <>
                                    <div className="admin-user-detail-grid">
                                        <p><strong>Name:</strong> {selectedUser.name}</p>
                                        <p><strong>Email:</strong> {selectedUser.email}</p>
                                        <p><strong>Phone:</strong> {selectedUser.phone || 'N/A'}</p>
                                        <p><strong>Birthday:</strong> {selectedUser.birthday || 'N/A'}</p>
                                        <p><strong>Status:</strong> {selectedUser.isSuspended ? 'Suspended' : 'Active'}</p>
                                        <p><strong>Seller:</strong> {selectedUser.sellerRegistration ? 'Yes' : 'No'}</p>
                                        <p><strong>Seller Status:</strong> {selectedUser.sellerRegistration?.status || 'N/A'}</p>
                                        <p><strong>Shop Name:</strong> {selectedUser.sellerRegistration?.shopName || 'N/A'}</p>
                                        <p><strong>Seller Contact:</strong> {selectedUser.sellerRegistration?.contactEmail || 'N/A'}</p>
                                        <p><strong>Location:</strong> {selectedUser.sellerRegistration?.generalLocation || 'N/A'}</p>
                                    </div>

                                    <label className="admin-user-reason-label" htmlFor="admin-action-reason">Reason for admin action</label>
                                    <textarea
                                        id="admin-action-reason"
                                        className="admin-user-reason-input"
                                        value={actionReason}
                                        onChange={(event) => setActionReason(event.target.value)}
                                        rows={3}
                                        placeholder="Type reason for suspension, deletion, or seller revocation"
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
                                            className="admin-danger-btn"
                                            onClick={() => handleUserAction('suspend')}
                                            disabled={isApplyingUserAction || selectedUser.isSuspended || selectedUser.isAdmin}
                                        >
                                            Suspend Account
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-danger-btn"
                                            onClick={() => handleUserAction('unsuspend')}
                                            disabled={isApplyingUserAction || !selectedUser.isSuspended || selectedUser.isAdmin}
                                        >
                                            Unsuspend Account
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-danger-btn"
                                            onClick={() => handleUserAction('delete')}
                                            disabled={isApplyingUserAction || selectedUser.isAdmin}
                                        >
                                            Delete Account
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-danger-btn"
                                            onClick={() => handleUserAction('revoke-seller')}
                                            disabled={isApplyingUserAction || !selectedUser.sellerRegistration}
                                        >
                                            Revoke as Seller
                                        </button>
                                        <button
                                            type="button"
                                            className="admin-danger-btn"
                                            onClick={() => handleUserAction('unrevoke-seller')}
                                            disabled={
                                                isApplyingUserAction
                                                || !selectedUser.sellerRegistration
                                                || selectedUser.sellerRegistration.status !== 'revoked'
                                            }
                                        >
                                            Unrevoke Seller
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};





