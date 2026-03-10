import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auctionService } from '../services/api';
import type { BagAuctionItem } from '../types';

export const useWonAuctions = () => {
    const { authUser } = useAuth();
    const [wonAuctions, setWonAuctions] = useState<BagAuctionItem[]>([]);
    const [isLoadingWonAuctions, setIsLoadingWonAuctions] = useState(false);

    useEffect(() => {
        let isActive = true;

        if (!authUser) {
            setWonAuctions([]);
            setIsLoadingWonAuctions(false);
            return () => {
                isActive = false;
            };
        }

        setIsLoadingWonAuctions(true);

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
                if (isActive) {
                    setIsLoadingWonAuctions(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [authUser]);

    return {
        wonAuctions,
        wonAuctionCount: wonAuctions.length,
        isLoadingWonAuctions,
    };
};