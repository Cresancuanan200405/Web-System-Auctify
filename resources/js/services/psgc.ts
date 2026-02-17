import type { Region, Province, City, Barangay } from '../types';

const PSGC_BASE_URL = 'https://psgc.gitlab.io/api';

export const getRegions = async (): Promise<Region[]> => {
    const response = await fetch(`${PSGC_BASE_URL}/regions/`);
    return response.json();
};

export const getProvinces = async (regionCode: string): Promise<Province[]> => {
    const response = await fetch(`${PSGC_BASE_URL}/regions/${regionCode}/provinces/`);
    return response.json();
};

export const getCities = async (provinceCode: string): Promise<City[]> => {
    const response = await fetch(`${PSGC_BASE_URL}/provinces/${provinceCode}/cities-municipalities/`);
    return response.json();
};

export const getBarangays = async (cityCode: string): Promise<Barangay[]> => {
    const response = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${cityCode}/barangays/`);
    return response.json();
};
