const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const baseUrl = envBaseUrl ? envBaseUrl.replace(/\/$/, '') : '';

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
        throw {
            message,
            response: { data: { ...data, message } },
        };
    }

    return data as T;
}
