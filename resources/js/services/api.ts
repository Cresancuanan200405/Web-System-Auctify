import { apiGet, apiPost, apiPatch, apiPut, apiDelete, apiPostForm } from '../api/client';
import type { User, Address, SellerRegistration, AuctionProduct, AuctionProductDetail } from '../types';

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

export interface VerificationStatus {
    id: number;
    status: 'draft' | 'approved' | 'revoked' | 'rejected' | 'pending';
    full_name: string | null;
    date_of_birth: string | null;
    phone: string | null;
    address: string | null;
    privacy_agreed_at: string | null;
    phone_verified_at: string | null;
    government_id_uploaded: boolean;
    selfie_uploaded: boolean;
    utility_bill_uploaded: boolean;
    bank_statement_uploaded: boolean;
    government_id_name: string | null;
    selfie_name: string | null;
    utility_bill_name: string | null;
    bank_statement_name: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
}

export interface VerificationStatusResponse {
    user: {
        is_verified: boolean;
        verified_at: string | null;
    };
    verification: VerificationStatus | null;
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

export const verificationService = {
    getStatus: async () => {
        return apiGet<VerificationStatusResponse>('/api/auth/verification/status');
    },

    sendOtp: async (data: {
        full_name: string;
        date_of_birth: string;
        phone: string;
        address: string;
        privacy_accepted: boolean;
    }) => {
        return apiPost<{
            message: string;
            verification: VerificationStatus;
            dev_otp?: string | null;
        }>('/api/auth/verification/send-otp', data);
    },

    confirmOtp: async (data: { phone: string; otp: string }) => {
        return apiPost<{ message: string; verification: VerificationStatus }>(
            '/api/auth/verification/confirm-otp',
            data
        );
    },

    uploadDocuments: async (formData: FormData) => {
        return apiPostForm<{ message: string; verification: VerificationStatus }>(
            '/api/auth/verification/upload-documents',
            formData
        );
    },

    finalize: async (verification_terms_accepted: boolean) => {
        return apiPost<{ message: string; user: User; verification: VerificationStatus }>(
            '/api/auth/verification/finalize',
            { verification_terms_accepted }
        );
    },

    revoke: async () => {
        return apiPost<{ message: string; user: User }>('/api/auth/verification/revoke', {});
    },
};

export const sellerService = {
    getMyProducts: async () => {
        return apiGet<AuctionProduct[]>('/api/seller/products');
    },

    getRegistration: async () => {
        return apiGet<{ registration: SellerRegistration | null }>('/api/seller/registration');
    },

    submitRegistration: async (data: {
        shop_name?: string;
        contact_email?: string;
        contact_phone?: string;
        pickup_address_summary?: string;
        submit_business_mode?: 'now' | 'later';
        seller_type?: 'sole' | 'corp' | 'opc';
        company_registered_name?: string;
        registered_last_name?: string;
        registered_first_name?: string;
        registered_middle_name?: string;
        registered_suffix?: string;
        general_location?: string;
        registered_address?: string;
        zip_code?: string;
        primary_document_type?: string;
        primary_document_name?: string;
        government_id_type?: string;
        government_id_front_name?: string;
        business_email?: string;
        business_email_otp?: string;
        business_phone_number?: string;
        business_phone_otp?: string;
        tax_tin?: string;
        vat_status?: 'vat' | 'non-vat';
        bir_certificate_name?: string;
        submit_sworn_declaration?: 'yes' | 'no';
        agree_business_terms: boolean;
    }) => {
        return apiPost<{ message: string; registration: SellerRegistration }>(
            '/api/seller/registration',
            data
        );
    },

    createProduct: async (formData: FormData) => {
        return apiPostForm<AuctionProduct>('/api/auctions', formData);
    },

    updateProduct: async (productId: number, formData: FormData) => {
        formData.append('_method', 'PATCH');
        return apiPostForm<AuctionProduct>(`/api/auctions/${productId}`, formData);
    },

    deleteProduct: async (productId: number) => {
        return apiDelete<{ message: string }>(`/api/auctions/${productId}`);
    },
};

export const auctionService = {
    getAllProducts: async () => {
        return apiGet<AuctionProduct[]>('/api/auctions');
    },

    getProductDetails: async (productId: number) => {
        return apiGet<AuctionProductDetail>(`/api/auctions/${productId}`);
    },

    placeBid: async (productId: number, amount: number) => {
        return apiPost<{ id: number; amount: string }>(`/api/auctions/${productId}/bids`, { amount });
    },
};
