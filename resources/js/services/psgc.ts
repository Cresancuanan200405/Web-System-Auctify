import type { Region, Province, City, Barangay } from '../types';

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

let regionsCache: Region[] | null = null;
let regionsInFlight: Promise<Region[]> | null = null;

const provincesCache = new Map<string, Province[]>();
const provincesInFlight = new Map<string, Promise<Province[]>>();

const citiesCache = new Map<string, City[]>();
const citiesInFlight = new Map<string, Promise<City[]>>();

const barangaysCache = new Map<string, Barangay[]>();
const barangaysInFlight = new Map<string, Promise<Barangay[]>>();

const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`PSGC request failed (${response.status})`);
    }

    return response.json() as Promise<T>;
};

export const getRegions = async (): Promise<Region[]> => {
    if (regionsCache) {
        return regionsCache;
    }

    if (regionsInFlight) {
        return regionsInFlight;
    }

    const request = fetchJson<Region[]>(`${PSGC_BASE_URL}/regions/`).then(
        (data) => {
            regionsCache = data;
            return data;
        },
    );

    regionsInFlight = request;

    try {
        return await request;
    } finally {
        regionsInFlight = null;
    }
};

export const getProvinces = async (regionCode: string): Promise<Province[]> => {
    if (provincesCache.has(regionCode)) {
        return provincesCache.get(regionCode) || [];
    }

    if (provincesInFlight.has(regionCode)) {
        return provincesInFlight.get(regionCode) || [];
    }

    const request = fetchJson<Province[]>(
        `${PSGC_BASE_URL}/regions/${regionCode}/provinces/`,
    ).then((data) => {
        provincesCache.set(regionCode, data);
        return data;
    });

    provincesInFlight.set(regionCode, request);

    try {
        return await request;
    } finally {
        provincesInFlight.delete(regionCode);
    }
};

export const getCities = async (provinceCode: string): Promise<City[]> => {
    if (citiesCache.has(provinceCode)) {
        return citiesCache.get(provinceCode) || [];
    }

    if (citiesInFlight.has(provinceCode)) {
        return citiesInFlight.get(provinceCode) || [];
    }

    const request = fetchJson<City[]>(
        `${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities/`,
    ).then((data) => {
        citiesCache.set(provinceCode, data);
        return data;
    });

    citiesInFlight.set(provinceCode, request);

    try {
        return await request;
    } finally {
        citiesInFlight.delete(provinceCode);
    }
};

export const getBarangays = async (cityCode: string): Promise<Barangay[]> => {
    if (barangaysCache.has(cityCode)) {
        return barangaysCache.get(cityCode) || [];
    }

    if (barangaysInFlight.has(cityCode)) {
        return barangaysInFlight.get(cityCode) || [];
    }

    const request = fetchJson<Barangay[]>(
        `${PSGC_BASE_URL}/cities-municipalities/${cityCode}/barangays/`,
    ).then((data) => {
        barangaysCache.set(cityCode, data);
        return data;
    });

    barangaysInFlight.set(cityCode, request);

    try {
        return await request;
    } finally {
        barangaysInFlight.delete(cityCode);
    }
};
