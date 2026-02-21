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
    submitted_at?: string | null;
    created_at?: string;
    updated_at?: string;
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

export type ViewMode = 'home' | 'auth' | 'account' | 'bag' | 'seller';