const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const baseUrl = envBaseUrl ? envBaseUrl.replace(/\/$/, '') : '';

type AccountStatusEventDetail = {
    status: 'suspended' | 'deleted' | 'seller-revoked' | 'session-ended';
    message: string;
    reason?: string | null;
    target?: 'account' | 'contact';
};

function dispatchAccountStatus(detail: AccountStatusEventDetail) {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('auctify-account-status', { detail }));
}

async function request<T>(path: string, options: RequestInit) {
    const token = localStorage.getItem('auth_token');

    let response: Response;

    try {
        response = await fetch(`${baseUrl}${path}`, {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
            ...options,
        });
    } catch {
        const message = 'Unable to connect to the server. Please refresh and try again.';
        throw {
            message,
            response: {
                data: { message },
            },
        };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data?.message || `Request failed with status ${response.status}.`;

        if (response.status === 403) {
            if (data?.account_status === 'suspended') {
                dispatchAccountStatus({
                    status: 'suspended',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                    target: data?.status_target === 'contact' ? 'contact' : 'account',
                });
            }

            if (data?.account_status === 'deleted') {
                dispatchAccountStatus({
                    status: 'deleted',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                    target: data?.status_target === 'contact' ? 'contact' : 'account',
                });
            }

            if (data?.account_status === 'seller_revoked') {
                dispatchAccountStatus({
                    status: 'seller-revoked',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                });
            }
        }

        if (response.status === 401 && token) {
            dispatchAccountStatus({
                status: 'session-ended',
                message: 'Your session is no longer valid. Please sign in again.',
            });
        }

        throw {
            message,
            response: { data: { ...data, message } },
        };
    }

    return data as T;
}

export async function apiGet<T>(path: string) {
    return request<T>(path, {
        method: 'GET',
    });
}

export async function apiPost<T>(path: string, body: unknown) {
    return request<T>(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function apiPatch<T>(path: string, body: unknown) {
    return request<T>(path, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export async function apiPut<T>(path: string, body: unknown) {
    return request<T>(path, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export async function apiDelete<T>(path: string) {
    return request<T>(path, {
        method: 'DELETE',
    });
}

export async function apiPostForm<T>(path: string, formData: FormData) {
    const token = localStorage.getItem('auth_token');

    let response: Response;

    try {
        response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });
    } catch {
        const message = 'Unable to connect to the server. Please refresh and try again.';
        throw {
            message,
            response: {
                data: { message },
            },
        };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message = data?.message || `Request failed with status ${response.status}.`;

        if (response.status === 403) {
            if (data?.account_status === 'suspended') {
                dispatchAccountStatus({
                    status: 'suspended',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                });
            }

            if (data?.account_status === 'deleted') {
                dispatchAccountStatus({
                    status: 'deleted',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                });
            }

            if (data?.account_status === 'seller_revoked') {
                dispatchAccountStatus({
                    status: 'seller-revoked',
                    message,
                    reason: typeof data?.reason === 'string' ? data.reason : null,
                });
            }
        }

        if (response.status === 401 && token) {
            dispatchAccountStatus({
                status: 'session-ended',
                message: 'Your session is no longer valid. Please sign in again.',
            });
        }

        throw {
            message,
            response: { data: { ...data, message } },
        };
    }

    return data as T;
}
