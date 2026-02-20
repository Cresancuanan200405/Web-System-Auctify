// Type definitions for the application

export interface User {
    id: number;
    name: string;
    email: string;
    birthday?: string | null;
    gender?: string | null;
    google_id?: string | null;
    avatar?: string | null;
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
    | 'delete-account';

export type ViewMode = 'home' | 'auth' | 'account' | 'bag';