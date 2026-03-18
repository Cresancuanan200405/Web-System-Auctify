import type { HomePageConfig } from '../lib/homePageConfig';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const isLoopbackHost = (host: string) => host === 'localhost' || host === '127.0.0.1';

const resolveBaseUrl = () => {
    if (!envBaseUrl) {
        return '';
    }

    try {
        const url = new URL(envBaseUrl);

        if (typeof window !== 'undefined') {
            const browserHost = window.location.hostname;

            // Keep API port/scheme, but align loopback hostnames so cookies and XSRF token are readable.
            if (isLoopbackHost(url.hostname) && isLoopbackHost(browserHost) && browserHost !== url.hostname) {
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
                    throw new Error('Unable to initialize secure admin session.');
                }
            })
            .finally(() => {
                csrfCookiePromise = null;
            });
    }

    await csrfCookiePromise;
};

const buildHeaders = async (method: string, headers?: HeadersInit, sendJson = true) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
        await ensureCsrfCookie();
    }

    const xsrfToken = getXsrfToken();

    return {
        Accept: 'application/json',
        ...(sendJson ? { 'Content-Type': 'application/json' } : {}),
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
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
        const message = (data as { message?: string })?.message || 'Request failed.';
        throw new Error(message);
    }

    return data as T;
}

export interface AdminLoginPayload {
    mfa_required?: boolean;
    challenge_token?: string;
    message?: string;
    user?: {
        id: number;
        name: string;
        email: string;
        is_admin: boolean;
    };
}

export interface AdminMfaStatusPayload {
    enabled: boolean;
    recovery_codes_remaining: number;
}

export interface AdminMfaSetupPayload {
    secret: string;
    otpauth_uri: string;
}

export interface AdminMfaEnablePayload {
    message: string;
    recovery_codes: string[];
}

export interface AdminMfaStepUpPayload {
    message: string;
    verified_until_unix: number;
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
    submitSwornDeclaration?: string | null;
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

export interface AdminUserDetails extends AdminUserListItem {
    avatar?: string | null;
    birthday?: string | null;
    updatedAt?: string | null;
    sellerRegistration?: AdminSellerDetails | null;
    verification?: AdminVerificationDetails | null;
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

    verifyMfa: (challengeToken: string, code?: string, recoveryCode?: string) => {
        return request<AdminLoginPayload>('/api/admin/verify-mfa', {
            method: 'POST',
            body: JSON.stringify({
                challenge_token: challengeToken,
                ...(code ? { code } : {}),
                ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
            }),
        });
    },

    getSession: () => {
        return request<AdminLoginPayload>('/api/admin/session', {
            method: 'GET',
        });
    },

    logout: (_token?: string | null) => {
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
        return request<{ config: HomePageConfig }>('/api/admin/homepage-config', {
            method: 'GET',
        });
    },

    updateAdminHomepageConfig: (_token: string | null | undefined, config: HomePageConfig) => {
        return request<{ message: string; config: HomePageConfig }>('/api/admin/homepage-config', {
            method: 'PUT',
            body: JSON.stringify(config),
        });
    },

    uploadHomepageMedia: async (_token: string | null | undefined, file: File, type: 'video' | 'image') => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        let response: Response;
        const headers = await buildHeaders('POST', undefined, false);

        try {
            response = await fetch(`${baseUrl}/api/admin/homepage-media/upload`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: formData,
            });
        } catch {
            throw new Error('Unable to connect to server.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message = (data as { message?: string })?.message || 'Upload failed.';
            throw new Error(message);
        }

        return data as HomepageMediaUploadResponse;
    },

    getUsers: (_token?: string | null) => {
        return request<{ users: AdminUserListItem[] }>('/api/admin/users', {
            method: 'GET',
        });
    },

    getUserDetails: (_token: string | null | undefined, userId: number) => {
        return request<{ user: AdminUserDetails }>(`/api/admin/users/${userId}`, {
            method: 'GET',
        });
    },

    suspendUser: (
        _token: string | null | undefined,
        userId: number,
        reason: string,
        duration?: { unit: 'minutes' | 'hours' | 'days'; value: number } | null,
    ) => {
        return request<{ message: string; suspended_until?: string | null }>(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            body: JSON.stringify({
                reason,
                duration_unit: duration?.unit,
                duration_value: duration?.value,
            }),
        });
    },

    unsuspendUser: (_token: string | null | undefined, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/unsuspend`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    revokeSeller: (_token: string | null | undefined, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/revoke-seller`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    unrevokeSeller: (_token: string | null | undefined, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/unrevoke-seller`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    deleteUser: (_token: string | null | undefined, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/delete`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    },

    // ── Notifications ─────────────────────────────────────────────────────────

    getNotifications: (_token?: string | null) => {
        return request<{ notifications: AdminNotificationEntry[]; unreadCount: number }>(
            '/api/admin/notifications',
            { method: 'GET' },
        );
    },

    markNotificationRead: (_token: string | null | undefined, id: number) => {
        return request<{ message: string }>(`/api/admin/notifications/${id}/read`, {
            method: 'POST',
        });
    },

    getNotificationUnreadCount: (_token?: string | null) => {
        return request<{ unreadCount: number }>('/api/admin/notifications/unread-count', {
            method: 'GET',
        });
    },

    markAllNotificationsRead: (_token?: string | null) => {
        return request<{ message: string }>('/api/admin/notifications/read-all', {
            method: 'POST',
        });
    },

    deleteNotification: (_token: string | null | undefined, id: number) => {
        return request<{ message: string }>(`/api/admin/notifications/${id}`, {
            method: 'DELETE',
        });
    },

    // ── Settings ──────────────────────────────────────────────────────────────

    getSettings: (_token?: string | null) => {
        return request<{ settings: AdminSettingEntry[] }>('/api/admin/settings', {
            method: 'GET',
        });
    },

    updateSettings: (_token: string | null | undefined, settings: Record<string, string>) => {
        return request<{ message: string; settings: AdminSettingEntry[] }>('/api/admin/settings', {
            method: 'PUT',
            body: JSON.stringify({ settings }),
        });
    },

    changePassword: (_token: string | null | undefined, currentPassword: string, newPassword: string, newPasswordConfirmation: string) => {
        return request<AdminLoginPayload & { message: string }>('/api/admin/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: newPasswordConfirmation,
            }),
        });
    },

    getMfaStatus: (_token?: string | null) => {
        return request<AdminMfaStatusPayload>('/api/admin/mfa/status', {
            method: 'GET',
        });
    },

    setupMfa: (_token?: string | null) => {
        return request<AdminMfaSetupPayload>('/api/admin/mfa/setup', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    },

    enableMfa: (_token: string | null | undefined, secret: string, code: string) => {
        return request<AdminMfaEnablePayload>('/api/admin/mfa/enable', {
            method: 'POST',
            body: JSON.stringify({ secret, code }),
        });
    },

    disableMfa: (_token: string | null | undefined, code: string) => {
        return request<{ message: string }>('/api/admin/mfa/disable', {
            method: 'POST',
            body: JSON.stringify({ code }),
        });
    },

    stepUpMfa: (_token: string | null | undefined, code?: string, recoveryCode?: string) => {
        return request<AdminMfaStepUpPayload>('/api/admin/mfa/step-up', {
            method: 'POST',
            body: JSON.stringify({
                ...(code ? { code } : {}),
                ...(recoveryCode ? { recovery_code: recoveryCode } : {}),
            }),
        });
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
