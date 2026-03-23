// Type definitions for the application

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    birthday?: string | null;
    gender?: string | null;
    google_id?: string | null;
    avatar?: string | null;
    is_verified?: boolean;
    verified_at?: string | null;
    verification_revoked_at?: string | null;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Address {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    region: string;
    province: string;
    city: string;
    barangay: string;
    postal_code?: string;
    street_address: string;
    building_name?: string;
    unit_floor?: string;
    notes?: string;
    user_id?: number;
}

export interface Card {
    id: number;
    type: 'visa' | 'mastercard' | 'jcb' | 'gcash' | 'maya';
    number: string;
    expiry: string;
    cvc: string;
    name: string;
    balance: number;
}

export interface Region {
    code: string;
    name: string;
}

export interface Province {
    code: string;
    name: string;
    regionCode: string;
}

export interface City {
    code: string;
    name: string;
    provinceCode: string;
}

export interface Barangay {
    code: string;
    name: string;
    cityCode: string;
}

export interface Preferences {
    [key: string]: boolean;
}

export interface SellerRegistration {
    id: number;
    user_id: number;
    shop_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    pickup_address_summary?: string | null;
    submit_business_mode?: 'now' | 'later' | null;
    seller_type?: 'sole' | 'corp' | 'opc' | null;
    company_registered_name?: string | null;
    registered_last_name?: string | null;
    registered_first_name?: string | null;
    registered_middle_name?: string | null;
    registered_suffix?: string | null;
    general_location?: string | null;
    registered_address?: string | null;
    zip_code?: string | null;
    primary_document_type?: string | null;
    primary_document_name?: string | null;
    government_id_type?: string | null;
    government_id_front_name?: string | null;
    business_email?: string | null;
    business_email_otp?: string | null;
    business_phone_number?: string | null;
    business_phone_otp?: string | null;
    tax_tin?: string | null;
    vat_status?: 'vat' | 'non-vat' | null;
    bir_certificate_name?: string | null;
    submit_sworn_declaration?: 'yes' | 'no' | null;
    agree_business_terms: boolean;
    status?: string | null;
    revoked_reason?: string | null;
    revoked_at?: string | null;
    submitted_at?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AuctionMedia {
    id: number;
    auction_id: number;
    file_path: string;
    media_type: 'image' | 'video';
    url: string;
    created_at?: string;
    updated_at?: string;
}

export interface AuctionProduct {
    id: number;
    user_id: number;
    user?: Pick<User, 'id' | 'name' | 'email'> & {
        seller_registration?: Pick<SellerRegistration, 'shop_name'>;
    };
    title: string;
    category?: string | null;
    subcategory?: string | null;
    description?: string | null;
    starting_price: string;
    max_increment: string;
    current_price: string;
    starts_at?: string | null;
    ends_at: string;
    status: 'open' | 'closed';
    media?: AuctionMedia[];
    page_views?: number;
    bids_count?: number;
    messages_count?: number;
    unique_bidders_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface AuctionBid {
    id: number;
    auction_id: number;
    user_id: number;
    amount: string;
    user?: Pick<User, 'id' | 'name' | 'email'>;
    created_at?: string;
    updated_at?: string;
}

export interface AuctionMessage {
    id: number;
    auction_id: number;
    user_id: number;
    message: string;
    created_at?: string;
    updated_at?: string;
    is_unread?: boolean;
    user?: Pick<User, 'id' | 'name' | 'email'> & {
        seller_registration?: Pick<SellerRegistration, 'shop_name'>;
    };
}

export interface AuctionMessageListResponse {
    messages: AuctionMessage[];
    unread_count: number;
}

export interface DirectMessageParticipant extends Pick<
    User,
    'id' | 'name' | 'email'
> {
    seller_registration?: Pick<SellerRegistration, 'shop_name'> | null;
}

export interface DirectMessageAttachment {
    id: number;
    file_name: string;
    mime_type?: string | null;
    file_size?: number | null;
    url: string;
}

export interface DirectMessage {
    id: number;
    sender_id: number;
    recipient_id: number;
    message: string;
    read_at?: string | null;
    created_at?: string;
    updated_at?: string;
    sender?: DirectMessageParticipant | null;
    recipient?: DirectMessageParticipant | null;
    attachments?: DirectMessageAttachment[];
}

export interface DirectMessageThread {
    user: DirectMessageParticipant | null;
    latest_message: string;
    latest_message_at?: string;
    unread_count: number;
}

export interface DirectMessageThreadListResponse {
    threads: DirectMessageThread[];
}

export interface DirectMessageThreadResponse {
    user: DirectMessageParticipant | null;
    messages: DirectMessage[];
}

export interface AuctionProductDetail extends AuctionProduct {
    user?: Pick<User, 'id' | 'name' | 'email'> & {
        seller_registration?: Pick<SellerRegistration, 'shop_name'>;
    };
    bids?: AuctionBid[];
    messages?: AuctionMessage[];
    bids_count?: number;
}

export interface BagAuctionItem extends AuctionProduct {
    user?: Pick<User, 'id' | 'name' | 'email'> & {
        seller_registration?: Pick<SellerRegistration, 'shop_name'>;
    };
    winning_bid_amount: string;
    winning_bid_at?: string | null;
}

export interface BagAuctionListResponse {
    items: BagAuctionItem[];
}

export interface OrderHistoryItem {
    id: string;
    auction_id: number;
    title: string;
    category?: string | null;
    subcategory?: string | null;
    seller_user_id?: number;
    seller_name: string;
    seller_shop_name?: string;
    buyer_user_id?: number;
    buyer_name?: string;
    buyer_email?: string;
    amount_paid: string;
    status: 'processing' | 'delivered' | 'cancelled';
    address_summary: string;
    payment_card_label: string;
    media_url?: string;
    media_type?: 'image' | 'video';
    purchased_at: string;
}

export interface WishlistItem {
    id: number;
    title: string;
    category?: string | null;
    subcategory?: string | null;
    price: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
}

export type AccountSection =
    | 'details'
    | 'addresses'
    | 'preferences'
    | 'cashback'
    | 'wallet'
    | 'wishlist'
    | 'orders'
    | 'reviews'
    | 'cards'
    | 'zvip'
    | 'verification'
    | 'seller'
    | 'delete-account';

export type ViewMode =
    | 'home'
    | 'category'
    | 'auth'
    | 'account'
    | 'bag'
    | 'seller'
    | 'seller-profile'
    | 'auction'
    | 'seller-store'
    | 'admin-login'
    | 'admin-dashboard';
