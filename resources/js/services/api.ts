import {
    apiGet,
    apiPost,
    apiPatch,
    apiPut,
    apiDelete,
    apiPostForm,
} from '../api/client';
import type {
    User,
    Address,
    SellerRegistration,
    AuctionProduct,
    AuctionProductDetail,
    AuctionMessage,
    AuctionMessageListResponse,
    BagAuctionListResponse,
    DirectMessage,
    DirectMessageThreadListResponse,
    DirectMessageThreadResponse,
    SellerOrderRecord,
    OrderPaymentRecord,
} from '../types';

export interface PublicPlatformSettings {
    allow_registrations: boolean;
    maintenance_mode: boolean;
    maintenance_message: string;
    enable_video_ads: boolean;
    enable_carousel: boolean;
    enable_promo_circles: boolean;
    enable_live_chat: boolean;
    enable_seller_store: boolean;
    enable_home_search_suggestions: boolean;
    max_listing_media_files: number;
    direct_message_max_attachments: number;
    max_home_search_results: number;
    max_admin_search_results: number;
}

export interface BidNotificationItem {
    key: string;
    type:
        | 'new-bid'
        | 'outbid'
        | 'ended'
        | 'won'
        | 'seller-comment'
        | 'watching';
    auction_id: number;
    auction_title: string;
    message: string;
    created_at: string | null;
    media_url?: string | null;
}

export interface BidNotificationListResponse {
    items: BidNotificationItem[];
    count: number;
}

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

export interface WalletBalanceResponse {
    message?: string;
    wallet_balance: number;
    wallet_total_balance?: number;
    wallet_reserved_balance?: number;
}

export interface WalletTransactionItem {
    id: number;
    type: 'top-up' | 'spend';
    amount: number;
    balance_before: number;
    balance_after: number;
    reference?: string | null;
    description?: string | null;
    created_at?: string | null;
}

type SellerRegistrationResponse = { registration: SellerRegistration | null };

const SELLER_REGISTRATION_CACHE_TTL_MS = 30000;
let sellerRegistrationCache: {
    value: SellerRegistrationResponse;
    expiresAt: number;
} | null = null;
let sellerRegistrationInFlight: Promise<SellerRegistrationResponse> | null =
    null;

const invalidateSellerRegistrationCache = () => {
    sellerRegistrationCache = null;
    sellerRegistrationInFlight = null;
};

// Authentication Services
export const authService = {
    login: async (credentials: LoginCredentials) => {
        return apiPost<{ token: string; user: User }>(
            '/api/auth/login',
            credentials,
        );
    },

    register: async (data: RegisterData) => {
        return apiPost<{ token: string; user: User }>(
            '/api/auth/register',
            data,
        );
    },

    logout: async () => {
        return apiPost('/api/auth/logout', {});
    },

    me: async () => {
        return apiGet<{ user: User }>('/api/auth/me');
    },
};

export const platformService = {
    getPublicSettings: async () => {
        return apiGet<{ settings: PublicPlatformSettings }>(
            '/api/settings/public',
        );
    },
};

// User Profile Services
export const userService = {
    updateProfile: async (data: UpdateProfileData) => {
        const result = await apiPut<{ user: User }>('/api/user/profile', data);
        return result.user;
    },

    changePassword: async (data: ChangePasswordData) => {
        return apiPut('/api/user/password', data);
    },
};

// Address Services
export const addressService = {
    getAddresses: async () => {
        return apiGet<Address[]>('/api/addresses');
    },

    createAddress: async (address: Omit<Address, 'id' | 'user_id'>) => {
        return apiPost<Address>('/api/addresses', address);
    },

    updateAddress: async (
        id: string,
        address: Omit<Address, 'id' | 'user_id'>,
    ) => {
        return apiPatch<Address>(`/api/addresses/${id}`, address);
    },

    deleteAddress: async (id: string) => {
        return apiDelete(`/api/addresses/${id}`);
    },
};

export const verificationService = {
    getStatus: async () => {
        return apiGet<VerificationStatusResponse>(
            '/api/auth/verification/status',
        );
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
            data,
        );
    },

    uploadDocuments: async (formData: FormData) => {
        return apiPostForm<{
            message: string;
            verification: VerificationStatus;
        }>('/api/auth/verification/upload-documents', formData);
    },

    finalize: async (verification_terms_accepted: boolean) => {
        return apiPost<{
            message: string;
            user: User;
            verification: VerificationStatus;
        }>('/api/auth/verification/finalize', { verification_terms_accepted });
    },

    revoke: async () => {
        return apiPost<{ message: string; user: User }>(
            '/api/auth/verification/revoke',
            {},
        );
    },
};

export const walletService = {
    getBalance: async () => {
        return apiGet<WalletBalanceResponse>('/api/auth/wallet');
    },

    getHistory: async () => {
        return apiGet<{ transactions: WalletTransactionItem[] }>(
            '/api/auth/wallet/history',
        );
    },

    topUp: async (amount: number) => {
        return apiPost<WalletBalanceResponse>('/api/auth/wallet/top-up', {
            amount,
        });
    },

    spend: async (amount: number) => {
        return apiPost<WalletBalanceResponse>('/api/auth/wallet/spend', {
            amount,
        });
    },
};

export const sellerService = {
    getMyProducts: async () => {
        return apiGet<AuctionProduct[]>('/api/seller/products');
    },

    getRegistration: async (options?: { force?: boolean }) => {
        const force = options?.force === true;

        if (
            !force &&
            sellerRegistrationCache &&
            sellerRegistrationCache.expiresAt > Date.now()
        ) {
            return sellerRegistrationCache.value;
        }

        if (!force && sellerRegistrationInFlight) {
            return sellerRegistrationInFlight;
        }

        const request = apiGet<SellerRegistrationResponse>(
            '/api/seller/registration',
        )
            .then((response) => {
                sellerRegistrationCache = {
                    value: response,
                    expiresAt: Date.now() + SELLER_REGISTRATION_CACHE_TTL_MS,
                };

                return response;
            })
            .finally(() => {
                sellerRegistrationInFlight = null;
            });

        sellerRegistrationInFlight = request;
        return request;
    },

    updateShippingSettings: async (data: {
        shop_name?: string;
        contact_email?: string;
        contact_phone?: string;
        pickup_address_summary?: string;
        general_location?: string;
        zip_code?: string;
    }) => {
        invalidateSellerRegistrationCache();

        const response = await apiPatch<{
            message: string;
            registration: SellerRegistration;
        }>(
            '/api/seller/shipping-settings',
            data,
        );

        sellerRegistrationCache = {
            value: { registration: response.registration },
            expiresAt: Date.now() + SELLER_REGISTRATION_CACHE_TTL_MS,
        };

        return response;
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
        primary_document_file?: File;
        government_id_front_file?: File;
        bir_certificate_file?: File;
        submit_sworn_declaration?: 'yes' | 'no';
        agree_business_terms: boolean;
    }) => {
        invalidateSellerRegistrationCache();

        const formData = new FormData();
        const appendIfPresent = (key: string, value: string | undefined) => {
            if (typeof value === 'string' && value.length > 0) {
                formData.append(key, value);
            }
        };

        appendIfPresent('shop_name', data.shop_name);
        appendIfPresent('contact_email', data.contact_email);
        appendIfPresent('contact_phone', data.contact_phone);
        appendIfPresent('pickup_address_summary', data.pickup_address_summary);
        appendIfPresent('submit_business_mode', data.submit_business_mode);
        appendIfPresent('seller_type', data.seller_type);
        appendIfPresent('company_registered_name', data.company_registered_name);
        appendIfPresent('registered_last_name', data.registered_last_name);
        appendIfPresent('registered_first_name', data.registered_first_name);
        appendIfPresent('registered_middle_name', data.registered_middle_name);
        appendIfPresent('registered_suffix', data.registered_suffix);
        appendIfPresent('general_location', data.general_location);
        appendIfPresent('registered_address', data.registered_address);
        appendIfPresent('zip_code', data.zip_code);
        appendIfPresent('primary_document_type', data.primary_document_type);
        appendIfPresent('primary_document_name', data.primary_document_name);
        appendIfPresent('government_id_type', data.government_id_type);
        appendIfPresent('government_id_front_name', data.government_id_front_name);
        appendIfPresent('business_email', data.business_email);
        appendIfPresent('business_email_otp', data.business_email_otp);
        appendIfPresent('business_phone_number', data.business_phone_number);
        appendIfPresent('business_phone_otp', data.business_phone_otp);
        appendIfPresent('tax_tin', data.tax_tin);
        appendIfPresent('vat_status', data.vat_status);
        appendIfPresent('bir_certificate_name', data.bir_certificate_name);
        appendIfPresent('submit_sworn_declaration', data.submit_sworn_declaration);

        formData.append('agree_business_terms', data.agree_business_terms ? '1' : '0');

        if (data.primary_document_file) {
            formData.append('primary_document_file', data.primary_document_file);
        }

        if (data.government_id_front_file) {
            formData.append('government_id_front_file', data.government_id_front_file);
        }

        if (data.bir_certificate_file) {
            formData.append('bir_certificate_file', data.bir_certificate_file);
        }

        const response = await apiPostForm<{
            message: string;
            registration: SellerRegistration;
        }>(
            '/api/seller/registration',
            formData,
        );

        sellerRegistrationCache = {
            value: { registration: response.registration },
            expiresAt: Date.now() + SELLER_REGISTRATION_CACHE_TTL_MS,
        };

        return response;
    },

    createProduct: async (formData: FormData) => {
        return apiPostForm<AuctionProduct>('/api/auctions', formData);
    },

    updateProduct: async (productId: number, formData: FormData) => {
        formData.append('_method', 'PATCH');
        return apiPostForm<AuctionProduct>(
            `/api/auctions/${productId}`,
            formData,
        );
    },

    deleteProduct: async (productId: number) => {
        return apiDelete<{ message: string }>(`/api/auctions/${productId}`);
    },
};

export const auctionService = {
    getAllProducts: async () => {
        return apiGet<AuctionProduct[]>('/api/auctions');
    },

    getSellerStoreProducts: async (sellerId: number) => {
        return apiGet<AuctionProduct[]>(
            `/api/auctions?include_closed=1&seller_id=${sellerId}`,
        );
    },

    getProductDetails: async (productId: number) => {
        return apiGet<AuctionProductDetail>(`/api/auctions/${productId}`);
    },

    getWonAuctions: async () => {
        return apiGet<BagAuctionListResponse>('/api/bag/won-auctions');
    },

    placeBid: async (
        productId: number,
        amount: number,
        options?: { acknowledge_auto_deduct?: boolean },
    ) => {
        return apiPost<{ id: number; amount: string }>(
            `/api/auctions/${productId}/bids`,
            {
                amount,
                acknowledge_auto_deduct:
                    options?.acknowledge_auto_deduct ?? false,
            },
        );
    },

    getMessages: async (productId: number) => {
        return apiGet<AuctionMessageListResponse>(
            `/api/auctions/${productId}/messages`,
        );
    },

    postMessage: async (productId: number, message: string) => {
        return apiPost<AuctionMessage>(`/api/auctions/${productId}/messages`, {
            message,
        });
    },

    markMessagesRead: async (productId: number) => {
        return apiPost<{ message: string }>(
            `/api/auctions/${productId}/messages/read`,
            {},
        );
    },
};

export const directMessageService = {
    getThreads: async () => {
        return apiGet<DirectMessageThreadListResponse>(
            '/api/direct-messages/threads',
        );
    },

    getThread: async (userId: number) => {
        return apiGet<DirectMessageThreadResponse>(
            `/api/direct-messages/threads/${userId}`,
        );
    },

    sendMessage: async (
        userId: number,
        payload: { message?: string; attachments?: File[] },
    ) => {
        const formData = new FormData();

        if (payload.message) {
            formData.append('message', payload.message);
        }

        payload.attachments?.forEach((file) => {
            formData.append('attachments[]', file);
        });

        return apiPostForm<DirectMessage>(
            `/api/direct-messages/threads/${userId}`,
            formData,
        );
    },

    deleteThread: async (userId: number) => {
        return apiDelete<{ message: string }>(
            `/api/direct-messages/threads/${userId}`,
        );
    },
};

export const bidNotificationService = {
    getMyNotifications: async () => {
        return apiGet<BidNotificationListResponse>('/api/notifications/bids');
    },
};

export const orderService = {
    getMyOrders: async () => {
        return apiGet<{ orders: SellerOrderRecord[] }>('/api/orders');
    },

    createFromBidWinner: async (data: {
        bid_winner_id: number;
        shipping_address_id?: number;
        subtotal_amount?: number;
        shipping_fee?: number;
        service_fee?: number;
        total_amount?: number;
        capture_payment?: boolean;
        payment?: {
            method: string;
            provider?: string;
            provider_reference?: string;
            status?: string;
            amount?: number;
            currency?: string;
        };
        meta?: Record<string, unknown>;
    }) => {
        return apiPost<{ message: string; order: SellerOrderRecord }>(
            '/api/orders/from-bid-winner',
            data,
        );
    },

    getSellerOrders: async () => {
        return apiGet<{ orders: SellerOrderRecord[] }>('/api/seller/orders');
    },

    updateSellerShippingStatus: async (
        orderId: number,
        data: {
            status:
                | 'pending'
                | 'packed'
                | 'shipped'
                | 'in_transit'
                | 'delivered'
                | 'failed'
                | 'cancelled';
            shipping_method?: string;
            carrier?: string;
            service_level?: string;
            tracking_number?: string;
            shipped_at?: string;
            estimated_delivery_at?: string;
            delivered_at?: string;
            notes?: string;
        },
    ) => {
        return apiPatch<{ message: string; order: SellerOrderRecord }>(
            `/api/seller/orders/${orderId}/shipping-status`,
            data,
        );
    },

    captureSellerPayment: async (
        orderId: number,
        data: {
            method: string;
            provider?: string;
            provider_reference?: string;
            status?:
                | 'pending'
                | 'paid'
                | 'failed'
                | 'refunded'
                | 'partially_refunded';
            amount?: number;
            currency?: string;
            failure_reason?: string;
            metadata?: Record<string, unknown>;
        },
    ) => {
        return apiPost<{
            message: string;
            payment: OrderPaymentRecord;
            order: SellerOrderRecord;
        }>(`/api/seller/orders/${orderId}/payments`, data);
    },

    getSellerPaymentHistory: async () => {
        return apiGet<{ payments: OrderPaymentRecord[] }>(
            '/api/seller/orders/payments/history',
        );
    },
};
