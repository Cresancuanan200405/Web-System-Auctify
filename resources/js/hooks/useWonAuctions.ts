import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auctionService } from '../services/api';
import type { BagAuctionItem } from '../types';

export const useWonAuctions = () => {
    const { authUser } = useAuth();
    const authUserId = authUser?.id ?? null;
    const [wonAuctions, setWonAuctions] = useState<BagAuctionItem[]>([]);
    const [isLoadingWonAuctions, setIsLoadingWonAuctions] = useState(false);

    useEffect(() => {
        let isActive = true;

        if (!authUserId) {
            setWonAuctions([]);
            setIsLoadingWonAuctions(false);
            return () => {
                isActive = false;
            };
        }

        setIsLoadingWonAuctions(true);
        const failSafeTimeout = window.setTimeout(() => {
            if (isActive) {
                setIsLoadingWonAuctions(false);
            }
        }, 12000);

        void (async () => {
            try {
                const response = await auctionService.getWonAuctions();
                if (!isActive) {
                    return;
                }

                setWonAuctions(response.items);
            } catch {
                if (isActive) {
                    setWonAuctions([]);
                }
            } finally {
                window.clearTimeout(failSafeTimeout);
                if (isActive) {
                    setIsLoadingWonAuctions(false);
                }
            }
        })();

        return () => {
            isActive = false;
            window.clearTimeout(failSafeTimeout);
        };
    }, [authUserId]);

    return {
        wonAuctions,
        wonAuctionCount: wonAuctions.length,
        isLoadingWonAuctions,
    };
};
