import type { OrderHistoryItem } from '../types';
import { useLocalStorage } from './useLocalStorage';

const getSellerOrderHistoryKey = (sellerUserId: number) =>
    `seller_order_history_user-${sellerUserId}`;

const dispatchLocalStorageUpdate = (key: string, value: OrderHistoryItem[]) => {
    window.dispatchEvent(
        new CustomEvent(`local-storage-${key}`, { detail: value }),
    );
};

export const addSellerOrder = (
    sellerUserId: number,
    order: OrderHistoryItem,
) => {
    const key = getSellerOrderHistoryKey(sellerUserId);

    try {
        const raw = window.localStorage.getItem(key);
        const existing = raw ? (JSON.parse(raw) as OrderHistoryItem[]) : [];
        const next = [order, ...existing];
        window.localStorage.setItem(key, JSON.stringify(next));
        dispatchLocalStorageUpdate(key, next);
    } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
    }
};

export const updateSellerOrderStatus = (
    sellerUserId: number,
    orderId: string,
    newStatus: string,
) => {
    const key = getSellerOrderHistoryKey(sellerUserId);

    try {
        const raw = window.localStorage.getItem(key);
        const existing = raw ? (JSON.parse(raw) as OrderHistoryItem[]) : [];
        const updated = existing.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
        );
        window.localStorage.setItem(key, JSON.stringify(updated));
        dispatchLocalStorageUpdate(key, updated);
        return updated.find((o) => o.id === orderId) || null;
    } catch (error) {
        console.error(`Error updating order status in ${key}:`, error);
        return null;
    }
};

export const useSellerOrderHistory = (sellerUserId?: number) => {
    const storageKey = sellerUserId
        ? getSellerOrderHistoryKey(sellerUserId)
        : 'seller_order_history_guest';
    const [orders, setOrders] = useLocalStorage<OrderHistoryItem[]>(
        storageKey,
        [],
    );

    const updateOrderStatus = (orderId: string, newStatus: string) => {
        const updated = orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
        );
        setOrders(updated);
    };

    const clearOrders = () => {
        setOrders([]);
    };

    return {
        orders,
        updateOrderStatus,
        clearOrders,
    };
};

export const updateBuyerOrderStatus = (
    buyerUserId: number | string,
    auctionId: number | string,
    newStatus: string,
    sellerOrderId?: string,
) => {
    const key = `order_history_user-${buyerUserId}`;

    const normalizedAuctionId = String(auctionId);
    const normalizedSellerOrderId = sellerOrderId
        ? sellerOrderId.replace(/-seller$/, '')
        : '';

    const applyStatusUpdate = (list: OrderHistoryItem[]) => {
        let changed = false;

        const updated = list.map((order) => {
            const orderAuctionId = String(order.auction_id);
            const orderId = String(order.id);
            const orderBuyerUserId =
                order.buyer_user_id != null ? String(order.buyer_user_id) : '';
            const matchesAuction = orderAuctionId === normalizedAuctionId;
            const matchesOrderId = normalizedSellerOrderId
                ? orderId === normalizedSellerOrderId
                : false;
            const matchesBuyer = orderBuyerUserId
                ? orderBuyerUserId === String(buyerUserId)
                : true;

            if ((matchesAuction || matchesOrderId) && matchesBuyer) {
                changed = true;
                return { ...order, status: newStatus };
            }

            return order;
        });

        return { updated, changed };
    };

    try {
        const raw = window.localStorage.getItem(key);
        const existing = raw ? (JSON.parse(raw) as OrderHistoryItem[]) : [];
        const primary = applyStatusUpdate(existing);

        if (primary.changed) {
            window.localStorage.setItem(key, JSON.stringify(primary.updated));
            window.dispatchEvent(
                new CustomEvent(`local-storage-${key}`, {
                    detail: primary.updated,
                }),
            );
            return;
        }

        // Fallback for legacy/mixed account scopes: update the first matching order_history_* key.
        for (let index = 0; index < window.localStorage.length; index += 1) {
            const fallbackKey = window.localStorage.key(index);
            if (!fallbackKey || !fallbackKey.startsWith('order_history_')) {
                continue;
            }

            const fallbackRaw = window.localStorage.getItem(fallbackKey);
            const fallbackExisting = fallbackRaw
                ? (JSON.parse(fallbackRaw) as OrderHistoryItem[])
                : [];
            const fallback = applyStatusUpdate(fallbackExisting);

            if (fallback.changed) {
                window.localStorage.setItem(
                    fallbackKey,
                    JSON.stringify(fallback.updated),
                );
                window.dispatchEvent(
                    new CustomEvent(`local-storage-${fallbackKey}`, {
                        detail: fallback.updated,
                    }),
                );
                return;
            }
        }
    } catch (error) {
        console.error(`Error syncing order status for buyer in ${key}:`, error);
    }
};

export const useOrderHistory = () => {
    const userStorageScope = (() => {
        try {
            const rawUser = window.localStorage.getItem('auth_user');
            if (!rawUser) return 'anonymous';

            const parsedUser = JSON.parse(rawUser) as {
                id?: number;
                email?: string;
            };
            if (parsedUser.id) return `user-${parsedUser.id}`;
            if (parsedUser.email)
                return `email-${parsedUser.email.toLowerCase()}`;
        } catch {
            // fall through to anonymous scope
        }

        return 'anonymous';
    })();

    const orderHistoryKey = `order_history_${userStorageScope}`;
    const [orders, setOrders] = useLocalStorage<OrderHistoryItem[]>(
        orderHistoryKey,
        [],
    );

    const addOrder = (order: OrderHistoryItem) => {
        setOrders([order, ...orders]);
    };

    const updateOrderStatus = (orderId: string, newStatus: string) => {
        const updated = orders.map((order) =>
            order.id === orderId ? { ...order, status: newStatus } : order,
        );
        setOrders(updated);
    };

    const clearOrders = () => {
        setOrders([]);
    };

    return {
        orders,
        addOrder,
        updateOrderStatus,
        clearOrders,
    };
};
