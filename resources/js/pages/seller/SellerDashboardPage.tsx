import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import {
    useSellerOrderHistory,
    updateBuyerOrderStatus,
} from '../../hooks/useOrderHistory';
import {
    HOME_CATEGORY_OPTIONS,
    getCategoryLabel,
    getSubcategoryLabel,
    getSubcategoryOptions,
} from '../../lib/homeCategories';
import { sellerService } from '../../services/api';
import type {
    AuctionProduct,
    SellerRegistration,
    OrderHistoryItem,
} from '../../types';
import {
    getAuctionDisplayStatus,
    parseAuctionTimestamp,
} from '../../utils/auctionStatus';

interface SellerDashboardPageProps {
    onNavigateAddProduct: () => void;
    onNavigateSellerStore: (shopName?: string) => void;
    activeSection: 'products' | 'shipping' | 'orders';
    onSectionChange: (section: 'products' | 'shipping' | 'orders') => void;
}

export const SellerDashboardPage: React.FC<SellerDashboardPageProps> = ({
    onNavigateAddProduct,
    onNavigateSellerStore,
    activeSection,
    onSectionChange,
}) => {
    const MAX_MEDIA_ENTRIES = 10;
    const { authUser } = useAuth();
    const [registration, setRegistration] = useState<SellerRegistration | null>(
        null,
    );
    const [useRegistrationAddress, setUseRegistrationAddress] = useState(false);
    const [savingShippingSettings, setSavingShippingSettings] = useState(false);
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [productFilter, setProductFilter] = useState<
        'all' | 'open' | 'closed' | 'scheduled'
    >('all');
    const [productView, setProductView] = useState<'grid' | 'table'>('grid');
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState('');
    const [selectedProduct, setSelectedProduct] =
        useState<AuctionProduct | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [isFeaturedImageZoomed, setIsFeaturedImageZoomed] = useState(false);
    const [featuredImageZoomOrigin, setFeaturedImageZoomOrigin] =
        useState('50% 50%');
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [savingProduct, setSavingProduct] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(false);
    const [orderTab, setOrderTab] = useState<'active' | 'history'>('active');
    const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
    const addMoreMediaInputRef = useRef<HTMLInputElement | null>(null);
    const [additionalMediaEntries, setAdditionalMediaEntries] = useState<
        Array<{
            id: string;
            file: File;
            previewUrl: string;
            type: 'image' | 'video';
        }>
    >([]);
    const [editForm, setEditForm] = useState({
        title: '',
        category: '',
        subcategory: '',
        description: '',
        startingPrice: '',
        maxIncrement: '',
        status: 'open' as 'open' | 'closed',
        endsAt: '',
    });
    const [shippingForm, setShippingForm] = useState({
        shopName: '',
        contactEmail: '',
        contactPhone: '',
        pickupAddressSummary: '',
        generalLocation: '',
        zipCode: '',
    });

    const registrationShippingSnapshot = useMemo(
        () => ({
            shopName: registration?.shop_name ?? '',
            contactEmail: registration?.contact_email ?? '',
            contactPhone: registration?.contact_phone ?? '',
            pickupAddressSummary: registration?.pickup_address_summary ?? '',
            generalLocation: registration?.general_location ?? '',
            zipCode: registration?.zip_code ?? '',
        }),
        [registration],
    );

    const hasUnsavedShippingChanges = useMemo(() => {
        return (
            shippingForm.shopName.trim() !==
                registrationShippingSnapshot.shopName.trim() ||
            shippingForm.contactEmail.trim() !==
                registrationShippingSnapshot.contactEmail.trim() ||
            shippingForm.contactPhone.trim() !==
                registrationShippingSnapshot.contactPhone.trim() ||
            shippingForm.pickupAddressSummary.trim() !==
                registrationShippingSnapshot.pickupAddressSummary.trim() ||
            shippingForm.generalLocation.trim() !==
                registrationShippingSnapshot.generalLocation.trim() ||
            shippingForm.zipCode.trim() !==
                registrationShippingSnapshot.zipCode.trim()
        );
    }, [registrationShippingSnapshot, shippingForm]);

    function getProductDisplayStatus(
        product: AuctionProduct,
    ): 'open' | 'closed' | 'scheduled' {
        return getAuctionDisplayStatus(product);
    }

    const formatDateTimeLocal = (value?: string) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const offsetMs = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
    };

    const toDateTimeFromDateTimeLocal = (value: string) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const mapProductToEditForm = (product: AuctionProduct) => ({
        title: product.title ?? '',
        category: product.category ?? '',
        subcategory: product.subcategory ?? '',
        description: product.description ?? '',
        startingPrice: String(product.starting_price ?? ''),
        maxIncrement: String(product.max_increment ?? ''),
        status: product.status ?? 'open',
        endsAt: formatDateTimeLocal(product.ends_at),
    });

    const editSubcategoryOptions = useMemo(() => {
        return getSubcategoryOptions(editForm.category);
    }, [editForm.category]);

    useEffect(() => {
        let isActive = true;

        const fetchProducts = async () => {
            setLoadingProducts(true);
            setProductsError('');

            try {
                const data = await sellerService.getMyProducts();
                if (isActive) {
                    setProducts(data);
                }
            } catch {
                if (isActive) {
                    setProductsError('Unable to load your products right now.');
                }
            } finally {
                if (isActive) {
                    setLoadingProducts(false);
                }
            }
        };

        fetchProducts();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchRegistration = async () => {
            try {
                const data = await sellerService.getRegistration();
                if (!isActive) {
                    return;
                }

                const reg = data.registration;
                setRegistration(reg);
                setShippingForm({
                    shopName: reg?.shop_name ?? '',
                    contactEmail: reg?.contact_email ?? '',
                    contactPhone: reg?.contact_phone ?? '',
                    pickupAddressSummary: reg?.pickup_address_summary ?? '',
                    generalLocation: reg?.general_location ?? '',
                    zipCode: reg?.zip_code ?? '',
                });
            } catch {
                if (isActive) {
                    setRegistration(null);
                }
            }
        };

        fetchRegistration();

        return () => {
            isActive = false;
        };
    }, []);

    const refreshProducts = async () => {
        setLoadingProducts(true);
        setProductsError('');

        try {
            const data = await sellerService.getMyProducts();
            setProducts(data);

            if (selectedProduct) {
                const updatedSelected =
                    data.find((item) => item.id === selectedProduct.id) ?? null;
                setSelectedProduct(updatedSelected);
                if (updatedSelected) {
                    setEditForm(mapProductToEditForm(updatedSelected));
                }
            }
        } catch {
            setProductsError('Unable to load your products right now.');
        } finally {
            setLoadingProducts(false);
        }
    };

    const productSummary = useMemo(() => {
        const openCount = products.filter(
            (product) => getProductDisplayStatus(product) === 'open',
        ).length;
        const closedCount = products.filter(
            (product) => getProductDisplayStatus(product) === 'closed',
        ).length;
        const scheduledCount = products.filter(
            (product) => getProductDisplayStatus(product) === 'scheduled',
        ).length;

        return {
            total: products.length,
            open: openCount,
            closed: closedCount,
            scheduled: scheduledCount,
        };
    }, [products]);

    const businessInsights = useMemo(() => {
        const soldProducts = products.filter((product) => {
            return (
                getProductDisplayStatus(product) === 'closed' &&
                Number(product.bids_count ?? 0) > 0
            );
        });

        const sales = soldProducts.reduce((sum, product) => {
            const amount = Number(product.current_price ?? 0);
            return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const visitors = products.reduce((sum, product) => {
            return sum + Number(product.unique_bidders_count ?? 0);
        }, 0);

        const pageViews = products.reduce((sum, product) => {
            return sum + Number(product.page_views ?? 0);
        }, 0);

        return {
            sales,
            visitors,
            pageViews,
            orders: soldProducts.length,
        };
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (productFilter === 'all') {
            return products;
        }

        return products.filter(
            (product) => getProductDisplayStatus(product) === productFilter,
        );
    }, [productFilter, products]);

    const formatPeso = (value?: string) => {
        const amount = Number(value ?? 0);
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    };

    const formatDate = (value?: string) => {
        if (!value) {
            return '—';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const resolveMediaUrl = (url: string) => {
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

    const getMediaFileName = (filePath?: string) => {
        if (!filePath) {
            return 'file';
        }

        const normalized = filePath.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(Boolean);
        return parts[parts.length - 1] || 'file';
    };

    const openProductDialog = (product: AuctionProduct) => {
        setSelectedProduct(product);
        setActiveMediaIndex(0);
        setIsFeaturedImageZoomed(false);
        setFeaturedImageZoomOrigin('50% 50%');
        setIsEditingProduct(false);
        setIsActionMenuOpen(false);
        setRemovedMediaIds([]);
        setAdditionalMediaEntries([]);
        setEditForm(mapProductToEditForm(product));
        setIsDetailDialogOpen(true);
    };

    const closeProductDialog = () => {
        additionalMediaEntries.forEach((entry) =>
            URL.revokeObjectURL(entry.previewUrl),
        );
        setAdditionalMediaEntries([]);
        setIsDetailDialogOpen(false);
        setIsFeaturedImageZoomed(false);
        setFeaturedImageZoomOrigin('50% 50%');
        setIsEditingProduct(false);
        setIsActionMenuOpen(false);
        setRemovedMediaIds([]);
    };

    const visibleExistingMedia = useMemo(() => {
        if (!selectedProduct?.media?.length) {
            return [];
        }

        const sortedMedia = [...selectedProduct.media].sort((left, right) => {
            const leftIsVideo = left.media_type === 'video';
            const rightIsVideo = right.media_type === 'video';

            if (leftIsVideo === rightIsVideo) {
                return 0;
            }

            return leftIsVideo ? -1 : 1;
        });

        if (!isEditingProduct || removedMediaIds.length === 0) {
            return sortedMedia;
        }

        const removedSet = new Set(removedMediaIds);
        return sortedMedia.filter((media) => !removedSet.has(media.id));
    }, [isEditingProduct, removedMediaIds, selectedProduct]);

    const removedExistingMedia = useMemo(() => {
        if (!selectedProduct?.media?.length || removedMediaIds.length === 0) {
            return [];
        }

        const removedSet = new Set(removedMediaIds);
        return selectedProduct.media.filter((media) =>
            removedSet.has(media.id),
        );
    }, [removedMediaIds, selectedProduct]);

    useEffect(() => {
        if (activeMediaIndex >= visibleExistingMedia.length) {
            setActiveMediaIndex(Math.max(0, visibleExistingMedia.length - 1));
        }
    }, [activeMediaIndex, visibleExistingMedia.length]);

    useEffect(() => {
        if (!isDetailDialogOpen || !selectedProduct) {
            return;
        }

        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 5000);

        return () => {
            window.clearInterval(interval);
        };
    }, [isDetailDialogOpen, selectedProduct]);

    const formatRelativeTime = (
        targetTime: number | null,
        referenceTime: number,
        mode: 'until' | 'since',
    ) => {
        if (!targetTime) {
            return '--';
        }

        const diff =
            mode === 'until'
                ? Math.max(0, targetTime - referenceTime)
                : Math.max(0, referenceTime - targetTime);

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

    const selectedProductStartsAt = parseAuctionTimestamp(
        selectedProduct?.starts_at ?? null,
    );
    const selectedProductEndsAt = parseAuctionTimestamp(
        selectedProduct?.ends_at ?? null,
    );

    const handleAddMoreMediaChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (!selectedProduct) {
            return;
        }

        const selectedFiles = Array.from(event.target.files ?? []);
        if (selectedFiles.length === 0) {
            return;
        }

        const existingCount = visibleExistingMedia.length;

        setAdditionalMediaEntries((prevEntries) => {
            const remainingSlots =
                MAX_MEDIA_ENTRIES - existingCount - prevEntries.length;

            if (remainingSlots <= 0) {
                toast.error(
                    'This product already reached the maximum of 10 media files.',
                );
                return prevEntries;
            }

            const validFiles = selectedFiles
                .filter(
                    (file) =>
                        file.type.startsWith('image/') ||
                        file.type.startsWith('video/'),
                )
                .slice(0, remainingSlots);

            if (validFiles.length !== selectedFiles.length) {
                toast.warn(
                    'Only image/video files are allowed, with a maximum total of 10 media files.',
                );
            }

            const newEntries = validFiles.map((file, index) => ({
                id: `${Date.now()}-${index}-${file.name}`,
                file,
                previewUrl: URL.createObjectURL(file),
                type: file.type.startsWith('video/')
                    ? 'video'
                    : ('image' as 'image' | 'video'),
            }));

            return [...prevEntries, ...newEntries];
        });

        event.target.value = '';
    };

    const handleRemoveQueuedMedia = (entryId: string) => {
        setAdditionalMediaEntries((prevEntries) => {
            const mediaToRemove = prevEntries.find(
                (entry) => entry.id === entryId,
            );
            if (mediaToRemove) {
                URL.revokeObjectURL(mediaToRemove.previewUrl);
            }
            return prevEntries.filter((entry) => entry.id !== entryId);
        });
    };

    const handleRemoveExistingMedia = (mediaId: number) => {
        if (!isEditingProduct || !selectedProduct) {
            return;
        }

        setRemovedMediaIds((prev) =>
            prev.includes(mediaId) ? prev : [...prev, mediaId],
        );
        setIsFeaturedImageZoomed(false);
        setFeaturedImageZoomOrigin('50% 50%');
    };

    const handleUndoRemoveExistingMedia = (mediaId: number) => {
        if (!isEditingProduct) {
            return;
        }

        setRemovedMediaIds((prev) => prev.filter((id) => id !== mediaId));
    };

    const handleOpenAddMoreMediaPicker = () => {
        addMoreMediaInputRef.current?.click();
    };

    const handleFeaturedImageClick = (
        event: React.MouseEvent<HTMLImageElement>,
    ) => {
        if (isFeaturedImageZoomed) {
            setIsFeaturedImageZoomed(false);
            setFeaturedImageZoomOrigin('50% 50%');
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

        const clampedX = Math.min(100, Math.max(0, xPercent));
        const clampedY = Math.min(100, Math.max(0, yPercent));

        setFeaturedImageZoomOrigin(`${clampedX}% ${clampedY}%`);
        setIsFeaturedImageZoomed(true);
    };

    const handleSaveProductChanges = async () => {
        if (!selectedProduct) {
            return;
        }

        if (!editForm.title.trim()) {
            toast.error('Product name is required.');
            return;
        }

        if (!editForm.category) {
            toast.error('Category is required.');
            return;
        }

        if (!editForm.subcategory) {
            toast.error('Subcategory is required.');
            return;
        }

        const startPrice = Number(editForm.startingPrice);
        const increment = Number(editForm.maxIncrement);

        if (!Number.isFinite(startPrice) || startPrice <= 0) {
            toast.error('Starting price must be greater than 0.');
            return;
        }

        if (!Number.isFinite(increment) || increment < 0) {
            toast.error('Maximum increment must be 0 or higher.');
            return;
        }

        const endsAtIso = toDateTimeFromDateTimeLocal(editForm.endsAt);
        if (!endsAtIso || new Date(endsAtIso) <= new Date()) {
            toast.error('End date and time must be in the future.');
            return;
        }

        setSavingProduct(true);
        try {
            const formData = new FormData();
            formData.append('title', editForm.title.trim());
            formData.append('category', editForm.category);
            formData.append('subcategory', editForm.subcategory);
            formData.append('description', editForm.description.trim());
            formData.append('starting_price', String(startPrice));
            formData.append('max_increment', String(increment));
            formData.append('ends_at', endsAtIso);
            formData.append('end_time_mode', 'custom');
            formData.append('status', editForm.status);

            removedMediaIds.forEach((id) => {
                formData.append('removed_media_ids[]', String(id));
            });

            additionalMediaEntries.forEach((entry) => {
                formData.append('media[]', entry.file);
            });

            const updated = await sellerService.updateProduct(
                selectedProduct.id,
                formData,
            );

            setSelectedProduct(updated);
            setEditForm(mapProductToEditForm(updated));
            setProducts((prev) =>
                prev.map((item) => (item.id === updated.id ? updated : item)),
            );
            setIsEditingProduct(false);
            setRemovedMediaIds([]);
            additionalMediaEntries.forEach((entry) =>
                URL.revokeObjectURL(entry.previewUrl),
            );
            setAdditionalMediaEntries([]);
            toast.success('Product updated successfully.');
            await refreshProducts();
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to update product.';
            toast.error(message);
        } finally {
            setSavingProduct(false);
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) {
            return;
        }

        const confirmed = window.confirm(
            'Delete this product? This action cannot be undone.',
        );
        if (!confirmed) {
            return;
        }

        setDeletingProduct(true);
        try {
            await sellerService.deleteProduct(selectedProduct.id);
            setProducts((prev) =>
                prev.filter((item) => item.id !== selectedProduct.id),
            );
            setSelectedProduct(null);
            setIsDetailDialogOpen(false);
            setIsEditingProduct(false);
            toast.success('Product deleted successfully.');
            await refreshProducts();
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to delete product.';
            toast.error(message);
        } finally {
            setDeletingProduct(false);
        }
    };

    const handleSaveShippingSettings = async () => {
        setSavingShippingSettings(true);

        try {
            const response = await sellerService.updateShippingSettings({
                shop_name: shippingForm.shopName.trim() || undefined,
                contact_email: shippingForm.contactEmail.trim() || undefined,
                contact_phone: shippingForm.contactPhone.trim() || undefined,
                pickup_address_summary:
                    shippingForm.pickupAddressSummary.trim() || undefined,
                general_location:
                    shippingForm.generalLocation.trim() || undefined,
                zip_code: shippingForm.zipCode.trim() || undefined,
            });

            setRegistration(response.registration);
            setUseRegistrationAddress(false);
            toast.success('Shipping settings updated.');
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to update shipping settings.';
            toast.error(message);
        } finally {
            setSavingShippingSettings(false);
        }
    };

    const shopName =
        registration?.shop_name?.trim() ||
        `${authUser?.name || 'Seller'}'s Shop`;

    const handleUseRegistrationAddressToggle = (checked: boolean) => {
        setUseRegistrationAddress(checked);

        if (!checked) {
            return;
        }

        const hasRegisteredAddress = Boolean(
            registration?.registered_address?.trim() ||
            registration?.general_location?.trim() ||
            registration?.zip_code?.trim(),
        );

        if (!hasRegisteredAddress) {
            toast.info('No registration address found yet.');
            setUseRegistrationAddress(false);
            return;
        }

        setShippingForm((prev) => ({
            ...prev,
            pickupAddressSummary:
                registration?.registered_address ?? prev.pickupAddressSummary,
            generalLocation:
                registration?.general_location ?? prev.generalLocation,
            zipCode: registration?.zip_code ?? prev.zipCode,
        }));
    };

    const SellerOrdersSection: React.FC = () => {
        const { orders, updateOrderStatus } = useSellerOrderHistory(
            authUser?.id,
        );
        const [markedAsShipped, setMarkedAsShipped] = useState<Set<string>>(
            new Set(),
        );
        const handleContactBuyer = (
            buyerUserId?: number | string,
            buyerName?: string,
        ) => {
            if (!buyerUserId) {
                window.dispatchEvent(
                    new CustomEvent('auctify-toast', {
                        detail: {
                            type: 'error',
                            message:
                                'Buyer chat is unavailable for this order.',
                        },
                    }),
                );
                return;
            }
            window.dispatchEvent(
                new CustomEvent('open-auctify-chat', {
                    detail: {
                        sellerUserId: Number(buyerUserId),
                        sellerName: buyerName,
                    },
                }),
            );
        };

        const handleMarkAsShipped = (orderId: string) => {
            const confirmed = window.confirm(
                'Mark this order as shipped? The status will update for the buyer.',
            );
            if (!confirmed) return;

            const order = orders.find((o) => o.id === orderId);
            updateOrderStatus(orderId, 'delivered');

            // Sync status to buyer's order history in real-time
            if (order?.buyer_user_id && order.auction_id) {
                updateBuyerOrderStatus(
                    order.buyer_user_id,
                    order.auction_id,
                    'delivered',
                    order.id,
                );
            }

            setMarkedAsShipped((prev) => new Set([...prev, orderId]));
            toast.success('Order marked as shipped. Buyer order updated.');
        };

        const handlePrintLabel = (order: OrderHistoryItem) => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                toast.error(
                    'Could not open print dialog. Check popup blockers.',
                );
                return;
            }

            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Shipping Label - Order #${order.id.substring(0, 8).toUpperCase()}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                        .label-container { max-width: 600px; margin: 0 auto; border: 2px solid #000; padding: 20px; }
                        .label-header { text-align: center; margin-bottom: 30px; font-weight: bold; font-size: 18px; }
                        .label-section { margin-bottom: 25px; }
                        .label-section-title { font-weight: bold; margin-bottom: 8px; }
                        .label-info { font-size: 14px; }
                        .divider { border-top: 1px dashed #000; margin: 20px 0; }
                        @media print { body { margin: 0; padding: 0; } }
                    </style>
                </head>
                <body>
                    <div class="label-container">
                        <div class="label-header">📦 SHIPPING LABEL</div>
                        
                        <div class="label-section">
                            <div class="label-section-title">FROM (Return Address):</div>
                            <div class="label-info">
                                <strong>${order.seller_name}</strong><br/>
                                Shop: ${order.seller_shop_name}<br/>
                                Email: Available in seller dashboard<br/>
                                Phone: Available in seller dashboard
                            </div>
                        </div>

                        <div class="divider"></div>

                        <div class="label-section">
                            <div class="label-section-title">TO (Shipping Address):</div>
                            <div class="label-info">
                                <strong>${order.buyer_name}</strong><br/>
                                ${order.address_summary}<br/>
                                Email: ${order.buyer_email}
                            </div>
                        </div>

                        <div class="divider"></div>

                        <div class="label-section">
                            <div class="label-section-title">ORDER DETAILS:</div>
                            <div class="label-info">
                                Order ID: <strong>${order.id.substring(0, 8).toUpperCase()}</strong><br/>
                                Product: <strong>${order.title}</strong><br/>
                                Amount: <strong>${formatPeso(order.amount_paid)}</strong><br/>
                                Ordered: ${formatDate(order.purchased_at)}<br/>
                                Category: ${getCategoryLabel(order.category)}${order.subcategory ? ` • ${getSubcategoryLabel(order.category, order.subcategory)}` : ''}
                            </div>
                        </div>

                        <div class="divider"></div>

                        <div class="label-info" style="text-align: center; font-size: 12px; color: #666;">
                            Print this label and attach to package<br/>
                            Keep order ID visible and legible
                        </div>
                    </div>
                    <script>
                        window.onload = () => { window.print(); };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();
        };

        if (orders.length === 0) {
            return (
                <article className="seller-dashboard-card seller-dashboard-card-wide">
                    <div className="seller-products-head">
                        <div>
                            <h3 className="seller-dashboard-card-title">
                                My Orders
                            </h3>
                            <p className="seller-dashboard-card-text">
                                Orders will appear here when customers purchase
                                your products.
                            </p>
                        </div>
                    </div>
                    <div className="seller-orders-empty">
                        <p className="seller-dashboard-card-text">
                            No orders yet. Continue listing products to start
                            receiving orders.
                        </p>
                    </div>
                </article>
            );
        }

        const totalOrders = orders.length;
        const processingCount = orders.filter(
            (o) => o.status === 'processing',
        ).length;
        const deliveredCount = orders.filter(
            (o) => o.status === 'delivered',
        ).length;
        const cancelledCount = orders.filter(
            (o) => o.status === 'cancelled',
        ).length;

        const getStatusStep = (status: string): 1 | 2 | 3 => {
            if (status === 'processing') return 1;
            if (status === 'delivered') return 3;
            return 1;
        };

        const calculateEstimatedDelivery = (purchasedAt: string): string => {
            const orderDate = new Date(purchasedAt);
            const estimatedDate = new Date(
                orderDate.getTime() + 5 * 24 * 60 * 60 * 1000,
            );
            return new Intl.DateTimeFormat('en-PH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(estimatedDate);
        };

        const activeOrders = orders.filter((o) => o.status === 'processing');
        const historyOrders = orders
            .filter((o) => o.status === 'delivered' || o.status === 'cancelled')
            .slice()
            .sort(
                (a, b) =>
                    new Date(b.purchased_at).getTime() -
                    new Date(a.purchased_at).getTime(),
            );

        return (
            <>
                <article className="seller-dashboard-card seller-dashboard-card-wide">
                    <div className="seller-products-head">
                        <div>
                            <h3 className="seller-dashboard-card-title">
                                My Orders
                            </h3>
                            <p className="seller-dashboard-card-text">
                                Track and manage all orders from your customers.
                            </p>
                        </div>
                    </div>

                    <div className="seller-orders-summary">
                        <div className="seller-order-summary-card">
                            <p className="seller-dashboard-stat-value">
                                {totalOrders}
                            </p>
                            <p className="seller-dashboard-stat-label">
                                Total Orders
                            </p>
                        </div>
                        <div className="seller-order-summary-card">
                            <p className="seller-dashboard-stat-value">
                                {processingCount}
                            </p>
                            <p className="seller-dashboard-stat-label">
                                Processing
                            </p>
                        </div>
                        <div className="seller-order-summary-card">
                            <p className="seller-dashboard-stat-value">
                                {deliveredCount}
                            </p>
                            <p className="seller-dashboard-stat-label">
                                Delivered
                            </p>
                        </div>
                        <div className="seller-order-summary-card">
                            <p className="seller-dashboard-stat-value">
                                {cancelledCount}
                            </p>
                            <p className="seller-dashboard-stat-label">
                                Cancelled
                            </p>
                        </div>
                    </div>
                </article>

                <article className="seller-dashboard-card seller-dashboard-card-wide">
                    {/* Tab bar */}
                    <div className="seller-orders-tabs">
                        <button
                            type="button"
                            className={`seller-orders-tab ${orderTab === 'active' ? 'active' : ''}`}
                            onClick={() => setOrderTab('active')}
                        >
                            Active Orders
                            {activeOrders.length > 0 && (
                                <span className="seller-orders-tab-badge">
                                    {activeOrders.length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            className={`seller-orders-tab ${orderTab === 'history' ? 'active' : ''}`}
                            onClick={() => setOrderTab('history')}
                        >
                            Order History
                            {historyOrders.length > 0 && (
                                <span className="seller-orders-tab-badge seller-orders-tab-badge-muted">
                                    {historyOrders.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── Active Orders ── */}
                    {orderTab === 'active' && (
                        <div className="seller-orders-list">
                            {activeOrders.length === 0 && (
                                <p className="seller-orders-empty-text">
                                    No active orders right now.
                                </p>
                            )}
                            {activeOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="seller-order-card"
                                >
                                    <div className="seller-order-image-section">
                                        <div className="seller-order-media-wrap">
                                            {order.media_url ? (
                                                order.media_type === 'video' ? (
                                                    <video
                                                        className="seller-order-media"
                                                        src={resolveMediaUrl(
                                                            order.media_url,
                                                        )}
                                                        controls
                                                        preload="metadata"
                                                    />
                                                ) : (
                                                    <img
                                                        className="seller-order-media"
                                                        src={resolveMediaUrl(
                                                            order.media_url,
                                                        )}
                                                        alt={order.title}
                                                    />
                                                )
                                            ) : (
                                                <div className="seller-order-media seller-order-media-placeholder">
                                                    No Media
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className={`seller-order-status seller-order-status-${order.status}`}
                                        >
                                            {order.status
                                                .charAt(0)
                                                .toUpperCase() +
                                                order.status.slice(1)}
                                        </span>
                                    </div>

                                    <div className="seller-order-main-content">
                                        <div className="seller-order-header-section">
                                            <div className="seller-order-id-title">
                                                <p className="seller-order-id">
                                                    Order #
                                                    {order.id
                                                        .substring(0, 8)
                                                        .toUpperCase()}
                                                </p>
                                                <h4 className="seller-order-title">
                                                    {order.title}
                                                </h4>
                                            </div>
                                            <div className="seller-order-amount">
                                                <p className="seller-order-amount-label">
                                                    Amount Paid
                                                </p>
                                                <p className="seller-order-amount-value">
                                                    {formatPeso(
                                                        order.amount_paid,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="seller-order-status-timeline">
                                            <div
                                                className="seller-order-timeline-step"
                                                data-step="1"
                                                data-active={
                                                    getStatusStep(
                                                        order.status,
                                                    ) >= 1
                                                }
                                            >
                                                <div className="seller-order-timeline-dot"></div>
                                                <span className="seller-order-timeline-label">
                                                    Paid
                                                </span>
                                            </div>
                                            <div
                                                className="seller-order-timeline-line"
                                                data-active={
                                                    getStatusStep(
                                                        order.status,
                                                    ) >= 2
                                                }
                                            ></div>
                                            <div
                                                className="seller-order-timeline-step"
                                                data-step="2"
                                                data-active={
                                                    getStatusStep(
                                                        order.status,
                                                    ) >= 2
                                                }
                                            >
                                                <div className="seller-order-timeline-dot"></div>
                                                <span className="seller-order-timeline-label">
                                                    Processing
                                                </span>
                                            </div>
                                            <div
                                                className="seller-order-timeline-line"
                                                data-active={
                                                    getStatusStep(
                                                        order.status,
                                                    ) >= 3
                                                }
                                            ></div>
                                            <div
                                                className="seller-order-timeline-step"
                                                data-step="3"
                                                data-active={
                                                    getStatusStep(
                                                        order.status,
                                                    ) >= 3
                                                }
                                            >
                                                <div className="seller-order-timeline-dot"></div>
                                                <span className="seller-order-timeline-label">
                                                    Delivered
                                                </span>
                                            </div>
                                        </div>

                                        <div className="seller-order-details-grid">
                                            <div className="seller-order-detail-column">
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Buyer Information
                                                    </p>
                                                    <p className="seller-order-detail-value">
                                                        {order.buyer_name ||
                                                            'Unknown Buyer'}
                                                    </p>
                                                    <p className="seller-order-detail-value-secondary">
                                                        {order.buyer_email ||
                                                            'No email'}
                                                    </p>
                                                </div>
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Payment Method
                                                    </p>
                                                    <p className="seller-order-detail-value">
                                                        {order.payment_card_label ||
                                                            'Not specified'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="seller-order-detail-column">
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Delivery Address
                                                    </p>
                                                    <p className="seller-order-detail-value">
                                                        {order.address_summary ||
                                                            'Not provided'}
                                                    </p>
                                                </div>
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Expected Delivery
                                                    </p>
                                                    <p className="seller-order-detail-value">
                                                        {calculateEstimatedDelivery(
                                                            order.purchased_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="seller-order-detail-column">
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Order Date
                                                    </p>
                                                    <p className="seller-order-detail-value">
                                                        {formatDate(
                                                            order.purchased_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="seller-order-detail-block">
                                                    <p className="seller-order-detail-label">
                                                        Category
                                                    </p>
                                                    <p className="seller-order-detail-value">{`${getCategoryLabel(order.category)}${order.subcategory ? ` • ${getSubcategoryLabel(order.category, order.subcategory)}` : ''}`}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="seller-order-actions">
                                            <button
                                                type="button"
                                                className="seller-order-action-btn"
                                                onClick={() =>
                                                    handleMarkAsShipped(
                                                        order.id,
                                                    )
                                                }
                                                disabled={
                                                    order.status ===
                                                        'delivered' ||
                                                    markedAsShipped.has(
                                                        order.id,
                                                    )
                                                }
                                            >
                                                <span>📦</span>{' '}
                                                {order.status === 'delivered'
                                                    ? 'Shipped'
                                                    : 'Mark as Shipped'}
                                            </button>
                                            <button
                                                type="button"
                                                className="seller-order-action-btn"
                                                onClick={() =>
                                                    handlePrintLabel(order)
                                                }
                                            >
                                                <span>🏷️</span> Print Label
                                            </button>
                                            <button
                                                type="button"
                                                className="seller-order-action-btn"
                                                onClick={() =>
                                                    handleContactBuyer(
                                                        order.buyer_user_id,
                                                        order.buyer_name,
                                                    )
                                                }
                                            >
                                                <span>💬</span> Contact Buyer
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Order History ── */}
                    {orderTab === 'history' && (
                        <div className="seller-order-history">
                            {historyOrders.length === 0 && (
                                <p className="seller-orders-empty-text">
                                    No completed or cancelled orders yet.
                                </p>
                            )}
                            {historyOrders.length > 0 && (
                                <table className="seller-order-history-table">
                                    <thead>
                                        <tr>
                                            <th>Order</th>
                                            <th>Buyer</th>
                                            <th>Amount</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyOrders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className="seller-order-history-row"
                                            >
                                                <td className="seller-order-history-product-cell">
                                                    <div className="seller-order-history-thumb-wrap">
                                                        {order.media_url ? (
                                                            <img
                                                                className="seller-order-history-thumb"
                                                                src={resolveMediaUrl(
                                                                    order.media_url,
                                                                )}
                                                                alt={
                                                                    order.title
                                                                }
                                                            />
                                                        ) : (
                                                            <div className="seller-order-history-thumb seller-order-history-thumb-placeholder">
                                                                📦
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="seller-order-history-id">
                                                            #
                                                            {order.id
                                                                .substring(0, 8)
                                                                .toUpperCase()}
                                                        </p>
                                                        <p className="seller-order-history-title">
                                                            {order.title}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="seller-order-history-buyer-cell">
                                                    <p className="seller-order-history-buyer-name">
                                                        {order.buyer_name ||
                                                            '—'}
                                                    </p>
                                                    <p className="seller-order-history-buyer-email">
                                                        {order.buyer_email ||
                                                            ''}
                                                    </p>
                                                </td>
                                                <td className="seller-order-history-amount-cell">
                                                    {formatPeso(
                                                        order.amount_paid,
                                                    )}
                                                </td>
                                                <td className="seller-order-history-date-cell">
                                                    {formatDate(
                                                        order.purchased_at,
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`seller-order-status seller-order-status-${order.status}`}
                                                    >
                                                        {order.status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            order.status.slice(
                                                                1,
                                                            )}
                                                    </span>
                                                </td>
                                                <td className="seller-order-history-actions-cell">
                                                    <button
                                                        type="button"
                                                        className="seller-order-action-btn"
                                                        onClick={() =>
                                                            handlePrintLabel(
                                                                order,
                                                            )
                                                        }
                                                        title="Print Label"
                                                    >
                                                        <span>🏷️</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="seller-order-action-btn"
                                                        onClick={() =>
                                                            handleContactBuyer(
                                                                order.buyer_user_id,
                                                                order.buyer_name,
                                                            )
                                                        }
                                                        title="Contact Buyer"
                                                    >
                                                        <span>💬</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </article>
            </>
        );
    };

    return (
        <section className="seller-dashboard-page">
            <aside className="seller-dashboard-sidebar">
                <h3 className="seller-dashboard-brand">Seller Center</h3>
                <div className="seller-dashboard-shop-chip" title={shopName}>
                    {shopName}
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Order</p>
                    <button
                        type="button"
                        className={`seller-dashboard-link ${activeSection === 'orders' ? 'seller-dashboard-link-active' : ''}`}
                        onClick={() => onSectionChange('orders')}
                    >
                        My Orders
                    </button>
                    <button type="button" className="seller-dashboard-link">
                        Mass Ship
                    </button>
                    <button
                        type="button"
                        className={`seller-dashboard-link ${activeSection === 'shipping' ? 'seller-dashboard-link-active' : ''}`}
                        onClick={() => onSectionChange('shipping')}
                    >
                        Shipping Setting
                    </button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Product</p>
                    <button
                        type="button"
                        className={`seller-dashboard-link ${activeSection === 'products' ? 'seller-dashboard-link-active' : ''}`}
                        onClick={() => onSectionChange('products')}
                    >
                        My Products
                    </button>
                    <button
                        type="button"
                        className="seller-dashboard-link"
                        onClick={onNavigateAddProduct}
                    >
                        Add New Product
                    </button>
                    <button
                        type="button"
                        className="seller-dashboard-link"
                        onClick={() =>
                            onNavigateSellerStore(
                                registration?.shop_name ??
                                    authUser?.name ??
                                    undefined,
                            )
                        }
                    >
                        Seller Page
                    </button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Marketing</p>
                    <button type="button" className="seller-dashboard-link">
                        Campaign
                    </button>
                    <button type="button" className="seller-dashboard-link">
                        Best Price
                    </button>
                </div>
            </aside>

            <div className="seller-dashboard-main">
                <header className="seller-dashboard-topbar">
                    <div>
                        <h2>Seller Dashboard</h2>
                        <p className="seller-dashboard-subtext">
                            {shopName} • Manage orders, products, and campaigns
                            in one place.
                        </p>
                    </div>
                    <div className="seller-dashboard-topbar-right">
                        <div className="seller-dashboard-profile">
                            {authUser?.name || 'Seller'}
                        </div>
                        <button
                            type="button"
                            className="seller-primary-btn"
                            onClick={onNavigateAddProduct}
                        >
                            New Product
                        </button>
                    </div>
                </header>

                <div
                    className={`seller-dashboard-layout${activeSection === 'products' && productView === 'table' ? 'seller-dashboard-layout-table' : ''}`}
                >
                    <div className="seller-dashboard-content">
                        {activeSection === 'products' && (
                            <article className="seller-dashboard-card seller-dashboard-card-wide">
                                <h3 className="seller-dashboard-card-title">
                                    To Do List
                                </h3>
                                <div className="seller-dashboard-stats">
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            0
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            To-Process Shipment
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            0
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Processed Shipment
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            0
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Return/Refund/Cancel
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            0
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Banned Products
                                        </p>
                                    </div>
                                </div>
                            </article>
                        )}

                        {activeSection === 'products' && (
                            <article className="seller-dashboard-card seller-dashboard-card-wide seller-dashboard-highlight">
                                <h3 className="seller-dashboard-card-title">
                                    Business Insights
                                </h3>
                                <div className="seller-dashboard-stats">
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            {formatPeso(
                                                String(businessInsights.sales),
                                            )}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Sales
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            {businessInsights.visitors}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Visitors
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            {businessInsights.pageViews}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Page Views
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-dashboard-stat-value">
                                            {businessInsights.orders}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Orders
                                        </p>
                                    </div>
                                </div>
                            </article>
                        )}

                        {activeSection === 'products' && (
                            <article className="seller-dashboard-card seller-dashboard-card-wide">
                                <div className="seller-products-head">
                                    <div>
                                        <h3 className="seller-dashboard-card-title">
                                            My Products
                                        </h3>
                                        <p className="seller-dashboard-card-text">
                                            All products you added in Seller
                                            Center are listed here.
                                        </p>
                                    </div>
                                    <div className="seller-products-filters">
                                        <select
                                            className="seller-input"
                                            value={productFilter}
                                            onChange={(event) =>
                                                setProductFilter(
                                                    event.target.value as
                                                        | 'all'
                                                        | 'open'
                                                        | 'closed'
                                                        | 'scheduled',
                                                )
                                            }
                                        >
                                            <option value="all">All</option>
                                            <option value="open">Open</option>
                                            <option value="closed">
                                                Closed
                                            </option>
                                            <option value="scheduled">
                                                Scheduled
                                            </option>
                                        </select>
                                        <div className="seller-products-view-toggle">
                                            <button
                                                type="button"
                                                className={`seller-products-view-btn${productView === 'grid' ? 'active' : ''}`}
                                                onClick={() =>
                                                    setProductView('grid')
                                                }
                                                title="Grid view"
                                                aria-label="Grid view"
                                            >
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    width="16"
                                                    height="16"
                                                >
                                                    <rect
                                                        x="2"
                                                        y="2"
                                                        width="7"
                                                        height="7"
                                                        rx="1.5"
                                                    />
                                                    <rect
                                                        x="11"
                                                        y="2"
                                                        width="7"
                                                        height="7"
                                                        rx="1.5"
                                                    />
                                                    <rect
                                                        x="2"
                                                        y="11"
                                                        width="7"
                                                        height="7"
                                                        rx="1.5"
                                                    />
                                                    <rect
                                                        x="11"
                                                        y="11"
                                                        width="7"
                                                        height="7"
                                                        rx="1.5"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                className={`seller-products-view-btn${productView === 'table' ? 'active' : ''}`}
                                                onClick={() =>
                                                    setProductView('table')
                                                }
                                                title="Table view"
                                                aria-label="Table view"
                                            >
                                                <svg
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    width="16"
                                                    height="16"
                                                >
                                                    <rect
                                                        x="2"
                                                        y="3"
                                                        width="16"
                                                        height="2.5"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="2"
                                                        y="8.75"
                                                        width="16"
                                                        height="2.5"
                                                        rx="1"
                                                    />
                                                    <rect
                                                        x="2"
                                                        y="14.5"
                                                        width="16"
                                                        height="2.5"
                                                        rx="1"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="seller-products-summary">
                                    <div className="seller-products-summary-item">
                                        <p className="seller-dashboard-stat-value">
                                            {productSummary.total}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Total Products
                                        </p>
                                    </div>
                                    <div className="seller-products-summary-item">
                                        <p className="seller-dashboard-stat-value">
                                            {productSummary.open}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Open
                                        </p>
                                    </div>
                                    <div className="seller-products-summary-item">
                                        <p className="seller-dashboard-stat-value">
                                            {productSummary.closed}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Closed
                                        </p>
                                    </div>
                                    <div className="seller-products-summary-item">
                                        <p className="seller-dashboard-stat-value">
                                            {productSummary.scheduled}
                                        </p>
                                        <p className="seller-dashboard-stat-label">
                                            Scheduled
                                        </p>
                                    </div>
                                </div>

                                {loadingProducts && (
                                    <p className="seller-products-state">
                                        Loading your products...
                                    </p>
                                )}
                                {!loadingProducts && productsError && (
                                    <p className="seller-products-state seller-products-state-error">
                                        {productsError}
                                    </p>
                                )}

                                {!loadingProducts &&
                                    !productsError &&
                                    filteredProducts.length === 0 && (
                                        <div className="seller-products-empty">
                                            <p className="seller-dashboard-card-text">
                                                {products.length === 0
                                                    ? 'You have not added any products yet.'
                                                    : 'No products match the selected filter.'}
                                            </p>
                                        </div>
                                    )}

                                {!loadingProducts &&
                                    !productsError &&
                                    filteredProducts.length > 0 &&
                                    productView === 'grid' && (
                                        <div className="seller-products-grid">
                                            {filteredProducts.map((product) => {
                                                const firstMedia =
                                                    product.media?.[0];
                                                const isSelected =
                                                    selectedProduct?.id ===
                                                    product.id;
                                                const displayStatus =
                                                    getProductDisplayStatus(
                                                        product,
                                                    );

                                                return (
                                                    <article
                                                        key={product.id}
                                                        className={`seller-product-card ${isSelected ? 'seller-product-card-active' : ''}`}
                                                        onClick={() =>
                                                            openProductDialog(
                                                                product,
                                                            )
                                                        }
                                                        onKeyDown={(event) =>
                                                            event.key ===
                                                                'Enter' &&
                                                            openProductDialog(
                                                                product,
                                                            )
                                                        }
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <div className="seller-product-media-wrap">
                                                            {firstMedia ? (
                                                                firstMedia.media_type ===
                                                                'video' ? (
                                                                    <video
                                                                        className="seller-product-media"
                                                                        src={resolveMediaUrl(
                                                                            firstMedia.url,
                                                                        )}
                                                                        controls
                                                                        preload="metadata"
                                                                    />
                                                                ) : (
                                                                    <img
                                                                        className="seller-product-media"
                                                                        src={resolveMediaUrl(
                                                                            firstMedia.url,
                                                                        )}
                                                                        alt={
                                                                            product.title
                                                                        }
                                                                    />
                                                                )
                                                            ) : (
                                                                <div className="seller-product-media seller-product-media-placeholder">
                                                                    No Media
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="seller-product-body">
                                                            <div className="seller-product-title-row">
                                                                <h4 className="seller-product-title">
                                                                    {
                                                                        product.title
                                                                    }
                                                                </h4>
                                                                <span
                                                                    className={`seller-product-status seller-product-status-${displayStatus}`}
                                                                >
                                                                    {
                                                                        displayStatus
                                                                    }
                                                                </span>
                                                            </div>
                                                            <p className="seller-product-category">{`${getCategoryLabel(product.category)}${product.subcategory ? ` • ${getSubcategoryLabel(product.category, product.subcategory)}` : ''}`}</p>
                                                            <div className="seller-product-pricing">
                                                                <p>
                                                                    Start:{' '}
                                                                    {formatPeso(
                                                                        product.starting_price,
                                                                    )}
                                                                </p>
                                                                <p>
                                                                    Max
                                                                    Increment:{' '}
                                                                    {formatPeso(
                                                                        product.max_increment,
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <p className="seller-product-view-hint">
                                                                Click to view
                                                                full details
                                                            </p>
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}

                                {!loadingProducts &&
                                    !productsError &&
                                    filteredProducts.length > 0 &&
                                    productView === 'table' && (
                                        <div className="seller-products-table-wrap">
                                            <table className="seller-products-table">
                                                <thead>
                                                    <tr>
                                                        <th>Product</th>
                                                        <th>Category</th>
                                                        <th>Starting Price</th>
                                                        <th>Current Price</th>
                                                        <th>Bids</th>
                                                        <th>Views</th>
                                                        <th>Ends At</th>
                                                        <th>Status</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredProducts.map(
                                                        (product) => {
                                                            const firstMedia =
                                                                product
                                                                    .media?.[0];
                                                            const displayStatus =
                                                                getProductDisplayStatus(
                                                                    product,
                                                                );
                                                            return (
                                                                <tr
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    className={`seller-products-table-row${selectedProduct?.id === product.id ? 'active' : ''}`}
                                                                    onClick={() =>
                                                                        openProductDialog(
                                                                            product,
                                                                        )
                                                                    }
                                                                >
                                                                    <td className="seller-products-table-product-cell">
                                                                        <div className="seller-products-table-thumb-wrap">
                                                                            {firstMedia ? (
                                                                                firstMedia.media_type ===
                                                                                'video' ? (
                                                                                    <video
                                                                                        className="seller-products-table-thumb"
                                                                                        src={resolveMediaUrl(
                                                                                            firstMedia.url,
                                                                                        )}
                                                                                        preload="metadata"
                                                                                    />
                                                                                ) : (
                                                                                    <img
                                                                                        className="seller-products-table-thumb"
                                                                                        src={resolveMediaUrl(
                                                                                            firstMedia.url,
                                                                                        )}
                                                                                        alt={
                                                                                            product.title
                                                                                        }
                                                                                    />
                                                                                )
                                                                            ) : (
                                                                                <div className="seller-products-table-thumb seller-products-table-thumb-placeholder">
                                                                                    📷
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <p className="seller-products-table-title">
                                                                                {
                                                                                    product.title
                                                                                }
                                                                            </p>
                                                                            <p className="seller-products-table-id">
                                                                                ID
                                                                                #
                                                                                {
                                                                                    product.id
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </td>
                                                                    <td className="seller-products-table-cell">{`${getCategoryLabel(product.category)}${product.subcategory ? ` • ${getSubcategoryLabel(product.category, product.subcategory)}` : ''}`}</td>
                                                                    <td className="seller-products-table-cell seller-products-table-price">
                                                                        {formatPeso(
                                                                            product.starting_price,
                                                                        )}
                                                                    </td>
                                                                    <td className="seller-products-table-cell seller-products-table-price">
                                                                        {formatPeso(
                                                                            product.current_price,
                                                                        )}
                                                                    </td>
                                                                    <td className="seller-products-table-cell">
                                                                        {product.bids_count ??
                                                                            0}
                                                                    </td>
                                                                    <td className="seller-products-table-cell">
                                                                        {product.page_views ??
                                                                            0}
                                                                    </td>
                                                                    <td className="seller-products-table-cell seller-products-table-date">
                                                                        {formatDate(
                                                                            product.ends_at,
                                                                        )}
                                                                    </td>
                                                                    <td className="seller-products-table-cell">
                                                                        <span
                                                                            className={`seller-product-status seller-product-status-${displayStatus}`}
                                                                        >
                                                                            {
                                                                                displayStatus
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="seller-products-table-cell">
                                                                        <button
                                                                            type="button"
                                                                            className="seller-products-table-edit-btn"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                openProductDialog(
                                                                                    product,
                                                                                );
                                                                            }}
                                                                            title="View / Edit"
                                                                        >
                                                                            ✏️
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        },
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                            </article>
                        )}

                        {activeSection === 'shipping' && (
                            <article className="seller-dashboard-card seller-dashboard-card-wide seller-shipping-card">
                                <div className="seller-products-head">
                                    <div>
                                        <h3 className="seller-dashboard-card-title">
                                            Shipping Settings
                                        </h3>
                                        <p className="seller-dashboard-card-text">
                                            Update shipping contact and pickup
                                            details for your shop.
                                        </p>
                                    </div>
                                    <p
                                        className={`seller-shipping-status ${hasUnsavedShippingChanges ? 'dirty' : 'clean'}`}
                                    >
                                        {hasUnsavedShippingChanges
                                            ? 'Unsaved changes'
                                            : 'All changes saved'}
                                    </p>
                                </div>

                                <label className="seller-shipping-toggle">
                                    <input
                                        type="checkbox"
                                        checked={useRegistrationAddress}
                                        onChange={(event) =>
                                            handleUseRegistrationAddressToggle(
                                                event.target.checked,
                                            )
                                        }
                                    />
                                    <span>Same as registration address</span>
                                </label>

                                <div className="seller-shipping-grid">
                                    <div className="seller-input-wrap">
                                        <label className="seller-add-label">
                                            Shop Name
                                        </label>
                                        <input
                                            className="seller-input"
                                            value={shippingForm.shopName}
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    shopName:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Your shop name"
                                        />
                                    </div>
                                    <div className="seller-input-wrap">
                                        <label className="seller-add-label">
                                            Contact Email
                                        </label>
                                        <input
                                            className="seller-input"
                                            type="email"
                                            value={shippingForm.contactEmail}
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    contactEmail:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="shop@email.com"
                                        />
                                    </div>
                                    <div className="seller-input-wrap">
                                        <label className="seller-add-label">
                                            Contact Phone
                                        </label>
                                        <input
                                            className="seller-input"
                                            value={shippingForm.contactPhone}
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    contactPhone:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="09xxxxxxxxx"
                                        />
                                    </div>
                                    <div className="seller-input-wrap">
                                        <label className="seller-add-label">
                                            General Location
                                        </label>
                                        <input
                                            className="seller-input"
                                            value={shippingForm.generalLocation}
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    generalLocation:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="City, Province"
                                        />
                                    </div>
                                    <div className="seller-input-wrap">
                                        <label className="seller-add-label">
                                            ZIP Code
                                        </label>
                                        <input
                                            className="seller-input"
                                            value={shippingForm.zipCode}
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    zipCode: event.target.value,
                                                }))
                                            }
                                            placeholder="e.g. 1100"
                                        />
                                    </div>
                                    <div className="seller-input-wrap seller-add-grid-full">
                                        <label className="seller-add-label">
                                            Pickup Address Summary
                                        </label>
                                        <textarea
                                            className="seller-textarea"
                                            rows={4}
                                            value={
                                                shippingForm.pickupAddressSummary
                                            }
                                            onChange={(event) =>
                                                setShippingForm((prev) => ({
                                                    ...prev,
                                                    pickupAddressSummary:
                                                        event.target.value,
                                                }))
                                            }
                                            placeholder="Complete pickup address and landmark"
                                        />
                                    </div>
                                </div>

                                <div className="seller-product-edit-actions">
                                    <button
                                        type="button"
                                        className="seller-primary-btn"
                                        onClick={() => {
                                            void handleSaveShippingSettings();
                                        }}
                                        disabled={
                                            savingShippingSettings ||
                                            !hasUnsavedShippingChanges
                                        }
                                    >
                                        {savingShippingSettings
                                            ? 'Saving...'
                                            : 'Save Shipping Settings'}
                                    </button>
                                </div>
                            </article>
                        )}

                        {activeSection === 'orders' && <SellerOrdersSection />}

                        {activeSection === 'products' && (
                            <div className="seller-dashboard-grid">
                                <article className="seller-dashboard-card">
                                    <h3 className="seller-dashboard-card-title">
                                        Auctify Ads
                                    </h3>
                                    <p className="seller-dashboard-card-text">
                                        Promote your listings to increase
                                        product visibility and conversions.
                                    </p>
                                </article>

                                <article className="seller-dashboard-card">
                                    <h3 className="seller-dashboard-card-title">
                                        Affiliate Marketing
                                    </h3>
                                    <p className="seller-dashboard-card-text">
                                        Collaborate with affiliates and grow
                                        traffic using performance-based
                                        promotions.
                                    </p>
                                </article>

                                <article className="seller-dashboard-card">
                                    <h3 className="seller-dashboard-card-title">
                                        Livestream
                                    </h3>
                                    <p className="seller-dashboard-card-text">
                                        Host a live selling event and engage
                                        buyers in real-time.
                                    </p>
                                </article>

                                <article className="seller-dashboard-card">
                                    <h3 className="seller-dashboard-card-title">
                                        Campaigns
                                    </h3>
                                    <p className="seller-dashboard-card-text">
                                        Join upcoming campaigns and boost your
                                        product reach.
                                    </p>
                                </article>
                            </div>
                        )}
                    </div>

                    {activeSection === 'products' && (
                        <aside className="seller-dashboard-rail">
                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">
                                    Shop Performance
                                </h3>
                                <p className="seller-dashboard-card-text">
                                    3 metrics need your attention this week.
                                </p>
                            </article>
                            <article className="seller-dashboard-card seller-dashboard-announcements">
                                <h3 className="seller-dashboard-card-title">
                                    Announcements
                                </h3>
                                <ul className="seller-dashboard-notice-list">
                                    <li>
                                        Watch: compliance guidelines for online
                                        sellers
                                    </li>
                                    <li>
                                        Order packing standards session this
                                        Friday
                                    </li>
                                    <li>
                                        New campaign slots now open for eligible
                                        shops
                                    </li>
                                </ul>
                            </article>
                        </aside>
                    )}
                </div>
            </div>

            {isDetailDialogOpen && selectedProduct && (
                <div
                    className="seller-product-modal-backdrop"
                    onClick={closeProductDialog}
                    role="presentation"
                >
                    <div
                        className="seller-product-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Product details"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="seller-product-modal-header">
                            <h4 className="seller-product-detail-title">
                                Product Details
                            </h4>
                            <div className="seller-product-modal-actions">
                                <button
                                    type="button"
                                    className="seller-kebab-btn"
                                    onClick={() =>
                                        setIsActionMenuOpen((prev) => !prev)
                                    }
                                    aria-label="Product actions"
                                    aria-expanded={isActionMenuOpen}
                                >
                                    ⋮
                                </button>

                                {isActionMenuOpen && (
                                    <div
                                        className="seller-kebab-menu"
                                        role="menu"
                                    >
                                        <button
                                            type="button"
                                            className="seller-kebab-item"
                                            onClick={() => {
                                                setIsEditingProduct((prev) => {
                                                    const next = !prev;
                                                    if (
                                                        !next &&
                                                        selectedProduct
                                                    ) {
                                                        setEditForm(
                                                            mapProductToEditForm(
                                                                selectedProduct,
                                                            ),
                                                        );
                                                        setRemovedMediaIds([]);
                                                        additionalMediaEntries.forEach(
                                                            (entry) =>
                                                                URL.revokeObjectURL(
                                                                    entry.previewUrl,
                                                                ),
                                                        );
                                                        setAdditionalMediaEntries(
                                                            [],
                                                        );
                                                    }
                                                    return next;
                                                });
                                                setIsActionMenuOpen(false);
                                            }}
                                        >
                                            {isEditingProduct
                                                ? 'Exit Edit'
                                                : 'Edit'}
                                        </button>
                                        <button
                                            type="button"
                                            className="seller-kebab-item seller-kebab-item-danger"
                                            onClick={() => {
                                                setIsActionMenuOpen(false);
                                                void handleDeleteProduct();
                                            }}
                                            disabled={deletingProduct}
                                        >
                                            {deletingProduct
                                                ? 'Deleting...'
                                                : 'Delete'}
                                        </button>
                                        <button
                                            type="button"
                                            className="seller-kebab-item"
                                            onClick={() => {
                                                setIsActionMenuOpen(false);
                                                closeProductDialog();
                                            }}
                                        >
                                            Close
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {visibleExistingMedia.length > 0 ? (
                            <>
                                <div className="seller-product-featured-media-wrap">
                                    {visibleExistingMedia[activeMediaIndex]
                                        ?.media_type === 'video' ? (
                                        <video
                                            className="seller-product-featured-media"
                                            src={resolveMediaUrl(
                                                visibleExistingMedia[
                                                    activeMediaIndex
                                                ].url,
                                            )}
                                            controls
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            className={`seller-product-featured-media seller-product-featured-image ${
                                                isFeaturedImageZoomed
                                                    ? 'seller-product-featured-image-zoomed'
                                                    : ''
                                            }`}
                                            src={resolveMediaUrl(
                                                visibleExistingMedia[
                                                    activeMediaIndex
                                                ]?.url || '',
                                            )}
                                            alt={selectedProduct.title}
                                            onClick={handleFeaturedImageClick}
                                            title={
                                                isFeaturedImageZoomed
                                                    ? 'Click to zoom out'
                                                    : 'Click to zoom in'
                                            }
                                            style={{
                                                transformOrigin:
                                                    featuredImageZoomOrigin,
                                            }}
                                        />
                                    )}
                                </div>

                                <div className="seller-product-media-strip">
                                    {visibleExistingMedia.map(
                                        (media, index) => (
                                            <div
                                                key={media.id}
                                                className="seller-product-media-thumb-item"
                                            >
                                                <button
                                                    type="button"
                                                    className={`seller-product-media-thumb-btn ${activeMediaIndex === index ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setActiveMediaIndex(
                                                            index,
                                                        );
                                                        setIsFeaturedImageZoomed(
                                                            false,
                                                        );
                                                        setFeaturedImageZoomOrigin(
                                                            '50% 50%',
                                                        );
                                                    }}
                                                >
                                                    {media.media_type ===
                                                    'video' ? (
                                                        <video
                                                            className="seller-product-media-thumb"
                                                            src={resolveMediaUrl(
                                                                media.url,
                                                            )}
                                                            preload="metadata"
                                                        />
                                                    ) : (
                                                        <img
                                                            className="seller-product-media-thumb"
                                                            src={resolveMediaUrl(
                                                                media.url,
                                                            )}
                                                            alt={
                                                                selectedProduct.title
                                                            }
                                                        />
                                                    )}
                                                </button>
                                                {isEditingProduct && (
                                                    <button
                                                        type="button"
                                                        className="seller-product-media-delete-btn"
                                                        onClick={() =>
                                                            handleRemoveExistingMedia(
                                                                media.id,
                                                            )
                                                        }
                                                        title="Remove this media"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ),
                                    )}

                                    {isEditingProduct && (
                                        <button
                                            type="button"
                                            className="seller-product-media-add-box"
                                            onClick={
                                                handleOpenAddMoreMediaPicker
                                            }
                                            title="Add more images/videos"
                                        >
                                            <span className="seller-product-media-add-plus">
                                                +
                                            </span>
                                            <span className="seller-product-media-add-text">
                                                Add
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {isEditingProduct && (
                                    <input
                                        ref={addMoreMediaInputRef}
                                        type="file"
                                        className="seller-hidden-input"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={handleAddMoreMediaChange}
                                    />
                                )}

                                {isEditingProduct &&
                                    additionalMediaEntries.length > 0 && (
                                        <div className="seller-media-grid">
                                            {additionalMediaEntries.map(
                                                (entry) => (
                                                    <div
                                                        key={entry.id}
                                                        className="seller-media-item"
                                                    >
                                                        <div className="seller-media-preview">
                                                            {entry.type ===
                                                            'video' ? (
                                                                <video
                                                                    src={
                                                                        entry.previewUrl
                                                                    }
                                                                    controls
                                                                    className="seller-media-thumb"
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={
                                                                        entry.previewUrl
                                                                    }
                                                                    alt={
                                                                        entry
                                                                            .file
                                                                            .name
                                                                    }
                                                                    className="seller-media-thumb"
                                                                />
                                                            )}
                                                        </div>
                                                        <p
                                                            className="seller-media-name"
                                                            title={
                                                                entry.file.name
                                                            }
                                                        >
                                                            {entry.file.name}
                                                        </p>
                                                        <button
                                                            type="button"
                                                            className="seller-ghost-btn seller-media-remove"
                                                            onClick={() =>
                                                                handleRemoveQueuedMedia(
                                                                    entry.id,
                                                                )
                                                            }
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}

                                {isEditingProduct &&
                                    removedExistingMedia.length > 0 && (
                                        <div className="seller-removed-media-wrap">
                                            <p className="seller-product-detail-label">
                                                Removed media (not saved yet)
                                            </p>
                                            <div className="seller-removed-media-list">
                                                {removedExistingMedia.map(
                                                    (media) => (
                                                        <button
                                                            key={media.id}
                                                            type="button"
                                                            className="seller-removed-media-chip"
                                                            onClick={() =>
                                                                handleUndoRemoveExistingMedia(
                                                                    media.id,
                                                                )
                                                            }
                                                            title={`Undo remove • ${media.media_type === 'video' ? 'Video' : 'Image'} • ${getMediaFileName(media.file_path)}`}
                                                        >
                                                            Undo remove •{' '}
                                                            {media.media_type ===
                                                            'video'
                                                                ? 'Video'
                                                                : 'Image'}{' '}
                                                            •{' '}
                                                            {getMediaFileName(
                                                                media.file_path,
                                                            )}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </>
                        ) : (
                            <div className="seller-product-featured-media-wrap seller-product-featured-media-empty">
                                <div className="seller-product-featured-media-placeholder">
                                    No media uploaded for this product.
                                </div>
                            </div>
                        )}

                        {isEditingProduct ? (
                            <>
                                <div className="seller-product-detail-grid">
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Name
                                        </p>
                                        <input
                                            className="seller-input"
                                            value={editForm.title}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    title: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Category
                                        </p>
                                        <select
                                            className="seller-input"
                                            value={editForm.category}
                                            onChange={(event) => {
                                                const nextCategory =
                                                    event.target.value;
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    category: nextCategory,
                                                    subcategory: '',
                                                }));
                                            }}
                                        >
                                            <option value="">
                                                Select category
                                            </option>
                                            {HOME_CATEGORY_OPTIONS.map(
                                                (option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Subcategory
                                        </p>
                                        <select
                                            className="seller-input"
                                            value={editForm.subcategory}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    subcategory:
                                                        event.target.value,
                                                }))
                                            }
                                            disabled={!editForm.category}
                                        >
                                            <option value="">
                                                Select subcategory
                                            </option>
                                            {editSubcategoryOptions.map(
                                                (option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Starting Price
                                        </p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="seller-input"
                                            value={editForm.startingPrice}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    startingPrice:
                                                        event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Maximum Increment
                                        </p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="seller-input"
                                            value={editForm.maxIncrement}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    maxIncrement:
                                                        event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Status
                                        </p>
                                        <select
                                            className="seller-input"
                                            value={editForm.status}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    status: event.target
                                                        .value as
                                                        | 'open'
                                                        | 'closed',
                                                }))
                                            }
                                        >
                                            <option value="open">Open</option>
                                            <option value="closed">
                                                Closed
                                            </option>
                                        </select>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Ends At
                                        </p>
                                        <input
                                            type="datetime-local"
                                            className="seller-input"
                                            value={editForm.endsAt}
                                            onChange={(event) =>
                                                setEditForm((prev) => ({
                                                    ...prev,
                                                    endsAt: event.target.value,
                                                }))
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="seller-product-detail-description">
                                    <p className="seller-product-detail-label">
                                        Description
                                    </p>
                                    <textarea
                                        className="seller-textarea"
                                        rows={4}
                                        value={editForm.description}
                                        onChange={(event) =>
                                            setEditForm((prev) => ({
                                                ...prev,
                                                description: event.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <p className="seller-media-help seller-media-help-inline">
                                    {visibleExistingMedia.length +
                                        additionalMediaEntries.length}
                                    /{MAX_MEDIA_ENTRIES} total media
                                </p>

                                <div className="seller-product-edit-actions">
                                    <button
                                        type="button"
                                        className="seller-ghost-btn"
                                        onClick={() => {
                                            setIsEditingProduct(false);
                                            if (selectedProduct) {
                                                setEditForm(
                                                    mapProductToEditForm(
                                                        selectedProduct,
                                                    ),
                                                );
                                            }
                                            setRemovedMediaIds([]);
                                            additionalMediaEntries.forEach(
                                                (entry) =>
                                                    URL.revokeObjectURL(
                                                        entry.previewUrl,
                                                    ),
                                            );
                                            setAdditionalMediaEntries([]);
                                        }}
                                    >
                                        Cancel Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="seller-primary-btn"
                                        onClick={handleSaveProductChanges}
                                        disabled={savingProduct}
                                    >
                                        {savingProduct
                                            ? 'Saving...'
                                            : 'Save Changes'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="seller-product-detail-grid">
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Name
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {selectedProduct.title}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Category
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {getCategoryLabel(
                                                selectedProduct.category,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Subcategory
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {getSubcategoryLabel(
                                                selectedProduct.category,
                                                selectedProduct.subcategory,
                                            ) || 'Not specified'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Starting Price
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatPeso(
                                                selectedProduct.starting_price,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Maximum Increment
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatPeso(
                                                selectedProduct.max_increment,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Current Price
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatPeso(
                                                selectedProduct.current_price,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Status
                                        </p>
                                        <p className="seller-product-detail-value seller-product-detail-value-capitalize">
                                            {getProductDisplayStatus(
                                                selectedProduct,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Starts At
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatDate(
                                                selectedProduct.starts_at ??
                                                    undefined,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Ends At
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatDate(
                                                selectedProduct.ends_at,
                                            )}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">
                                            Created At
                                        </p>
                                        <p className="seller-product-detail-value">
                                            {formatDate(
                                                selectedProduct.created_at,
                                            )}
                                        </p>
                                    </div>
                                    <div className="seller-product-detail-live-wrap">
                                        <p className="seller-product-detail-label">
                                            Live Bid Timer
                                        </p>
                                        <div className="seller-product-detail-live-grid">
                                            <div className="seller-product-detail-live-item">
                                                <p className="seller-product-detail-live-label">
                                                    Start
                                                </p>
                                                <p className="seller-product-detail-live-value">
                                                    {selectedProductStartsAt &&
                                                    selectedProductStartsAt >
                                                        now
                                                        ? `Starts in ${formatRelativeTime(selectedProductStartsAt, now, 'until')}`
                                                        : `Started ${formatRelativeTime(selectedProductStartsAt, now, 'since')} ago`}
                                                </p>
                                            </div>
                                            <div className="seller-product-detail-live-item">
                                                <p className="seller-product-detail-live-label">
                                                    End
                                                </p>
                                                <p className="seller-product-detail-live-value">
                                                    {selectedProductEndsAt &&
                                                    selectedProductEndsAt > now
                                                        ? `Ends in ${formatRelativeTime(selectedProductEndsAt, now, 'until')}`
                                                        : `Ended ${formatRelativeTime(selectedProductEndsAt, now, 'since')} ago`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="seller-product-detail-description">
                                    <p className="seller-product-detail-label">
                                        Description
                                    </p>
                                    <p className="seller-product-detail-value">
                                        {selectedProduct.description?.trim()
                                            ? selectedProduct.description
                                            : 'No description provided.'}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};
