import { adminApi } from '../services/adminApi';

export const ADMIN_SESSION_KEY = 'auctify_admin_session';

export interface AdminSession {
    token: string;
    userId: number;
    email: string;
    name: string;
    loggedInAt: string;
}

export interface MonitoredUser {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    isVerified: boolean;
    isAdmin?: boolean;
    isSeller?: boolean;
    sellerStatus?: string | null;
    isSuspended?: boolean;
    suspendedReason?: string | null;
    suspendedAt?: string | null;
    lastSeenAt: string;
    createdAt?: string | null;
}

const DEFAULT_ADMIN_EMAIL = 'admin@auctify.com';
const DEFAULT_ADMIN_PASSWORD = 'AuctifyAdmin123!';

const readJson = <T>(key: string): T | null => {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
};

export const ensureAdminAccount = () => ({
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
});

export const getAdminHintCredentials = () => {
    return {
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
    };
};

export const loginAdmin = async (email: string, password: string): Promise<AdminSession | null> => {
    try {
        const response = await adminApi.login(email, password);

        const session: AdminSession = {
            token: response.token,
            userId: response.user.id,
            email: response.user.email,
            name: response.user.name,
            loggedInAt: new Date().toISOString(),
        };

        window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
        return session;
    } catch {
        return null;
    }
};

export const getAdminSession = () => {
    const session = readJson<AdminSession>(ADMIN_SESSION_KEY);

    if (!session) {
        return null;
    }

    if (typeof session.token !== 'string' || session.token.trim().length === 0) {
        window.localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
    }

    return session;
};

export const getAdminAuthToken = () => {
    return getAdminSession()?.token ?? null;
};

export const logoutAdmin = () => {
    const token = getAdminAuthToken();
    window.localStorage.removeItem(ADMIN_SESSION_KEY);

    if (!token) {
        return;
    }

    void adminApi.logout(token).catch(() => {
        // Ignore cleanup failures; local session is already cleared.
    });
};
