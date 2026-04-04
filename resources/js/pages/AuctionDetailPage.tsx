import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { addSellerOrder, useOrderHistory } from '../hooks/useOrderHistory';
import { useWallet } from '../hooks/useWallet';
import { addressService, auctionService, orderService } from '../services/api';
import type {
    Address,
    AuctionMessage,
    AuctionProductDetail,
    WishlistItem,
} from '../types';
import {
    getAuctionDisplayStatus,
    parseAuctionTimestamp,
} from '../utils/auctionStatus';

interface AuctionDetailPageProps {
    auctionId: number;
    onNavigateHome: () => void;
    backBreadcrumbLabel?: string;
    disableSellerStoreLink?: boolean;
    onNavigateSellerDashboard: () => void;
    onNavigateToRegister: () => void;
    onNavigateToWishlist: () => void;
    onNavigateToSellerStore: (sellerId: number, sellerName?: string) => void;
}

export const AuctionDetailPage: React.FC<AuctionDetailPageProps> = ({
    auctionId,
    onNavigateHome,
    backBreadcrumbLabel = 'Home',
    disableSellerStoreLink = false,
    onNavigateSellerDashboard,
    onNavigateToRegister,
    onNavigateToWishlist,
    onNavigateToSellerStore,
}) => {
    const dashboardGracePeriodMs = 30 * 60 * 1000;
    const { authUser } = useAuth();
    const { walletBalance } = useWallet();
    const { orders, addOrder } = useOrderHistory();
    const [selectedAuction, setSelectedAuction] =
        useState<AuctionProductDetail | null>(null);
    const [auctionDetailLoading, setAuctionDetailLoading] = useState(true);
    const [auctionDetailError, setAuctionDetailError] = useState('');
    const [isBidDialogOpen, setIsBidDialogOpen] = useState(false);
    const [isFirstBidNoticeOpen, setIsFirstBidNoticeOpen] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');
    const [placingBid, setPlacingBid] = useState(false);
    const [wishlistPulseId, setWishlistPulseId] = useState<number | null>(null);
    const [hoveredMediaId, setHoveredMediaId] = useState<number | null>(null);
    const [imageZoomPosition, setImageZoomPosition] = useState({
        x: 50,
        y: 50,
    });
    const [now, setNow] = useState(() => Date.now());
    const [chatDraft, setChatDraft] = useState('');
    const [chatMessages, setChatMessages] = useState<AuctionMessage[]>([]);
    const [chatLoading, setChatLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [chatSaving, setChatSaving] = useState(false);
    const [markingRead, setMarkingRead] = useState(false);
    const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [addressLoading, setAddressLoading] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);
    const [checkoutError, setCheckoutError] = useState('');
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isOwnerActionMenuOpen, setIsOwnerActionMenuOpen] = useState(false);

    const wishlistKey = `wishlist_items_${authUser?.id ?? 'guest'}`;
    const [wishlistItems, setWishlistItems] = useLocalStorage<WishlistItem[]>(
        wishlistKey,
        [],
    );
    const canRenderPortal = typeof document !== 'undefined';

    const resolveMediaUrl = (url?: string) => {
        if (!url) {
            return '';
        }

        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(
            /\/$/,
            '',
        );
        if (!apiBase) {
            return url;
        }

        return `${apiBase}${url.startsWith('/') ? url : `/${url}`}`;
    };

    const formatPeso = (value?: string) => {
        const amount = Number(value ?? 0);
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDate = (value?: string | null) => {
        if (!value) {
            return '-';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const isInWishlist = (productId: number) =>
        wishlistItems.some((item) => item.id === productId);

    const getHighestBid = (auction: AuctionProductDetail) => {
        const bids = auction.bids ?? [];
        if (bids.length === 0) {
            return null;
        }

        return bids.reduce((highest, current) => {
            const currentAmount = Number(current.amount ?? 0);
            const highestAmount = Number(highest.amount ?? 0);
            return currentAmount > highestAmount ? current : highest;
        });
    };

    const mergeChatMessage = (
        messages: AuctionMessage[],
        nextMessage: AuctionMessage,
    ) => {
        const existingIndex = messages.findIndex(
            (item) => item.id === nextMessage.id,
        );
        if (existingIndex === -1) {
            return [...messages, nextMessage].sort(
                (a, b) =>
                    new Date(a.created_at ?? '').getTime() -
                    new Date(b.created_at ?? '').getTime(),
            );
        }

        const next = [...messages];
        next[existingIndex] = nextMessage;
        return next;
    };

    const sortChatMessages = (messages: AuctionMessage[]) => {
        return [...messages].sort(
            (a, b) =>
                new Date(a.created_at ?? '').getTime() -
                new Date(b.created_at ?? '').getTime(),
        );
    };

    const fetchAuctionDetail = async (productId: number) => {
        const detail = await auctionService.getProductDetails(productId);
        setSelectedAuction(detail);
    };

    useEffect(() => {
        let isActive = true;

        const load = async () => {
            setAuctionDetailLoading(true);
            setAuctionDetailError('');
            setSelectedAuction(null);
            setIsBidDialogOpen(false);
            setIsFirstBidNoticeOpen(false);
            setBidAmount('');
            setBidError('');

            try {
                const detail =
                    await auctionService.getProductDetails(auctionId);
                if (!isActive) {
                    return;
                }
                setSelectedAuction(detail);
            } catch {
                if (!isActive) {
                    return;
                }
                setAuctionDetailError(
                    'Unable to load auction details right now.',
                );
            } finally {
                if (isActive) {
                    setAuctionDetailLoading(false);
                }
            }
        };

        void load();

        return () => {
            isActive = false;
        };
    }, [auctionId]);

    useEffect(() => {
        setHoveredMediaId(null);
        setImageZoomPosition({ x: 50, y: 50 });
        setChatDraft('');
    }, [selectedAuction?.id]);

    useEffect(() => {
        let isActive = true;

        const loadMessages = async (isSilent = false) => {
            if (!isSilent && isActive) {
                setChatLoading(true);
            }

            try {
                const data = await auctionService.getMessages(auctionId);
                if (!isActive) {
                    return;
                }

                setChatMessages(sortChatMessages(data.messages));
                setUnreadCount(data.unread_count);
            } catch {
                if (isActive && !isSilent) {
                    setChatMessages([]);
                    setUnreadCount(0);
                }
            } finally {
                if (isActive && !isSilent) {
                    setChatLoading(false);
                }
            }
        };

        void loadMessages();
        const interval = window.setInterval(() => {
            void loadMessages(true);
        }, 5000);

        return () => {
            isActive = false;
            window.clearInterval(interval);
        };
    }, [auctionId]);

    useEffect(() => {
        if (!authUser) {
            return;
        }

        let isActive = true;
        let echoInstance: {
            leave: (channel: string) => void;
            disconnect: () => void;
        } | null = null;

        void (async () => {
            try {
                const reverbKey = import.meta.env.VITE_REVERB_APP_KEY?.trim();
                if (!reverbKey) {
                    return;
                }

                const echoModule = await import('../lib/echo');
                if (!isActive) {
                    return;
                }

                const echo = echoModule.createEchoConnection();
                echoInstance = echo;
                const channel = echo.private(`auction.${auctionId}`);

                channel.listen(
                    '.auction.message.created',
                    (event: { message: AuctionMessage }) => {
                        const nextMessage = {
                            ...event.message,
                            is_unread: event.message.user_id !== authUser.id,
                        };

                        setChatMessages((prev) =>
                            mergeChatMessage(prev, nextMessage),
                        );
                        if (event.message.user_id !== authUser.id) {
                            setUnreadCount((prev) => prev + 1);
                        }
                    },
                );

                channel.listen(
                    '.auction.message.updated',
                    (event: { message: AuctionMessage }) => {
                        setChatMessages((prev) =>
                            prev.map((message) =>
                                message.id === event.message.id
                                    ? {
                                          ...event.message,
                                          is_unread: message.is_unread,
                                      }
                                    : message,
                            ),
                        );
                    },
                );

                channel.listen(
                    '.auction.message.deleted',
                    (event: { message_id: number }) => {
                        setChatMessages((prev) => {
                            const removedMessage = prev.find(
                                (message) => message.id === event.message_id,
                            );
                            if (removedMessage?.is_unread) {
                                setUnreadCount((count) =>
                                    Math.max(0, count - 1),
                                );
                            }

                            return prev.filter(
                                (message) => message.id !== event.message_id,
                            );
                        });
                    },
                );
            } catch {
                // Keep the auction page usable even if realtime chat cannot initialize.
            }
        })();

        return () => {
            isActive = false;
            echoInstance?.leave(`private-auction.${auctionId}`);
            echoInstance?.disconnect();
        };
    }, [auctionId, authUser]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isCheckoutDialogOpen) {
            return;
        }

        if (!authUser) {
            setAddresses([]);
            return;
        }

        let isActive = true;
        setAddressLoading(true);

        void (async () => {
            try {
                const result = await addressService.getAddresses();
                if (!isActive) {
                    return;
                }

                setAddresses(result);
                setSelectedAddressId(
                    (current) => current || result[0]?.id || '',
                );
            } catch {
                if (isActive) {
                    setAddresses([]);
                }
            } finally {
                if (isActive) {
                    setAddressLoading(false);
                }
            }
        })();

        return () => {
            isActive = false;
        };
    }, [authUser, isCheckoutDialogOpen]);

    useEffect(() => {
        if (!isBidDialogOpen && !isCheckoutDialogOpen && !isFirstBidNoticeOpen) {
            return;
        }

        const { body } = document;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';

        return () => {
            body.style.overflow = previousOverflow;
        };
    }, [isBidDialogOpen, isCheckoutDialogOpen, isFirstBidNoticeOpen]);

    const minBidValue = selectedAuction
        ? Math.ceil(
              Math.max(
                  Number(selectedAuction.starting_price || 0),
                  Number(selectedAuction.current_price || 0),
              ),
          ) + Math.max(1, Math.ceil(Number(selectedAuction.max_increment || 0)))
        : 1;
    const currentBidBase = selectedAuction
        ? Math.max(
              Number(selectedAuction.starting_price || 0),
              Number(selectedAuction.current_price || 0),
          )
        : 0;
    const parsedBidAmount = Number(bidAmount);
    const hasValidBidAmount =
        Number.isFinite(parsedBidAmount) &&
        Number.isInteger(parsedBidAmount) &&
        parsedBidAmount > 0;
    const bidIncreaseAmount = hasValidBidAmount
        ? Math.max(0, parsedBidAmount - currentBidBase)
        : null;
    const isWalletEmpty = authUser ? walletBalance <= 0 : false;
    const hasEnoughBalanceForNextBid = authUser
        ? walletBalance >= minBidValue
        : true;
    const exceedsWalletBalance =
        hasValidBidAmount && parsedBidAmount > walletBalance;
    const highestBid = selectedAuction ? getHighestBid(selectedAuction) : null;

    const handlePlaceBid = async (options?: {
        acknowledgeAutoDeduct?: boolean;
    }) => {
        if (!selectedAuction || !authUser) {
            return;
        }

        const amount = Number(bidAmount);
        if (!Number.isInteger(amount)) {
            setBidError(
                'Bid amount must be a whole number. Decimals are not allowed.',
            );
            return;
        }

        if (!Number.isFinite(amount) || amount < minBidValue) {
            setBidError(
                `Bid must be at least ${formatPeso(String(minBidValue))}.`,
            );
            return;
        }

        if (amount > walletBalance) {
            setBidError(
                'Your wallet balance is not enough for this bid amount.',
            );
            return;
        }

        setPlacingBid(true);
        setBidError('');
        try {
            await auctionService.placeBid(selectedAuction.id, amount, {
                acknowledge_auto_deduct:
                    options?.acknowledgeAutoDeduct === true,
            });
            await fetchAuctionDetail(selectedAuction.id);
            setIsBidDialogOpen(false);
            setIsFirstBidNoticeOpen(false);
            setBidAmount('');
            toast.success(
                `Bid placed successfully at ${formatPeso(amount.toFixed(2))}.`,
                {
                    autoClose: 2600,
                },
            );
        } catch (error) {
            const responseData =
                typeof error === 'object' &&
                error !== null &&
                'response' in error
                    ? (error as { response?: { data?: { code?: string; message?: string } } }).response?.data
                    : undefined;

            if (responseData?.code === 'FIRST_BID_ACK_REQUIRED') {
                setIsFirstBidNoticeOpen(true);
                setBidError('');
                return;
            }

            const message =
                typeof responseData?.message === 'string'
                    ? responseData.message
                    : typeof error === 'object' &&
                        error !== null &&
                        'message' in error &&
                        typeof (error as { message?: unknown }).message ===
                            'string'
                      ? (error as { message: string }).message
                    : 'Failed to place bid.';
            setBidError(message);
        } finally {
            setPlacingBid(false);
        }
    };

    const handleMediaHover = (
        event: React.MouseEvent<HTMLDivElement>,
        mediaId: number,
    ) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width) * 100;
        const y = ((event.clientY - bounds.top) / bounds.height) * 100;

        setHoveredMediaId(mediaId);
        setImageZoomPosition({
            x: Math.max(0, Math.min(100, x)),
            y: Math.max(0, Math.min(100, y)),
        });
    };

    const toggleWishlistFromDetail = (auction: AuctionProductDetail) => {
        if (!authUser) {
            onNavigateToWishlist();
            return;
        }

        if (authUser.id === auction.user?.id) {
            return;
        }

        const isClosed = getAuctionDisplayStatus(auction) === 'closed';
        const exists = isInWishlist(auction.id);
        if (exists) {
            setWishlistItems(
                wishlistItems.filter((item) => item.id !== auction.id),
            );
            toast.info('Removed from wishlist.', { autoClose: 2200 });
            return;
        }

        if (isClosed) {
            toast.info('Closed auctions cannot be added to wishlist.');
            return;
        }

        const firstMedia = auction.media?.[0];
        const entry: WishlistItem = {
            id: auction.id,
            title: auction.title,
            category: auction.category,
            subcategory: auction.subcategory,
            price: auction.current_price || auction.starting_price,
            mediaUrl: resolveMediaUrl(firstMedia?.url),
            mediaType: firstMedia?.media_type,
        };

        setWishlistItems([...wishlistItems, entry]);
        toast.success('Added to wishlist.', { autoClose: 2200 });
        setWishlistPulseId(auction.id);
        window.setTimeout(() => {
            setWishlistPulseId((prev) => (prev === auction.id ? null : prev));
        }, 260);
    };

    const handleMarkChatRead = () => {
        if (!authUser || unreadCount === 0 || markingRead) {
            return;
        }

        setMarkingRead(true);
        void (async () => {
            try {
                await auctionService.markMessagesRead(auctionId);
                setChatMessages((prev) =>
                    prev.map((message) => ({ ...message, is_unread: false })),
                );
                setUnreadCount(0);
            } finally {
                setMarkingRead(false);
            }
        })();
    };

    const handleSendChatMessage = () => {
        if (!authUser || !selectedAuction) {
            return;
        }

        const status = getAuctionDisplayStatus(selectedAuction, Date.now());

        if (status === 'closed') {
            toast.info(
                'Comments are no longer available because this auction is already closed.',
                { autoClose: 2200 },
            );
            return;
        }

        if (status === 'scheduled') {
            toast.info('Comments will open once this auction starts.', {
                autoClose: 2200,
            });
            return;
        }

        const text = chatDraft.trim();
        if (!text) {
            return;
        }

        setChatSaving(true);
        void (async () => {
            try {
                const createdMessage = await auctionService.postMessage(
                    selectedAuction.id,
                    text,
                );
                setChatMessages((prev) =>
                    mergeChatMessage(prev, {
                        ...createdMessage,
                        is_unread: false,
                    }),
                );
                setChatDraft('');
            } catch (error) {
                const message =
                    typeof error === 'object' &&
                    error !== null &&
                    'message' in error &&
                    typeof (error as { message?: unknown }).message === 'string'
                        ? (error as { message: string }).message
                        : 'Unable to send chat message right now.';
                toast.error(message);
            } finally {
                setChatSaving(false);
            }
        })();
    };

    const shopName =
        selectedAuction?.user?.seller_registration?.shop_name?.trim() ||
        selectedAuction?.user?.name ||
        'Unknown Seller';
    const startsAtTime = parseAuctionTimestamp(
        selectedAuction?.starts_at ?? null,
    );
    const endsAtTime = parseAuctionTimestamp(selectedAuction?.ends_at ?? null);
    const displayStatus = selectedAuction
        ? getAuctionDisplayStatus(selectedAuction, now)
        : 'closed';
    const isScheduled = displayStatus === 'scheduled';
    const isClosed = displayStatus === 'closed';
    const isEndedByTime = Boolean(endsAtTime && endsAtTime <= now);
    const isCommentsOpen = !isClosed;
    const canComment = !isScheduled && !isClosed;
    const isOwnAuction = Boolean(
        authUser && selectedAuction && authUser.id === selectedAuction.user?.id,
    );
    const isWishlistDisabled = Boolean(
        selectedAuction && isClosed && !isInWishlist(selectedAuction.id),
    );
    const dashboardDisappearanceTime = endsAtTime
        ? endsAtTime + dashboardGracePeriodMs
        : null;
    const isVisibleOnDashboard =
        !isEndedByTime ||
        Boolean(dashboardDisappearanceTime && dashboardDisappearanceTime > now);
    const walletBidNotice = !authUser
        ? ''
        : isWalletEmpty
                    ? 'Your wallet balance is empty. Add funds before placing a bid.'
          : !hasEnoughBalanceForNextBid
            ? 'Your wallet balance is not enough to bid any longer on this auction. Add funds to continue bidding.'
            : '';
    const canPlaceBid =
        !isClosed && !isOwnAuction && !isScheduled && !walletBidNotice;
    const finalWinner = isClosed ? highestBid : null;
    const isWinningBidder = Boolean(
        authUser && finalWinner && authUser.id === finalWinner.user_id,
    );
    const hasCompletedOrder = Boolean(
        selectedAuction &&
        orders.some((order) => order.auction_id === selectedAuction.id),
    );

    const orderedAuctionMedia = useMemo(() => {
        const media = selectedAuction?.media ?? [];
        return [...media].sort((left, right) => {
            const leftIsVideo = left.media_type === 'video';
            const rightIsVideo = right.media_type === 'video';

            if (leftIsVideo === rightIsVideo) {
                return 0;
            }

            return leftIsVideo ? -1 : 1;
        });
    }, [selectedAuction?.media]);

    const primaryMedia = orderedAuctionMedia[0];

    const formatAddress = (address: Address) => {
        return [
            `${address.first_name} ${address.last_name}`.trim(),
            address.street_address,
            address.barangay,
            address.city,
            address.province,
            address.region,
        ]
            .filter(Boolean)
            .join(', ');
    };

    const formatAddressOptionLabel = (address: Address) => {
        const shortAddress = [
            address.street_address,
            address.city,
            address.province,
        ]
            .filter(Boolean)
            .join(', ');
        return compactLabel(shortAddress, 44);
    };

    const compactLabel = (value: string, max = 72) => {
        const normalized = value.replace(/\s+/g, ' ').trim();
        if (normalized.length <= max) {
            return normalized;
        }

        return `${normalized.slice(0, max - 3)}...`;
    };

    const selectedAddress =
        addresses.find((address) => address.id === selectedAddressId) ?? null;
    const checkoutAmount = Number(finalWinner?.amount ?? 0);
    const selectedAddressPreview = selectedAddress
        ? formatAddress(selectedAddress)
        : 'No delivery address selected yet.';

    const handleOpenCheckoutDialog = () => {
        setCheckoutError('');
        setIsAddressConfirmed(false);
        setIsCheckoutDialogOpen(true);
    };

    const handleConfirmCheckout = () => {
        if (!selectedAuction || !finalWinner) {
            return;
        }

        const selectedAddress = addresses.find(
            (address) => address.id === selectedAddressId,
        );
        const totalAmount = Number(finalWinner.amount ?? 0);

        if (!selectedAddress) {
            setCheckoutError('Select a delivery address before checkout.');
            return;
        }

        if (!isAddressConfirmed) {
            setCheckoutError(
                'Confirm the selected delivery address before submitting your order.',
            );
            return;
        }

        setIsCheckingOut(true);

        const bidWinnerId = selectedAuction.bid_winner?.id;
        if (!bidWinnerId) {
            setCheckoutError('Unable to confirm checkout because the winning bid record is missing.');
            setIsCheckingOut(false);
            return;
        }


        void (async () => {
            try {
                const response = await orderService.createFromBidWinner({
                    bid_winner_id: bidWinnerId,
                    shipping_address_id: Number(selectedAddressId),
                    subtotal_amount: totalAmount,
                    shipping_fee: 0,
                    service_fee: 0,
                    total_amount: totalAmount,
                    capture_payment: true,
                    payment: {
                        method: 'wallet',
                        provider: 'Auctify Wallet',
                        provider_reference: `auction-${selectedAuction.id}-${Date.now()}`,
                        status: 'paid',
                        amount: totalAmount,
                        currency: 'PHP',
                    },
                    meta: {
                        address_summary: formatAddress(selectedAddress),
                        media_url: resolveMediaUrl(primaryMedia?.url),
                    },
                });

                const createdOrder = response.order;
                const createdShipping = createdOrder.shipping_address;
                const createdAddressSummary = [
                    createdShipping?.first_name && createdShipping?.last_name
                        ? `${createdShipping.first_name} ${createdShipping.last_name}`
                        : '',
                    createdShipping?.street_address,
                    createdShipping?.barangay,
                    createdShipping?.city,
                    createdShipping?.province,
                    createdShipping?.region,
                ]
                    .filter(Boolean)
                    .join(', ');
                const createdMedia =
                    createdOrder.auction?.media?.[0] ?? primaryMedia;
                const sellerName =
                    createdOrder.seller?.name ||
                    selectedAuction.user?.seller_registration?.shop_name?.trim() ||
                    selectedAuction.user?.name ||
                    'Unknown Seller';

                addOrder({
                    id: String(createdOrder.id),
                    auction_id: createdOrder.auction_id,
                    title: createdOrder.auction?.title ?? selectedAuction.title,
                    category:
                        createdOrder.auction?.category ?? selectedAuction.category,
                    subcategory:
                        createdOrder.auction?.subcategory ?? selectedAuction.subcategory,
                    seller_user_id:
                        createdOrder.seller?.id ??
                        selectedAuction.user?.id ??
                        selectedAuction.user_id,
                    seller_name: sellerName,
                    seller_shop_name: sellerName,
                    buyer_user_id: createdOrder.buyer?.id ?? authUser?.id,
                    buyer_name: createdOrder.buyer?.name ?? authUser?.name,
                    buyer_email:
                        createdOrder.buyer?.email ?? authUser?.email,
                    amount_paid: String(createdOrder.total_amount ?? totalAmount),
                    status: 'processing',
                    address_summary:
                        createdAddressSummary || formatAddress(selectedAddress),
                    payment_card_label:
                        createdOrder.payments?.[0]?.method?.toUpperCase() ||
                        'Auctify Wallet',
                    media_url: resolveMediaUrl(createdMedia?.url),
                    media_type: createdMedia?.media_type,
                    purchased_at:
                        createdOrder.placed_at ??
                        createdOrder.created_at ??
                        new Date().toISOString(),
                });

                if ((createdOrder.seller?.id ?? selectedAuction.user?.id ?? selectedAuction.user_id) > 0) {
                    addSellerOrder(
                        createdOrder.seller?.id ?? selectedAuction.user?.id ?? selectedAuction.user_id,
                        {
                            id: String(createdOrder.id),
                            auction_id: createdOrder.auction_id,
                            title:
                                createdOrder.auction?.title ??
                                selectedAuction.title,
                            category:
                                createdOrder.auction?.category ??
                                selectedAuction.category,
                            subcategory:
                                createdOrder.auction?.subcategory ??
                                selectedAuction.subcategory,
                            seller_user_id:
                                createdOrder.seller?.id ??
                                selectedAuction.user?.id ??
                                selectedAuction.user_id,
                            seller_name: sellerName,
                            seller_shop_name: sellerName,
                            buyer_user_id: createdOrder.buyer?.id ?? authUser?.id,
                            buyer_name:
                                createdOrder.buyer?.name ?? authUser?.name,
                            buyer_email:
                                createdOrder.buyer?.email ?? authUser?.email,
                            amount_paid: String(createdOrder.total_amount ?? totalAmount),
                            status: 'processing',
                            address_summary:
                                createdAddressSummary ||
                                formatAddress(selectedAddress),
                            payment_card_label:
                                createdOrder.payments?.[0]?.method?.toUpperCase() ||
                                'Auctify Wallet',
                            media_url: resolveMediaUrl(createdMedia?.url),
                            media_type: createdMedia?.media_type,
                            purchased_at:
                                createdOrder.placed_at ??
                                createdOrder.created_at ??
                                new Date().toISOString(),
                        },
                    );
                }

                setCheckoutError('');
                setIsCheckoutDialogOpen(false);
                toast.success(
                    'Checkout complete. Your order is now queued for seller fulfillment.',
                    { autoClose: 2800 },
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Unable to create order from the winning bid.';
                setCheckoutError(message);
                toast.error(message);
            } finally {
                setIsCheckingOut(false);
            }
        })();
    };

    const formatCountdown = (targetTime: number | null) => {
        if (!targetTime) {
            return '--';
        }

        const diff = Math.max(0, targetTime - now);
        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }

        return `${minutes}m ${seconds}s`;
    };

    const liveStatusLabel = isClosed
        ? 'Closed'
        : isScheduled
          ? 'Scheduled'
          : 'Live';

    return (
        <main className="content auction-page-content">
            <div className="auction-page-shell">
                <div className="page-breadcrumb">
                    <button type="button" onClick={onNavigateHome}>
                        {backBreadcrumbLabel}
                    </button>
                    <span>›</span>
                    <span>Auction</span>
                    <span>›</span>
                    <span className="page-breadcrumb-current">
                        {selectedAuction?.title || `#${auctionId}`}
                    </span>
                </div>

                {auctionDetailLoading && (
                    <p className="auction-detail-state">
                        Loading auction details...
                    </p>
                )}
                {!auctionDetailLoading && auctionDetailError && (
                    <p className="auction-detail-state auction-detail-state-error">
                        {auctionDetailError}
                    </p>
                )}

                {!auctionDetailLoading && selectedAuction && (
                    <div className="auction-detail-layout">
                        <section className="auction-detail-gallery">
                            <div
                                className="auction-detail-media-strip"
                                role="list"
                                aria-label="Product media gallery"
                            >
                                {orderedAuctionMedia.map((media) => {
                                    const mediaUrl = resolveMediaUrl(media.url);
                                    const isHovered =
                                        hoveredMediaId === media.id;

                                    return (
                                        <div
                                            key={media.id}
                                            className="auction-detail-media-panel"
                                            role="listitem"
                                        >
                                            {media.media_type === 'video' ? (
                                                <video
                                                    className="auction-detail-featured auction-detail-featured-video"
                                                    src={mediaUrl}
                                                    controls
                                                    preload="metadata"
                                                />
                                            ) : (
                                                <div
                                                    className="auction-detail-featured-stage"
                                                    onMouseEnter={() =>
                                                        setHoveredMediaId(
                                                            media.id,
                                                        )
                                                    }
                                                    onMouseMove={(event) =>
                                                        handleMediaHover(
                                                            event,
                                                            media.id,
                                                        )
                                                    }
                                                    onMouseLeave={() =>
                                                        setHoveredMediaId(null)
                                                    }
                                                >
                                                    <img
                                                        className={`auction-detail-featured auction-detail-featured-image ${isHovered ? 'is-zoomed' : ''}`}
                                                        src={mediaUrl}
                                                        alt={
                                                            selectedAuction.title
                                                        }
                                                        style={{
                                                            transformOrigin: `${imageZoomPosition.x}% ${imageZoomPosition.y}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <aside className="auction-detail-info">
                            <p className="auction-detail-category">
                                {selectedAuction.category || 'General'}
                            </p>
                            <div className="auction-detail-title-row">
                                <h3 className="auction-detail-title">
                                    {selectedAuction.title}
                                </h3>
                                <div className="auction-detail-title-actions">
                                    {isOwnAuction && (
                                        <div className="auction-detail-owner-actions">
                                            <button
                                                type="button"
                                                className="seller-kebab-btn"
                                                aria-label="Open product actions"
                                                onClick={() =>
                                                    setIsOwnerActionMenuOpen(
                                                        (prev) => !prev,
                                                    )
                                                }
                                            >
                                                ⋮
                                            </button>
                                            {isOwnerActionMenuOpen && (
                                                <div className="seller-kebab-menu">
                                                    <button
                                                        type="button"
                                                        className="seller-kebab-item"
                                                        onClick={() => {
                                                            setIsOwnerActionMenuOpen(
                                                                false,
                                                            );
                                                            onNavigateSellerDashboard();
                                                        }}
                                                    >
                                                        Edit in Dashboard
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {!isOwnAuction && (
                                        <button
                                            type="button"
                                            className={`auction-detail-wishlist-btn ${isInWishlist(selectedAuction.id) ? 'active' : ''} ${wishlistPulseId === selectedAuction.id ? 'pulse' : ''}`}
                                            aria-label={
                                                isWishlistDisabled
                                                    ? 'Closed auction cannot be wishlisted'
                                                    : 'Toggle wishlist'
                                            }
                                            disabled={isWishlistDisabled}
                                            onClick={() =>
                                                toggleWishlistFromDetail(
                                                    selectedAuction,
                                                )
                                            }
                                        >
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                stroke="currentColor"
                                                strokeWidth="1.7"
                                            >
                                                <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="auction-detail-seller-row">
                                <p className="auction-detail-seller">
                                    Shop:{' '}
                                    {selectedAuction.user?.id &&
                                    !disableSellerStoreLink ? (
                                        <button
                                            type="button"
                                            className="auction-detail-seller-link"
                                            onClick={() =>
                                                onNavigateToSellerStore(
                                                    selectedAuction.user!.id,
                                                    shopName,
                                                )
                                            }
                                        >
                                            {shopName}
                                        </button>
                                    ) : (
                                        <span>{shopName}</span>
                                    )}
                                </p>
                            </div>

                            <div className="auction-owner-bidder-box">
                                <p className="auction-owner-bidder-title">
                                    Owner
                                </p>
                                <p className="auction-owner-bidder-value">
                                    {shopName}
                                </p>
                                <p className="auction-owner-bidder-sub">
                                    {selectedAuction.user?.email ||
                                        'No email available'}
                                </p>

                                <p className="auction-owner-bidder-title">
                                    Bidder
                                </p>
                                {(() => {
                                    if (!highestBid) {
                                        return (
                                            <p className="auction-owner-bidder-sub">
                                                No bids yet.
                                            </p>
                                        );
                                    }

                                    return (
                                        <>
                                            <p className="auction-owner-bidder-value">
                                                {highestBid.user?.name ||
                                                    `User #${highestBid.user_id}`}
                                            </p>
                                            <p className="auction-owner-bidder-sub">
                                                Highest bid:{' '}
                                                {formatPeso(highestBid.amount)}
                                            </p>
                                        </>
                                    );
                                })()}

                                {selectedAuction.bids &&
                                    selectedAuction.bids.length > 0 && (
                                        <div className="auction-bidder-list">
                                            <p className="auction-bidder-list-title">
                                                Recent bids
                                            </p>
                                            {selectedAuction.bids
                                                .slice(0, 5)
                                                .map((bid) => (
                                                    <div
                                                        key={bid.id}
                                                        className="auction-bidder-item"
                                                    >
                                                        <span>
                                                            {bid.user?.name ||
                                                                `User #${bid.user_id}`}
                                                        </span>
                                                        <span>
                                                            {formatPeso(
                                                                bid.amount,
                                                            )}
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                {isClosed && (
                                    <div
                                        className={`auction-final-winner-card ${finalWinner ? 'has-winner' : 'no-winner'}`}
                                    >
                                        <p className="auction-final-winner-label">
                                            Final Winner
                                        </p>
                                        {finalWinner ? (
                                            <>
                                                <p className="auction-final-winner-name">
                                                    {finalWinner.user?.name ||
                                                        `User #${finalWinner.user_id}`}
                                                </p>
                                                <p className="auction-final-winner-amount">
                                                    Winning bid:{' '}
                                                    {formatPeso(
                                                        finalWinner.amount,
                                                    )}
                                                </p>
                                                {isWinningBidder && (
                                                    <button
                                                        type="button"
                                                        className="auction-detail-cta auction-detail-checkout-btn"
                                                        onClick={
                                                            handleOpenCheckoutDialog
                                                        }
                                                        disabled={
                                                            hasCompletedOrder
                                                        }
                                                    >
                                                        {hasCompletedOrder
                                                            ? 'Purchased'
                                                            : 'Checkout'}
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <p className="auction-final-winner-empty">
                                                This auction ended without any
                                                winning bid.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <p className="auction-detail-price">
                                Current Price:{' '}
                                {formatPeso(
                                    selectedAuction.current_price ||
                                        selectedAuction.starting_price,
                                )}
                            </p>
                            <div className="auction-detail-timing-card">
                                <div className="auction-detail-timing-head">
                                    <span
                                        className={`auction-detail-timing-badge auction-detail-timing-badge-${liveStatusLabel.toLowerCase()}`}
                                    >
                                        {liveStatusLabel}
                                    </span>
                                    <span className="auction-detail-timing-note">
                                        Updates in real time
                                    </span>
                                </div>
                                <div className="auction-detail-timing-grid">
                                    <div className="auction-detail-timing-item">
                                        <p className="auction-detail-timing-label">
                                            Starts in
                                        </p>
                                        <p className="auction-detail-timing-value">
                                            {isScheduled
                                                ? formatCountdown(startsAtTime)
                                                : 'Started'}
                                        </p>
                                    </div>
                                    <div className="auction-detail-timing-item">
                                        <p className="auction-detail-timing-label">
                                            Ends in
                                        </p>
                                        <p className="auction-detail-timing-value">
                                            {isClosed
                                                ? 'Ended'
                                                : formatCountdown(endsAtTime)}
                                        </p>
                                    </div>
                                    {isEndedByTime &&
                                        dashboardDisappearanceTime && (
                                            <div className="auction-detail-timing-item auction-detail-timing-item-expiry">
                                                <p className="auction-detail-timing-label">
                                                    Dashboard visibility
                                                </p>
                                                <p className="auction-detail-timing-value">
                                                    {isVisibleOnDashboard
                                                        ? formatCountdown(
                                                              dashboardDisappearanceTime,
                                                          )
                                                        : 'Removed'}
                                                </p>
                                            </div>
                                        )}
                                </div>
                            </div>
                            {isEndedByTime &&
                                dashboardDisappearanceTime &&
                                isVisibleOnDashboard && (
                                    <p className="auction-detail-expiry-note">
                                        This auction will disappear from the
                                        Auctify dashboard in{' '}
                                        {formatCountdown(
                                            dashboardDisappearanceTime,
                                        )}
                                        .
                                    </p>
                                )}
                            <p className="auction-detail-meta">
                                Starting Price:{' '}
                                {formatPeso(selectedAuction.starting_price)}
                            </p>
                            <p className="auction-detail-meta">
                                Maximum Increment:{' '}
                                {formatPeso(selectedAuction.max_increment)}
                            </p>
                            <p className="auction-detail-meta">
                                Starts At:{' '}
                                {formatDate(selectedAuction.starts_at ?? null)}
                            </p>
                            <p className="auction-detail-meta">
                                Ends At: {formatDate(selectedAuction.ends_at)}
                            </p>
                            <p className="auction-detail-meta">
                                Status: {liveStatusLabel}
                            </p>
                            <p className="auction-detail-meta">
                                Total Bids:{' '}
                                {selectedAuction.bids_count ??
                                    selectedAuction.bids?.length ??
                                    0}
                            </p>
                            {authUser && (
                                <>
                                    <p className="auction-detail-meta">
                                        Wallet Balance:{' '}
                                        {formatPeso(walletBalance.toFixed(2))}
                                    </p>
                                    {walletBidNotice && (
                                        <p className="auction-detail-wallet-note">
                                            {walletBidNotice}
                                        </p>
                                    )}
                                </>
                            )}

                            <div className="auction-detail-description-wrap">
                                <p className="auction-detail-description-title">
                                    Description
                                </p>
                                <p className="auction-detail-description">
                                    {selectedAuction.description?.trim() ||
                                        'No description provided.'}
                                </p>
                            </div>

                            {authUser ? (
                                <button
                                    type="button"
                                    className="auction-detail-cta"
                                    onClick={() => {
                                        if (isOwnAuction || !canPlaceBid) {
                                            return;
                                        }
                                        setBidAmount(String(minBidValue));
                                        setBidError('');
                                        setIsBidDialogOpen(true);
                                    }}
                                    disabled={!canPlaceBid}
                                >
                                    {isClosed
                                        ? 'Auction Closed'
                                        : isScheduled
                                          ? 'Starts Soon'
                                          : isOwnAuction
                                            ? 'Your Product'
                                            : isWalletEmpty
                                              ? 'Wallet Empty'
                                              : !hasEnoughBalanceForNextBid
                                                ? 'Insufficient Balance'
                                                : 'Place Bid'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="auction-detail-cta"
                                    onClick={onNavigateToRegister}
                                >
                                    Sign in to Bid
                                </button>
                            )}
                        </aside>
                    </div>
                )}

                {!auctionDetailLoading && selectedAuction && isCommentsOpen && (
                    <section
                        className="auction-chat-card"
                        aria-label="Auction live chat"
                    >
                        <div className="auction-chat-head">
                            <div>
                                <p className="auction-chat-kicker">Live chat</p>
                                <h3 className="auction-chat-title">
                                    Comments for this auction
                                </h3>
                            </div>
                            <div className="auction-chat-head-meta">
                                <span className="auction-chat-count">
                                    {chatMessages.length} message
                                    {chatMessages.length === 1 ? '' : 's'}
                                </span>
                                {authUser && unreadCount > 0 && (
                                    <button
                                        type="button"
                                        className="auction-chat-unread-badge"
                                        onClick={handleMarkChatRead}
                                        disabled={markingRead}
                                    >
                                        {markingRead
                                            ? 'Marking...'
                                            : `${unreadCount} unread`}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="auction-chat-messages">
                            {chatMessages.length === 0 ? (
                                <div className="auction-chat-empty">
                                    {chatLoading
                                        ? 'Loading auction conversation...'
                                        : 'Start the conversation about this product. Buyers and the seller can comment here.'}
                                </div>
                            ) : (
                                chatMessages.map((message) => {
                                    const isSellerMessage =
                                        message.user_id ===
                                        selectedAuction.user?.id;
                                    const authorName =
                                        message.user?.name ||
                                        `User #${message.user_id}`;

                                    return (
                                        <article
                                            key={message.id}
                                            className={`auction-chat-message ${isSellerMessage ? 'seller' : 'buyer'} ${message.is_unread ? 'is-unread' : ''}`}
                                        >
                                            <div className="auction-chat-message-meta">
                                                <span className="auction-chat-message-name">
                                                    {authorName}
                                                </span>
                                                <span
                                                    className={`auction-chat-message-role auction-chat-message-role-${isSellerMessage ? 'seller' : 'buyer'}`}
                                                >
                                                    {isSellerMessage
                                                        ? 'seller'
                                                        : 'buyer'}
                                                </span>
                                                {message.is_unread && (
                                                    <span className="auction-chat-message-unread">
                                                        Unread
                                                    </span>
                                                )}
                                                <span className="auction-chat-message-time">
                                                    {formatDate(
                                                        message.created_at,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="auction-chat-message-text">
                                                {message.message}
                                            </p>
                                        </article>
                                    );
                                })
                            )}
                        </div>

                        {authUser ? (
                            canComment ? (
                                <div className="auction-chat-compose">
                                    <textarea
                                        className="auction-chat-input"
                                        placeholder={
                                            authUser.id ===
                                            selectedAuction.user?.id
                                                ? 'Reply to buyers about this product...'
                                                : 'Ask the seller or comment on the auction...'
                                        }
                                        value={chatDraft}
                                        onChange={(event) =>
                                            setChatDraft(event.target.value)
                                        }
                                        rows={3}
                                    />
                                    <div className="auction-chat-compose-row">
                                        <p className="auction-chat-compose-note">
                                            {authUser.id ===
                                            selectedAuction.user?.id
                                                ? 'Posting as seller'
                                                : 'Posting as bidder'}
                                        </p>
                                        <button
                                            type="button"
                                            className="auction-chat-send"
                                            onClick={handleSendChatMessage}
                                            disabled={
                                                !chatDraft.trim() || chatSaving
                                            }
                                        >
                                            {chatSaving
                                                ? 'Sending...'
                                                : 'Send comment'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="auction-chat-signin-note">
                                    Comments will be available once this auction
                                    starts.
                                </p>
                            )
                        ) : (
                            <p className="auction-chat-signin-note">
                                Sign in to join the live chat for this auction.
                            </p>
                        )}
                    </section>
                )}

                {selectedAuction &&
                    authUser &&
                    isBidDialogOpen &&
                    canRenderPortal &&
                    createPortal(
                        <div
                            className="auction-bid-dialog-backdrop"
                            onClick={() => setIsBidDialogOpen(false)}
                            role="presentation"
                        >
                            <div
                                className="auction-bid-dialog"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Place a bid"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <h4 className="auction-bid-title">
                                    Place your bid
                                </h4>
                                <p className="auction-bid-subtitle">
                                    Enter your amount and review how much you
                                    are adding above the current price.
                                </p>

                                <div className="auction-bid-summary-grid">
                                    <div className="auction-bid-summary-card">
                                        <p className="auction-bid-summary-label">
                                            Current amount
                                        </p>
                                        <p className="auction-bid-summary-value">
                                            {formatPeso(
                                                currentBidBase.toFixed(2),
                                            )}
                                        </p>
                                    </div>
                                    <div className="auction-bid-summary-card auction-bid-summary-card-accent">
                                        <p className="auction-bid-summary-label">
                                            Minimum next bid
                                        </p>
                                        <p className="auction-bid-summary-value">
                                            {formatPeso(minBidValue.toFixed(2))}
                                        </p>
                                    </div>
                                </div>

                                <label
                                    className="auction-bid-input-label"
                                    htmlFor="auction-bid-amount"
                                >
                                    Your bid
                                </label>

                                <input
                                    id="auction-bid-amount"
                                    type="number"
                                    min={String(minBidValue)}
                                    step="1"
                                    className="auction-bid-input"
                                    value={bidAmount}
                                    onChange={(event) =>
                                        setBidAmount(event.target.value)
                                    }
                                />

                                <div
                                    className="auction-bid-live-box"
                                    aria-live="polite"
                                >
                                    <div className="auction-bid-live-row">
                                        <span className="auction-bid-live-label">
                                            Your bid
                                        </span>
                                        <span className="auction-bid-live-value">
                                            {hasValidBidAmount
                                                ? formatPeso(
                                                      parsedBidAmount.toFixed(
                                                          2,
                                                      ),
                                                  )
                                                : '--'}
                                        </span>
                                    </div>
                                    <div className="auction-bid-live-row">
                                        <span className="auction-bid-live-label">
                                            Increase from current
                                        </span>
                                        <span className="auction-bid-live-value auction-bid-live-value-accent">
                                            {bidIncreaseAmount !== null
                                                ? formatPeso(
                                                      bidIncreaseAmount.toFixed(
                                                          2,
                                                      ),
                                                  )
                                                : '--'}
                                        </span>
                                    </div>
                                </div>

                                <div className="auction-bid-wallet-note-wrap">
                                    <p className="auction-bid-wallet-balance">
                                        Available wallet balance:{' '}
                                        {formatPeso(walletBalance.toFixed(2))}
                                    </p>
                                    {exceedsWalletBalance && (
                                        <p className="auction-bid-wallet-note">
                                            Your balance is not enough to
                                            continue bidding at this amount.
                                            Lower your bid or add more funds to
                                            your wallet.
                                        </p>
                                    )}
                                </div>

                                {bidError && (
                                    <p className="auction-bid-error">
                                        {bidError}
                                    </p>
                                )}

                                <div className="auction-bid-actions">
                                    <button
                                        type="button"
                                        className="auction-bid-cancel"
                                        onClick={() =>
                                            setIsBidDialogOpen(false)
                                        }
                                        disabled={placingBid}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="auction-bid-submit"
                                        onClick={() => {
                                            void handlePlaceBid();
                                        }}
                                        disabled={
                                            placingBid || exceedsWalletBalance
                                        }
                                    >
                                        {placingBid
                                            ? 'Placing...'
                                            : 'Confirm Bid'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )}

                {selectedAuction &&
                    authUser &&
                    isCheckoutDialogOpen &&
                    finalWinner &&
                    canRenderPortal &&
                    createPortal(
                        <div
                            className="bag-checkout-overlay auction-checkout-overlay"
                            onClick={() =>
                                !isCheckingOut && setIsCheckoutDialogOpen(false)
                            }
                            role="presentation"
                        >
                            <div
                                className="bag-checkout-dialog auction-checkout-dialog"
                                role="dialog"
                                aria-modal="true"
                                aria-label="Complete purchase"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="bag-checkout-head">
                                    <div>
                                        <p className="bag-checkout-kicker">
                                            Secure Checkout
                                        </p>
                                        <h2 className="bag-checkout-title">
                                            Complete your purchase
                                        </h2>
                                    </div>
                                    <button
                                        type="button"
                                        className="bag-checkout-close"
                                        onClick={() =>
                                            setIsCheckoutDialogOpen(false)
                                        }
                                        disabled={isCheckingOut}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="bag-checkout-body">
                                    <div className="bag-checkout-summary">
                                        <p className="bag-checkout-item-title">
                                            {selectedAuction.title}
                                        </p>
                                        <p className="bag-checkout-item-meta">
                                            Winning total:{' '}
                                            {formatPeso(finalWinner.amount)}
                                        </p>
                                    </div>

                                    <div
                                        className="auction-checkout-info"
                                        aria-label="Purchase details"
                                    >
                                        <div className="auction-checkout-info-row">
                                            <span>Seller</span>
                                            <strong>{shopName}</strong>
                                        </div>
                                        <div className="auction-checkout-info-row">
                                            <span>Auction ID</span>
                                            <strong>
                                                #{selectedAuction.id}
                                            </strong>
                                        </div>
                                        <p className="auction-checkout-info-note">
                                            Make sure your delivery address is
                                            correct. Wallet payment for winning
                                            bids is deducted automatically when
                                            the auction closes.
                                        </p>
                                    </div>

                                    <label className="bag-checkout-label">
                                        Delivery address
                                        <select
                                            value={selectedAddressId}
                                            onChange={(event) => {
                                                setSelectedAddressId(
                                                    event.target.value,
                                                );
                                                setIsAddressConfirmed(false);
                                                setCheckoutError('');
                                            }}
                                            disabled={
                                                addressLoading || isCheckingOut
                                            }
                                        >
                                            <option value="">
                                                Select an address
                                            </option>
                                            {addresses.map((address) => (
                                                <option
                                                    key={address.id}
                                                    value={address.id}
                                                >
                                                    {formatAddressOptionLabel(
                                                        address,
                                                    )}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="bag-checkout-field-preview">
                                            {selectedAddressPreview}
                                        </p>
                                    </label>
                                    <label className="bag-checkout-confirm-label">
                                        <input
                                            type="checkbox"
                                            checked={isAddressConfirmed}
                                            onChange={(event) => {
                                                setIsAddressConfirmed(
                                                    event.target.checked,
                                                );
                                                setCheckoutError('');
                                            }}
                                            disabled={isCheckingOut || !selectedAddressId}
                                        />
                                        <span>
                                            I confirm this delivery address is correct and can be shared with the seller.
                                        </span>
                                    </label>

                                    <div
                                        className="checkout-deduction-box"
                                        aria-live="polite"
                                    >
                                        <div className="checkout-deduction-row">
                                            <span>Winning amount</span>
                                            <strong>
                                                {formatPeso(
                                                    checkoutAmount.toFixed(2),
                                                )}
                                            </strong>
                                        </div>
                                        <div className="checkout-deduction-row">
                                            <span>Wallet deduction</span>
                                            <strong>
                                                {selectedAuction.bid_winner
                                                    ?.wallet_deducted_at
                                                    ? `Completed (${formatDate(selectedAuction.bid_winner.wallet_deducted_at)})`
                                                    : 'Pending'}
                                            </strong>
                                        </div>
                                        <div className="checkout-deduction-row">
                                            <span>Status</span>
                                            <strong>
                                                {selectedAuction.bid_winner
                                                    ?.wallet_deduction_failed_at
                                                    ? 'Needs retry'
                                                    : 'Ready for shipping'}
                                            </strong>
                                        </div>
                                    </div>

                                    {selectedAuction.bid_winner
                                        ?.wallet_deduction_failure_reason && (
                                        <p className="bag-checkout-hint">
                                            {selectedAuction.bid_winner
                                                .wallet_deduction_failure_reason}
                                        </p>
                                    )}

                                    {!addresses.length && !addressLoading && (
                                        <p className="bag-checkout-hint">
                                            Add an address in your account
                                            before placing this order.
                                        </p>
                                    )}
                                    {checkoutError && (
                                        <p className="bag-checkout-error">
                                            {checkoutError}
                                        </p>
                                    )}
                                </div>

                                <div className="bag-checkout-actions">
                                    <button
                                        type="button"
                                        className="bag-checkout-cancel"
                                        onClick={() =>
                                            setIsCheckoutDialogOpen(false)
                                        }
                                        disabled={isCheckingOut}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="bag-checkout-submit"
                                        onClick={handleConfirmCheckout}
                                        disabled={
                                            isCheckingOut ||
                                            !addresses.length ||
                                            !selectedAddressId ||
                                            !isAddressConfirmed
                                        }
                                    >
                                        {isCheckingOut
                                            ? 'Processing...'
                                            : 'Confirm Order'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )}

                {selectedAuction &&
                    authUser &&
                    isFirstBidNoticeOpen &&
                    canRenderPortal &&
                    createPortal(
                        <div
                            className="auction-bid-dialog-backdrop"
                            onClick={() =>
                                !placingBid && setIsFirstBidNoticeOpen(false)
                            }
                            role="presentation"
                        >
                            <div
                                className="auction-bid-dialog auction-first-bid-dialog"
                                role="dialog"
                                aria-modal="true"
                                aria-label="First bid reminder"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <h4 className="auction-bid-title">
                                    First Bid Reminder
                                </h4>
                                <p className="auction-bid-subtitle">
                                    When you win an auction, your winning amount
                                    is automatically deducted from your wallet.
                                    Please make sure your wallet has enough
                                    funds for your bid commitments.
                                </p>
                                <ul className="auction-first-bid-list">
                                    <li>
                                        You are bidding{' '}
                                        {hasValidBidAmount
                                            ? formatPeso(
                                                  parsedBidAmount.toFixed(2),
                                              )
                                            : formatPeso(
                                                  minBidValue.toFixed(2),
                                              )}{' '}
                                        for this auction.
                                    </li>
                                    <li>
                                        Deduction is applied automatically once
                                        this auction closes and you are the
                                        winner.
                                    </li>
                                </ul>
                                <div className="auction-bid-actions">
                                    <button
                                        type="button"
                                        className="auction-bid-cancel"
                                        onClick={() =>
                                            setIsFirstBidNoticeOpen(false)
                                        }
                                        disabled={placingBid}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="auction-bid-submit"
                                        onClick={() => {
                                            void handlePlaceBid({
                                                acknowledgeAutoDeduct: true,
                                            });
                                        }}
                                        disabled={placingBid}
                                    >
                                        {placingBid
                                            ? 'Placing...'
                                            : 'I Understand, Place Bid'}
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body,
                    )}
            </div>
        </main>
    );
};
