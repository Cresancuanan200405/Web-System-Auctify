import { useState } from 'react';

/**
 * Custom hook for managing localStorage with state synchronization
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(`Error loading ${key} from localStorage:`, error);
            return initialValue;
        }
    });

    const setValue = (value: T) => {
        try {
            setStoredValue(value);
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
        }
    };

    return [storedValue, setValue];
}

/**
 * Hook for managing individual preference flags
 */
export function usePreference(key: string, defaultValue: boolean = false): [boolean, (value: boolean) => void] {
    const [value, setValue] = useState<boolean>(() => {
        const stored = localStorage.getItem(key);
        return stored !== null ? stored === 'true' : defaultValue;
    });

    const updateValue = (newValue: boolean) => {
        localStorage.setItem(key, String(newValue));
        setValue(newValue);
    };

    return [value, updateValue];
}