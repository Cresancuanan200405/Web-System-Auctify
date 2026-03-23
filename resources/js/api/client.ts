const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

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

            // Keep API scheme/port, but align loopback hostnames so XSRF cookie is readable.
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
const REQUEST_TIMEOUT_MS = 20000;

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
                    throw new Error('Unable to initialize secure session.');
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

    const token = localStorage.getItem('auth_token');
    const xsrfToken = getXsrfToken();

    return {
        ...(sendJson ? { 'Content-Type': 'application/json' } : {}),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
        ...headers,
    };
};

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
    const method = options.method ?? 'GET';
    const headers = await buildHeaders(method, options.headers, true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );

    try {
        response = await fetch(`${baseUrl}${path}`, {
            ...options,
            method,
            credentials: 'include',
            headers,
            signal: controller.signal,
        });
    } catch {
        const message =
            'Unable to connect to the server. Please refresh and try again.';
        throw {
            message,
            response: {
                data: { message },
            },
        };
    } finally {
        window.clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            data?.message || `Request failed with status ${response.status}.`;

        if (response.status === 403) {
            if (data?.account_status === 'suspended') {
                dispatchAccountStatus({
                    status: 'suspended',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                    target:
                        data?.status_target === 'contact'
                            ? 'contact'
                            : 'account',
                });
            }

            if (data?.account_status === 'deleted') {
                dispatchAccountStatus({
                    status: 'deleted',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                    target:
                        data?.status_target === 'contact'
                            ? 'contact'
                            : 'account',
                });
            }

            if (data?.account_status === 'seller_revoked') {
                dispatchAccountStatus({
                    status: 'seller-revoked',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                });
            }
        }

        if (response.status === 401 && token) {
            dispatchAccountStatus({
                status: 'session-ended',
                message:
                    'Your session is no longer valid. Please sign in again.',
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
    const headers = await buildHeaders('POST', undefined, false);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
    );

    try {
        response = await fetch(`${baseUrl}${path}`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData,
            signal: controller.signal,
        });
    } catch {
        const message =
            'Unable to connect to the server. Please refresh and try again.';
        throw {
            message,
            response: {
                data: { message },
            },
        };
    } finally {
        window.clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            data?.message || `Request failed with status ${response.status}.`;

        if (response.status === 403) {
            if (data?.account_status === 'suspended') {
                dispatchAccountStatus({
                    status: 'suspended',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                });
            }

            if (data?.account_status === 'deleted') {
                dispatchAccountStatus({
                    status: 'deleted',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                });
            }

            if (data?.account_status === 'seller_revoked') {
                dispatchAccountStatus({
                    status: 'seller-revoked',
                    message,
                    reason:
                        typeof data?.reason === 'string' ? data.reason : null,
                });
            }
        }

        if (response.status === 401 && token) {
            dispatchAccountStatus({
                status: 'session-ended',
                message:
                    'Your session is no longer valid. Please sign in again.',
            });
        }

        throw {
            message,
            response: { data: { ...data, message } },
        };
    }

    return data as T;
}
