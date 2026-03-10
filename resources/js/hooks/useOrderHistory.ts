import { useLocalStorage } from './useLocalStorage';
import type { OrderHistoryItem } from '../types';

export const useOrderHistory = () => {
    const userStorageScope = (() => {
        try {
            const rawUser = window.localStorage.getItem('auth_user');
            if (!rawUser) return 'anonymous';

            const parsedUser = JSON.parse(rawUser) as { id?: number; email?: string };
            if (parsedUser.id) return `user-${parsedUser.id}`;
            if (parsedUser.email) return `email-${parsedUser.email.toLowerCase()}`;
        } catch {
            // fall through to anonymous scope
        }

        return 'anonymous';
    })();

    const orderHistoryKey = `order_history_${userStorageScope}`;
    const [orders, setOrders] = useLocalStorage<OrderHistoryItem[]>(orderHistoryKey, []);

    const addOrder = (order: OrderHistoryItem) => {
        setOrders([order, ...orders]);
    };

    return {
        orders,
        addOrder,
    };
};