import { useState, useEffect } from 'react';

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
            // Notify other hook instances in this tab about the update
            window.dispatchEvent(
                new CustomEvent(`local-storage-${key}`, { detail: value as unknown as NonNullable<T> })
            );
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
        }
    };

    useEffect(() => {
        let timeoutId: number | null = null;

        try {
            const item = window.localStorage.getItem(key);
            const nextValue = item ? JSON.parse(item) : initialValue;
            timeoutId = window.setTimeout(() => {
                setStoredValue(nextValue);
            }, 0);
        } catch (error) {
            console.error(`Error reloading ${key} from localStorage:`, error);
            timeoutId = window.setTimeout(() => {
                setStoredValue(initialValue);
            }, 0);
        }

        return () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [key, initialValue]);

    useEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key !== key) return;
            try {
                const newValue = event.newValue ? JSON.parse(event.newValue) : initialValue;
                setStoredValue(newValue);
            } catch (error) {
                console.error(`Error syncing ${key} from localStorage event:`, error);
            }
        };

        const handleCustomEvent = (event: Event) => {
            const customEvent = event as CustomEvent<T>;
            setStoredValue(customEvent.detail);
        };

        window.addEventListener('storage', handleStorage);
        window.addEventListener(`local-storage-${key}`, handleCustomEvent);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener(`local-storage-${key}`, handleCustomEvent);
        };
    }, [key, initialValue]);

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