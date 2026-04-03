import type { HomePageConfig } from '../lib/homePageConfig';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const ADMIN_SESSION_KEY = 'auctify_admin_session';

const isLoopbackHost = (host: string) =>
    host === 'localhost' || host === '127.0.0.1';

const resolveBaseUrl = () => {
    if (!envBaseUrl) {
        return '';
    }

    try {
        const url = new URL(envBaseUrl);

        if (typeof window !== 'undefined') {
            const browserHost = window.location.hostname;

            // Keep API port/scheme, but align loopback hostnames so cookies and XSRF token are readable.
            if (
                isLoopbackHost(url.hostname) &&
                isLoopbackHost(browserHost) &&
                browserHost !== url.hostname
            ) {
                url.hostname = browserHost;
            }
        }

        return url.toString().replace(/\/$/, '');
    } catch {
        return envBaseUrl.replace(/\/$/, '');
    }
};

const baseUrl = resolveBaseUrl();

const readCookie = (name: string) => {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(`${name}=`));

    return cookie ? cookie.slice(name.length + 1) : null;
};

const getXsrfToken = () => {
    const cookie = readCookie('XSRF-TOKEN');
    return cookie ? decodeURIComponent(cookie) : null;
};

const getAdminBearerToken = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(ADMIN_SESSION_KEY);

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as { token?: unknown };
        return typeof parsed?.token === 'string' && parsed.token.trim() !== ''
            ? parsed.token
            : null;
    } catch {
        return null;
    }
};

const consumeToken = (token?: string | null) => {
    void token;
};

let csrfCookiePromise: Promise<void> | null = null;

const ensureCsrfCookie = async () => {
    if (getXsrfToken()) {
        return;
    }

    if (!csrfCookiePromise) {
        csrfCookiePromise = fetch(`${baseUrl}/sanctum/csrf-cookie`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Unable to initialize secure admin session.',
                    );
                }
            })
            .finally(() => {
                csrfCookiePromise = null;
            });
    }

    await csrfCookiePromise;
};

const buildHeaders = async (
    method: string,
    headers?: HeadersInit,
    sendJson = true,
) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        await ensureCsrfCookie();
    }

    const xsrfToken = getXsrfToken();
    const adminBearerToken = getAdminBearerToken();

    return {
        Accept: 'application/json',
        ...(sendJson ? { 'Content-Type': 'application/json' } : {}),
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
        ...(adminBearerToken
            ? { Authorization: `Bearer ${adminBearerToken}` }
            : {}),
        ...headers,
    };
};

async function request<T>(path: string, options: RequestInit): Promise<T> {
    let response: Response;
    const method = options.method ?? 'GET';
    const headers = await buildHeaders(method, options.headers);

    try {
        response = await fetch(`${baseUrl}${path}`, {
            ...options,
            method,
            credentials: 'include',
            headers,
        });
    } catch {
        throw new Error('Unable to connect to server.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            (data as { message?: string })?.message || 'Request failed.';
        throw new Error(message);
    }

    return data as T;
}

export interface AdminLoginPayload {
    token?: string;
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
        is_admin: boolean;
    };
}

export interface AdminSellerDetails {
    id?: number;
    status?: string | null;
    shopName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    pickupAddressSummary?: string | null;
    submitBusinessMode?: string | null;
    generalLocation?: string | null;
    registeredAddress?: string | null;
    zipCode?: string | null;
    sellerType?: string | null;
    companyRegisteredName?: string | null;
    registeredLastName?: string | null;
    registeredFirstName?: string | null;
    registeredMiddleName?: string | null;
    registeredSuffix?: string | null;
    primaryDocumentType?: string | null;
    primaryDocumentName?: string | null;
    governmentIdType?: string | null;
    governmentIdFrontName?: string | null;
    businessEmail?: string | null;
    businessPhoneNumber?: string | null;
    taxTin?: string | null;
    vatStatus?: string | null;
    birCertificateName?: string | null;
    documentMedia?: AdminVerificationMedia[];
    submitSwornDeclaration?: string | null;
    agreeBusinessTerms?: boolean;
    submittedAt?: string | null;
    revokedAt?: string | null;
    revokedReason?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface AdminVerificationMedia {
    key: string;
    label: string;
    fileName?: string | null;
    uploaded?: boolean;
    mimeType?: string | null;
    previewUrl?: string | null;
}

export interface AdminVerificationDetails {
    status?: string | null;
    fullName?: string | null;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
    submittedAt?: string | null;
    reviewedAt?: string | null;
    media?: AdminVerificationMedia[];
}

export interface AdminUserListItem {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    isVerified: boolean;
    isAdmin: boolean;
    isSuspended: boolean;
    suspendedReason?: string | null;
    suspendedAt?: string | null;
    suspendedUntil?: string | null;
    isSeller: boolean;
    sellerStatus?: string | null;
    lastSeenAt?: string | null;
    createdAt?: string | null;
}

export interface AdminAccountIdentity {
    id: number;
    name: string;
    email: string;
    isCurrent: boolean;
    lastSeenAt?: string | null;
    createdAt?: string | null;
}

export interface AdminUserDetails extends AdminUserListItem {
    avatar?: string | null;
    birthday?: string | null;
    updatedAt?: string | null;
    sellerRegistration?: AdminSellerDetails | null;
    verification?: AdminVerificationDetails | null;
}

export interface AdminOrderShipmentEntry {
    id: number;
    order_number?: string | null;
    status: string;
    shipping_status: string;
    payment_status: string;
    total_amount: string;
    currency: string;
    placed_at?: string | null;
    completed_at?: string | null;
    auction?: {
        id: number;
        title: string;
    } | null;
    buyer?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    seller?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    shipments?: Array<{
        id: number;
        status: string;
        shipping_method?: string | null;
        carrier?: string | null;
        tracking_number?: string | null;
        estimated_delivery_at?: string | null;
        delivered_at?: string | null;
        updated_at?: string | null;
    }>;
}

export interface AdminOrderPaymentEntry {
    id: number;
    order_id: number;
    method: string;
    provider?: string | null;
    provider_reference?: string | null;
    status: string;
    amount: string;
    currency: string;
    paid_at?: string | null;
    created_at?: string | null;
    payer?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    payee?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    order?: {
        id: number;
        order_number?: string | null;
        auction?: {
            id: number;
            title: string;
        } | null;
        buyer?: {
            id: number;
            name: string;
            email?: string | null;
        } | null;
        seller?: {
            id: number;
            name: string;
            email?: string | null;
        } | null;
    } | null;
}

export interface HomepageMediaUploadResponse {
    message: string;
    type: 'video' | 'image';
    path: string;
    url: string;
}

export const adminApi = {
    login: (email: string, password: string) => {
        return request<AdminLoginPayload>('/api/admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    getSession: () => {
        return request<AdminLoginPayload>('/api/admin/session', {
            method: 'GET',
        });
    },

    logout: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ message: string }>('/api/admin/logout', {
            method: 'POST',
        });
    },

    getPublicHomepageConfig: () => {
        return request<{ config: HomePageConfig }>('/api/homepage-config', {
            method: 'GET',
        });
    },

    getAdminHomepageConfig: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ config: HomePageConfig }>(
            '/api/admin/homepage-config',
            {
                method: 'GET',
            },
        );
    },

    updateAdminHomepageConfig: (
        _token: string | null | undefined,
        config: HomePageConfig,
    ) => {
        consumeToken(_token);
        return request<{ message: string; config: HomePageConfig }>(
            '/api/admin/homepage-config',
            {
                method: 'PUT',
                body: JSON.stringify(config),
            },
        );
    },

    uploadHomepageMedia: async (
        _token: string | null | undefined,
        file: File,
        type: 'video' | 'image',
    ) => {
        consumeToken(_token);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        let response: Response;
        const headers = await buildHeaders('POST', undefined, false);

        try {
            response = await fetch(
                `${baseUrl}/api/admin/homepage-media/upload`,
                {
                    method: 'POST',
                    credentials: 'include',
                    headers,
                    body: formData,
                },
            );
        } catch {
            throw new Error('Unable to connect to server.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                (data as { message?: string })?.message || 'Upload failed.';
            throw new Error(message);
        }

        return data as HomepageMediaUploadResponse;
    },

    getUsers: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ users: AdminUserListItem[] }>('/api/admin/users', {
            method: 'GET',
        });
    },

    getAdminAccounts: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ accounts: AdminAccountIdentity[] }>(
            '/api/admin/accounts',
            {
                method: 'GET',
            },
        );
    },

    getUserDetails: (_token: string | null | undefined, userId: number) => {
        consumeToken(_token);
        return request<{ user: AdminUserDetails }>(
            `/api/admin/users/${userId}`,
            {
                method: 'GET',
            },
        );
    },

    suspendUser: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
        duration?: { unit: 'minutes' | 'hours' | 'days'; value: number } | null,
    ) => {
        consumeToken(_token);
        return request<{ message: string; suspended_until?: string | null }>(
            `/api/admin/users/${userId}/suspend`,
            {
                method: 'POST',
                body: JSON.stringify({
                    reason,
                    duration_unit: duration?.unit,
                    duration_value: duration?.value,
                }),
            },
        );
    },

    unsuspendUser: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/unsuspend`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    revokeSeller: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/revoke-seller`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    approveSeller: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/approve-seller`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    rejectSeller: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/reject-seller`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    unrevokeSeller: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/unrevoke-seller`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    deleteUser: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
    ) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/users/${userId}/delete`,
            {
                method: 'POST',
                body: JSON.stringify({ reason }),
            },
        );
    },

    getOrderShipments: (
        _token: string | null | undefined,
        params?: { status?: string; search?: string },
    ) => {
        consumeToken(_token);
        const query = new URLSearchParams();
        if (params?.status && params.status !== 'all') {
            query.set('status', params.status);
        }
        if (params?.search && params.search.trim().length > 0) {
            query.set('search', params.search.trim());
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';

        return request<{ orders: AdminOrderShipmentEntry[] }>(
            `/api/admin/orders/shipments${suffix}`,
            {
                method: 'GET',
            },
        );
    },

    getOrderPayments: (
        _token: string | null | undefined,
        params?: { status?: string; method?: string; search?: string },
    ) => {
        consumeToken(_token);
        const query = new URLSearchParams();
        if (params?.status && params.status !== 'all') {
            query.set('status', params.status);
        }
        if (params?.method && params.method !== 'all') {
            query.set('method', params.method);
        }
        if (params?.search && params.search.trim().length > 0) {
            query.set('search', params.search.trim());
        }

        const suffix = query.toString() ? `?${query.toString()}` : '';

        return request<{ payments: AdminOrderPaymentEntry[] }>(
            `/api/admin/orders/payments${suffix}`,
            {
                method: 'GET',
            },
        );
    },

    // ── Notifications ─────────────────────────────────────────────────────────

    getNotifications: (_token?: string | null) => {
        consumeToken(_token);
        return request<{
            notifications: AdminNotificationEntry[];
            unreadCount: number;
        }>('/api/admin/notifications', { method: 'GET' });
    },

    markNotificationRead: (_token: string | null | undefined, id: number) => {
        consumeToken(_token);
        return request<{ message: string }>(
            `/api/admin/notifications/${id}/read`,
            {
                method: 'POST',
            },
        );
    },

    getNotificationUnreadCount: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ unreadCount: number }>(
            '/api/admin/notifications/unread-count',
            {
                method: 'GET',
            },
        );
    },

    markAllNotificationsRead: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ message: string }>(
            '/api/admin/notifications/read-all',
            {
                method: 'POST',
            },
        );
    },

    deleteNotification: (_token: string | null | undefined, id: number) => {
        consumeToken(_token);
        return request<{ message: string }>(`/api/admin/notifications/${id}`, {
            method: 'DELETE',
        });
    },

    // ── Settings ──────────────────────────────────────────────────────────────

    getSettings: (_token?: string | null) => {
        consumeToken(_token);
        return request<{ settings: AdminSettingEntry[] }>(
            '/api/admin/settings',
            {
                method: 'GET',
            },
        );
    },

    updateSettings: (
        _token: string | null | undefined,
        settings: Record<string, string>,
    ) => {
        consumeToken(_token);
        return request<{ message: string; settings: AdminSettingEntry[] }>(
            '/api/admin/settings',
            {
                method: 'PUT',
                body: JSON.stringify({ settings }),
            },
        );
    },

    changePassword: (
        _token: string | null | undefined,
        currentPassword: string,
        newPassword: string,
        newPasswordConfirmation: string,
    ) => {
        consumeToken(_token);
        return request<AdminLoginPayload & { message: string }>(
            '/api/admin/change-password',
            {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                    new_password_confirmation: newPasswordConfirmation,
                }),
            },
        );
    },

};

export interface AdminNotificationEntry {
    id: number;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown> | null;
    readAt: string | null;
    createdAt: string;
}

export interface AdminSettingEntry {
    key: string;
    value: string;
    type: 'string' | 'boolean' | 'integer';
    label: string;
    description?: string | null;
    group?: string | null;
}
