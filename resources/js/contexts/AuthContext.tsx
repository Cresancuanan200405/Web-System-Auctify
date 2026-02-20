import type { ReactNode } from 'react';
import React, { createContext, useContext, useState } from 'react';
import type { User } from '../types';

interface AuthContextType {
    authUser: User | null;
    authToken: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [authUser, setAuthUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('auth_user');
        return stored ? JSON.parse(stored) : null;
    });

    const [authToken, setAuthToken] = useState<string | null>(() => {
        return localStorage.getItem('auth_token');
    });

    const login = (token: string, user: User) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
        setAuthToken(token);
        setAuthUser(user);
    };

    const logout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setAuthToken(null);
        setAuthUser(null);
    };

    const updateUser = (user: User) => {
        localStorage.setItem('auth_user', JSON.stringify(user));
        setAuthUser(user);
    };

    return (
        <AuthContext.Provider value={{ authUser, authToken, login, logout, updateUser }}>
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
