import type { HomePageConfig } from '../lib/homePageConfig';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const baseUrl = envBaseUrl ? envBaseUrl.replace(/\/$/, '') : '';

const buildHeaders = (token?: string) => {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

async function request<T>(path: string, options: RequestInit): Promise<T> {
    let response: Response;

    try {
        response = await fetch(`${baseUrl}${path}`, options);
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
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
        is_admin: boolean;
    };
}

export interface AdminSellerDetails {
    status?: string | null;
    shopName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    generalLocation?: string | null;
    registeredAddress?: string | null;
    sellerType?: string | null;
    vatStatus?: string | null;
    submittedAt?: string | null;
    revokedAt?: string | null;
    revokedReason?: string | null;
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
    birthday?: string | null;
    updatedAt?: string | null;
    sellerRegistration?: AdminSellerDetails | null;
}

export const adminApi = {
    login: (email: string, password: string) => {
        return request<AdminLoginPayload>('/api/admin/login', {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ email, password }),
        });
    },

    logout: (token: string) => {
        return request<{ message: string }>('/api/admin/logout', {
            method: 'POST',
            headers: buildHeaders(token),
        });
    },

    getPublicHomepageConfig: () => {
        return request<{ config: HomePageConfig }>('/api/homepage-config', {
            method: 'GET',
            headers: buildHeaders(),
        });
    },

    getAdminHomepageConfig: (token: string) => {
        return request<{ config: HomePageConfig }>('/api/admin/homepage-config', {
            method: 'GET',
            headers: buildHeaders(token),
        });
    },

    updateAdminHomepageConfig: (token: string, config: HomePageConfig) => {
        return request<{ message: string; config: HomePageConfig }>('/api/admin/homepage-config', {
            method: 'PUT',
            headers: buildHeaders(token),
            body: JSON.stringify(config),
        });
    },

    getUsers: (token: string) => {
        return request<{ users: AdminUserListItem[] }>('/api/admin/users', {
            method: 'GET',
            headers: buildHeaders(token),
        });
    },

    getUserDetails: (token: string, userId: number) => {
        return request<{ user: AdminUserDetails }>(`/api/admin/users/${userId}`, {
            method: 'GET',
            headers: buildHeaders(token),
        });
    },

    suspendUser: (
        token: string,
        userId: number,
        reason: string,
        duration?: { unit: 'minutes' | 'hours' | 'days'; value: number } | null,
    ) => {
        return request<{ message: string; suspended_until?: string | null }>(`/api/admin/users/${userId}/suspend`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({
                reason,
                duration_unit: duration?.unit,
                duration_value: duration?.value,
            }),
        });
    },

    unsuspendUser: (token: string, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/unsuspend`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ reason }),
        });
    },

    revokeSeller: (token: string, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/revoke-seller`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ reason }),
        });
    },

    unrevokeSeller: (token: string, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/unrevoke-seller`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ reason }),
        });
    },

    deleteUser: (token: string, userId: number, reason: string) => {
        return request<{ message: string }>(`/api/admin/users/${userId}/delete`, {
            method: 'POST',
            headers: buildHeaders(token),
            body: JSON.stringify({ reason }),
        });
    },
};
