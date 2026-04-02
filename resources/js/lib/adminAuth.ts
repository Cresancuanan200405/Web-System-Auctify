import { adminApi } from '../services/adminApi';

export const ADMIN_SESSION_KEY = 'auctify_admin_session';

export interface AdminSession {
    userId: number;
    email: string;
    name: string;
    token: string | null;
    loggedInAt: string;
}

export type AdminLoginOutcome =
    | { status: 'authenticated'; session: AdminSession };

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

const readJson = <T>(key: string): T | null => {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : null;
    } catch {
        return null;
    }
};

export const ensureAdminAccount = () => {
    return null;
};

export const saveAdminSession = (session: AdminSession) => {
    window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
};

export const updateAdminSession = (
    sessionPatch: Pick<AdminSession, 'userId' | 'email' | 'name'>,
) => {
    const currentSession = getAdminSession();

    if (!currentSession) {
        return null;
    }

    const updatedSession: AdminSession = {
        userId: sessionPatch.userId,
        email: sessionPatch.email,
        name: sessionPatch.name,
        token: currentSession.token,
        loggedInAt: new Date().toISOString(),
    };

    saveAdminSession(updatedSession);
    return updatedSession;
};

export const clearAdminSession = () => {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const loginAdmin = async (
    email: string,
    password: string,
): Promise<AdminLoginOutcome> => {
    const response = await adminApi.login(email, password);

    if (!response.user) {
        throw new Error('Admin session could not be established.');
    }

    const session: AdminSession = {
        userId: response.user.id,
        email: response.user.email,
        name: response.user.name,
        token:
            typeof response.token === 'string' && response.token.trim() !== ''
                ? response.token
                : null,
        loggedInAt: new Date().toISOString(),
    };

    saveAdminSession(session);
    return {
        status: 'authenticated',
        session,
    };
};

export const getAdminSession = () => {
    const session = readJson<AdminSession>(ADMIN_SESSION_KEY);

    if (!session) {
        return null;
    }

    if (
        !Number.isInteger(session.userId) ||
        typeof session.email !== 'string' ||
        typeof session.name !== 'string'
    ) {
        clearAdminSession();
        return null;
    }

    return session;
};

export const getAdminAuthToken = () => {
    const session = getAdminSession();

    if (!session) {
        return null;
    }

    return session.token && session.token.trim() !== ''
        ? session.token
        : 'cookie-session';
};

export const syncAdminSession = async () => {
    try {
        const existingSession = getAdminSession();
        const response = await adminApi.getSession();

        if (!response.user) {
            clearAdminSession();
            return null;
        }

        const session: AdminSession = {
            userId: response.user.id,
            email: response.user.email,
            name: response.user.name,
            token:
                typeof response.token === 'string' &&
                response.token.trim() !== ''
                    ? response.token
                    : (existingSession?.token ?? null),
            loggedInAt: new Date().toISOString(),
        };

        saveAdminSession(session);
        return session;
    } catch {
        clearAdminSession();
        return null;
    }
};

export const logoutAdmin = () => {
    clearAdminSession();

    void adminApi.logout().catch(() => {
        // Ignore cleanup failures; local session is already cleared.
    });
};
