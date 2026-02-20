import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '../api/client';
import type { User, Address } from '../types';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    gender?: 'female' | 'male';
    preferred_content?: string;
    want_notifications?: boolean;
}

export interface UpdateProfileData {
    name: string;
    email: string;
}

export interface ChangePasswordData {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
}

// Authentication Services
export const authService = {
    login: async (credentials: LoginCredentials) => {
        return apiPost<{ token: string; user: User }>('/api/auth/login', credentials);
    },

    register: async (data: RegisterData) => {
        return apiPost<{ token: string; user: User }>('/api/auth/register', data);
    },

    logout: async () => {
        return apiPost('/api/auth/logout', {});
    }
};

// User Profile Services
export const userService = {
    updateProfile: async (data: UpdateProfileData) => {
        const result = await apiPut<{ user: User }>('/api/user/profile', data);
        return result.user;
    },

    changePassword: async (data: ChangePasswordData) => {
        return apiPut('/api/user/password', data);
    }
};

// Address Services
export const addressService = {
    getAddresses: async () => {
        return apiGet<Address[]>('/api/addresses');
    },

    createAddress: async (address: Omit<Address, 'id' | 'user_id'>) => {
        return apiPost<Address>('/api/addresses', address);
    },

    updateAddress: async (id: string, address: Omit<Address, 'id' | 'user_id'>) => {
        return apiPatch<Address>(`/api/addresses/${id}`, address);
    },

    deleteAddress: async (id: string) => {
        return apiDelete(`/api/addresses/${id}`);
    }
};
