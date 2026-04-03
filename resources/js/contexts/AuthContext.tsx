import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { User } from '../types';

interface AuthContextType {
    authUser: User | null;
    authToken: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getInitialAuthState = () => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUserRaw = localStorage.getItem('auth_user');

    if (!storedToken || !storedUserRaw) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        return {
            authToken: null,
            authUser: null,
        };
    }

    try {
        const storedUser = JSON.parse(storedUserRaw) as User;

        if (
            !storedUser ||
            typeof storedUser !== 'object' ||
            typeof storedUser.id !== 'number'
        ) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');

            return {
                authToken: null,
                authUser: null,
            };
        }

        return {
            authToken: storedToken,
            authUser: storedUser,
        };
    } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        return {
            authToken: null,
            authUser: null,
        };
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [authUser, setAuthUser] = useState<User | null>(
        () => getInitialAuthState().authUser,
    );

    const [authToken, setAuthToken] = useState<string | null>(
        () => getInitialAuthState().authToken,
    );

    const login = useCallback((token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        setAuthToken(token);
        setAuthUser(user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthToken(null);
        setAuthUser(null);
    }, []);

    const updateUser = useCallback((user: User) => {
        localStorage.setItem('auth_user', JSON.stringify(user));
        setAuthUser(user);
    }, []);

    const value = useMemo(
        () => ({ authUser, authToken, login, logout, updateUser }),
        [authUser, authToken, login, logout, updateUser],
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
