import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { HOME_CATEGORY_OPTIONS } from '../../lib/homeCategories';
import { sellerService } from '../../services/api';
import type { AuctionProduct } from '../../types';

interface SellerDashboardPageProps {
    onNavigateAddProduct: () => void;
}

export const SellerDashboardPage: React.FC<SellerDashboardPageProps> = ({ onNavigateAddProduct }) => {
    const MAX_MEDIA_ENTRIES = 10;
    const { authUser } = useAuth();
    const [products, setProducts] = useState<AuctionProduct[]>([]);
    const [productFilter, setProductFilter] = useState<'all' | 'open' | 'closed' | 'scheduled'>('all');
    const [loadingProducts, setLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<AuctionProduct | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [activeMediaIndex, setActiveMediaIndex] = useState(0);
    const [isFeaturedImageZoomed, setIsFeaturedImageZoomed] = useState(false);
    const [featuredImageZoomOrigin, setFeaturedImageZoomOrigin] = useState('50% 50%');
    const [isEditingProduct, setIsEditingProduct] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [savingProduct, setSavingProduct] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(false);
    const [removedMediaIds, setRemovedMediaIds] = useState<number[]>([]);
    const addMoreMediaInputRef = useRef<HTMLInputElement | null>(null);
    const [additionalMediaEntries, setAdditionalMediaEntries] = useState<
        Array<{ id: string; file: File; previewUrl: string; type: 'image' | 'video' }>
    >([]);
    const [editForm, setEditForm] = useState({
        title: '',
        category: '',
        description: '',
        startingPrice: '',
        maxIncrement: '',
        status: 'open' as 'open' | 'closed',
        endsAt: '',
    });

    function getProductDisplayStatus(product: AuctionProduct): 'open' | 'closed' | 'scheduled' {
        if (product.status === 'closed') {
            return 'closed';
        }

        const now = new Date();
        const endsAt = product.ends_at ? new Date(product.ends_at) : null;
        if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt <= now) {
            return 'closed';
        }

        const startsAt = product.starts_at ? new Date(product.starts_at) : null;
        if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now) {
            return 'scheduled';
        }

        return 'open';
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

    const toIsoFromDateTimeLocal = (value: string) => {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toISOString();
    };

    const mapProductToEditForm = (product: AuctionProduct) => ({
        title: product.title ?? '',
        category: product.category ?? '',
        description: product.description ?? '',
        startingPrice: String(product.starting_price ?? ''),
        maxIncrement: String(product.max_increment ?? ''),
        status: product.status ?? 'open',
        endsAt: formatDateTimeLocal(product.ends_at),
    });

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

    const refreshProducts = async () => {
        setLoadingProducts(true);
        setProductsError('');

        try {
            const data = await sellerService.getMyProducts();
            setProducts(data);

            if (selectedProduct) {
                const updatedSelected = data.find((item) => item.id === selectedProduct.id) ?? null;
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
        const openCount = products.filter((product) => getProductDisplayStatus(product) === 'open').length;
        const closedCount = products.filter((product) => getProductDisplayStatus(product) === 'closed').length;
        const scheduledCount = products.filter((product) => getProductDisplayStatus(product) === 'scheduled').length;

        return {
            total: products.length,
            open: openCount,
            closed: closedCount,
            scheduled: scheduledCount,
        };
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (productFilter === 'all') {
            return products;
        }

        return products.filter((product) => getProductDisplayStatus(product) === productFilter);
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

        const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '');
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
        additionalMediaEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
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

        if (!isEditingProduct || removedMediaIds.length === 0) {
            return selectedProduct.media;
        }

        const removedSet = new Set(removedMediaIds);
        return selectedProduct.media.filter((media) => !removedSet.has(media.id));
    }, [isEditingProduct, removedMediaIds, selectedProduct]);

    const removedExistingMedia = useMemo(() => {
        if (!selectedProduct?.media?.length || removedMediaIds.length === 0) {
            return [];
        }

        const removedSet = new Set(removedMediaIds);
        return selectedProduct.media.filter((media) => removedSet.has(media.id));
    }, [removedMediaIds, selectedProduct]);

    useEffect(() => {
        if (activeMediaIndex >= visibleExistingMedia.length) {
            setActiveMediaIndex(Math.max(0, visibleExistingMedia.length - 1));
        }
    }, [activeMediaIndex, visibleExistingMedia.length]);

    const handleAddMoreMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedProduct) {
            return;
        }

        const selectedFiles = Array.from(event.target.files ?? []);
        if (selectedFiles.length === 0) {
            return;
        }

        const existingCount = visibleExistingMedia.length;

        setAdditionalMediaEntries((prevEntries) => {
            const remainingSlots = MAX_MEDIA_ENTRIES - existingCount - prevEntries.length;

            if (remainingSlots <= 0) {
                toast.error('This product already reached the maximum of 10 media files.');
                return prevEntries;
            }

            const validFiles = selectedFiles
                .filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
                .slice(0, remainingSlots);

            if (validFiles.length !== selectedFiles.length) {
                toast.warn('Only image/video files are allowed, with a maximum total of 10 media files.');
            }

            const newEntries = validFiles.map((file, index) => ({
                id: `${Date.now()}-${index}-${file.name}`,
                file,
                previewUrl: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'video' : 'image' as 'image' | 'video',
            }));

            return [...prevEntries, ...newEntries];
        });

        event.target.value = '';
    };

    const handleRemoveQueuedMedia = (entryId: string) => {
        setAdditionalMediaEntries((prevEntries) => {
            const mediaToRemove = prevEntries.find((entry) => entry.id === entryId);
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

        setRemovedMediaIds((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
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

    const handleFeaturedImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
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

        const endsAtIso = toIsoFromDateTimeLocal(editForm.endsAt);
        if (!endsAtIso || new Date(endsAtIso) <= new Date()) {
            toast.error('End date and time must be in the future.');
            return;
        }

        setSavingProduct(true);
        try {
            const formData = new FormData();
            formData.append('title', editForm.title.trim());
            formData.append('category', editForm.category);
            formData.append('description', editForm.description.trim());
            formData.append('starting_price', String(startPrice));
            formData.append('max_increment', String(increment));
            formData.append('ends_at', endsAtIso);
            formData.append('status', editForm.status);

            removedMediaIds.forEach((id) => {
                formData.append('removed_media_ids[]', String(id));
            });

            additionalMediaEntries.forEach((entry) => {
                formData.append('media[]', entry.file);
            });

            const updated = await sellerService.updateProduct(selectedProduct.id, formData);

            setSelectedProduct(updated);
            setEditForm(mapProductToEditForm(updated));
            setProducts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
            setIsEditingProduct(false);
            setRemovedMediaIds([]);
            additionalMediaEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
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

        const confirmed = window.confirm('Delete this product? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        setDeletingProduct(true);
        try {
            await sellerService.deleteProduct(selectedProduct.id);
            setProducts((prev) => prev.filter((item) => item.id !== selectedProduct.id));
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

    return (
        <section className="seller-dashboard-page">
            <aside className="seller-dashboard-sidebar">
                <h3 className="seller-dashboard-brand">Seller Center</h3>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Order</p>
                    <button type="button" className="seller-dashboard-link">My Orders</button>
                    <button type="button" className="seller-dashboard-link">Mass Ship</button>
                    <button type="button" className="seller-dashboard-link">Shipping Setting</button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Product</p>
                    <button type="button" className="seller-dashboard-link seller-dashboard-link-active">My Products</button>
                    <button type="button" className="seller-dashboard-link" onClick={onNavigateAddProduct}>
                        Add New Product
                    </button>
                </div>
                <div className="seller-dashboard-group">
                    <p className="seller-dashboard-group-title">Marketing</p>
                    <button type="button" className="seller-dashboard-link">Campaign</button>
                    <button type="button" className="seller-dashboard-link">Best Price</button>
                </div>
            </aside>

            <div className="seller-dashboard-main">
                <header className="seller-dashboard-topbar">
                    <div>
                        <h2>Seller Dashboard</h2>
                        <p className="seller-dashboard-subtext">Manage orders, products, and campaigns in one place.</p>
                    </div>
                    <div className="seller-dashboard-topbar-right">
                        <div className="seller-dashboard-profile">{authUser?.name || 'Seller'}</div>
                        <button type="button" className="seller-primary-btn" onClick={onNavigateAddProduct}>
                            New Product
                        </button>
                    </div>
                </header>

                <div className="seller-dashboard-layout">
                    <div className="seller-dashboard-content">
                        <article className="seller-dashboard-card seller-dashboard-card-wide">
                            <h3 className="seller-dashboard-card-title">To Do List</h3>
                            <div className="seller-dashboard-stats">
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">To-Process Shipment</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Processed Shipment</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Return/Refund/Cancel</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Banned Products</p>
                                </div>
                            </div>
                        </article>

                        <article className="seller-dashboard-card seller-dashboard-card-wide seller-dashboard-highlight">
                            <h3 className="seller-dashboard-card-title">Business Insights</h3>
                            <div className="seller-dashboard-stats">
                                <div>
                                    <p className="seller-dashboard-stat-value">₱0</p>
                                    <p className="seller-dashboard-stat-label">Sales</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Visitors</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Page Views</p>
                                </div>
                                <div>
                                    <p className="seller-dashboard-stat-value">0</p>
                                    <p className="seller-dashboard-stat-label">Orders</p>
                                </div>
                            </div>
                        </article>

                        <article className="seller-dashboard-card seller-dashboard-card-wide">
                            <div className="seller-products-head">
                                <div>
                                    <h3 className="seller-dashboard-card-title">My Products</h3>
                                    <p className="seller-dashboard-card-text">
                                        All products you added in Seller Center are listed here.
                                    </p>
                                </div>
                                <div className="seller-products-filters">
                                    <select
                                        className="seller-input"
                                        value={productFilter}
                                        onChange={(event) => setProductFilter(event.target.value as 'all' | 'open' | 'closed' | 'scheduled')}
                                    >
                                        <option value="all">All</option>
                                        <option value="open">Open</option>
                                        <option value="closed">Closed</option>
                                        <option value="scheduled">Scheduled</option>
                                    </select>
                                </div>
                            </div>

                            <div className="seller-products-summary">
                                <div className="seller-products-summary-item">
                                    <p className="seller-dashboard-stat-value">{productSummary.total}</p>
                                    <p className="seller-dashboard-stat-label">Total Products</p>
                                </div>
                                <div className="seller-products-summary-item">
                                    <p className="seller-dashboard-stat-value">{productSummary.open}</p>
                                    <p className="seller-dashboard-stat-label">Open</p>
                                </div>
                                <div className="seller-products-summary-item">
                                    <p className="seller-dashboard-stat-value">{productSummary.closed}</p>
                                    <p className="seller-dashboard-stat-label">Closed</p>
                                </div>
                                <div className="seller-products-summary-item">
                                    <p className="seller-dashboard-stat-value">{productSummary.scheduled}</p>
                                    <p className="seller-dashboard-stat-label">Scheduled</p>
                                </div>
                            </div>

                            {loadingProducts && <p className="seller-products-state">Loading your products...</p>}
                            {!loadingProducts && productsError && <p className="seller-products-state seller-products-state-error">{productsError}</p>}

                            {!loadingProducts && !productsError && filteredProducts.length === 0 && (
                                <div className="seller-products-empty">
                                    <p className="seller-dashboard-card-text">
                                        {products.length === 0 ? 'You have not added any products yet.' : 'No products match the selected filter.'}
                                    </p>
                                </div>
                            )}

                            {!loadingProducts && !productsError && filteredProducts.length > 0 && (
                                <div className="seller-products-grid">
                                    {filteredProducts.map((product) => {
                                        const firstMedia = product.media?.[0];
                                        const isSelected = selectedProduct?.id === product.id;
                                        const displayStatus = getProductDisplayStatus(product);

                                        return (
                                            <article
                                                key={product.id}
                                                className={`seller-product-card ${isSelected ? 'seller-product-card-active' : ''}`}
                                                onClick={() => openProductDialog(product)}
                                                onKeyDown={(event) => event.key === 'Enter' && openProductDialog(product)}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <div className="seller-product-media-wrap">
                                                    {firstMedia ? (
                                                        firstMedia.media_type === 'video' ? (
                                                            <video className="seller-product-media" src={resolveMediaUrl(firstMedia.url)} controls preload="metadata" />
                                                        ) : (
                                                            <img className="seller-product-media" src={resolveMediaUrl(firstMedia.url)} alt={product.title} />
                                                        )
                                                    ) : (
                                                        <div className="seller-product-media seller-product-media-placeholder">No Media</div>
                                                    )}
                                                </div>
                                                <div className="seller-product-body">
                                                    <div className="seller-product-title-row">
                                                        <h4 className="seller-product-title">{product.title}</h4>
                                                        <span className={`seller-product-status seller-product-status-${displayStatus}`}>
                                                            {displayStatus}
                                                        </span>
                                                    </div>
                                                    <p className="seller-product-category">{product.category || 'Uncategorized'}</p>
                                                    <div className="seller-product-pricing">
                                                        <p>Start: {formatPeso(product.starting_price)}</p>
                                                        <p>Max Increment: {formatPeso(product.max_increment)}</p>
                                                    </div>
                                                    <p className="seller-product-view-hint">Click to view full details</p>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </article>

                        <div className="seller-dashboard-grid">
                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Auctify Ads</h3>
                                <p className="seller-dashboard-card-text">
                                    Promote your listings to increase product visibility and conversions.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Affiliate Marketing</h3>
                                <p className="seller-dashboard-card-text">
                                    Collaborate with affiliates and grow traffic using performance-based promotions.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Livestream</h3>
                                <p className="seller-dashboard-card-text">
                                    Host a live selling event and engage buyers in real-time.
                                </p>
                            </article>

                            <article className="seller-dashboard-card">
                                <h3 className="seller-dashboard-card-title">Campaigns</h3>
                                <p className="seller-dashboard-card-text">
                                    Join upcoming campaigns and boost your product reach.
                                </p>
                            </article>
                        </div>
                    </div>

                    <aside className="seller-dashboard-rail">
                        <article className="seller-dashboard-card">
                            <h3 className="seller-dashboard-card-title">Shop Performance</h3>
                            <p className="seller-dashboard-card-text">3 metrics need your attention this week.</p>
                        </article>
                        <article className="seller-dashboard-card seller-dashboard-announcements">
                            <h3 className="seller-dashboard-card-title">Announcements</h3>
                            <ul className="seller-dashboard-notice-list">
                                <li>Watch: compliance guidelines for online sellers</li>
                                <li>Order packing standards session this Friday</li>
                                <li>New campaign slots now open for eligible shops</li>
                            </ul>
                        </article>
                    </aside>
                </div>
            </div>

            {isDetailDialogOpen && selectedProduct && (
                <div className="seller-product-modal-backdrop" onClick={closeProductDialog} role="presentation">
                    <div
                        className="seller-product-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Product details"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="seller-product-modal-header">
                            <h4 className="seller-product-detail-title">Product Details</h4>
                            <div className="seller-product-modal-actions">
                                <button
                                    type="button"
                                    className="seller-kebab-btn"
                                    onClick={() => setIsActionMenuOpen((prev) => !prev)}
                                    aria-label="Product actions"
                                    aria-expanded={isActionMenuOpen}
                                >
                                    ⋮
                                </button>

                                {isActionMenuOpen && (
                                    <div className="seller-kebab-menu" role="menu">
                                        <button
                                            type="button"
                                            className="seller-kebab-item"
                                            onClick={() => {
                                                setIsEditingProduct((prev) => {
                                                    const next = !prev;
                                                    if (!next && selectedProduct) {
                                                        setEditForm(mapProductToEditForm(selectedProduct));
                                                        setRemovedMediaIds([]);
                                                        additionalMediaEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
                                                        setAdditionalMediaEntries([]);
                                                    }
                                                    return next;
                                                });
                                                setIsActionMenuOpen(false);
                                            }}
                                        >
                                            {isEditingProduct ? 'Exit Edit' : 'Edit'}
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
                                            {deletingProduct ? 'Deleting...' : 'Delete'}
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
                                    {visibleExistingMedia[activeMediaIndex]?.media_type === 'video' ? (
                                        <video
                                            className="seller-product-featured-media"
                                            src={resolveMediaUrl(visibleExistingMedia[activeMediaIndex].url)}
                                            controls
                                            preload="metadata"
                                        />
                                    ) : (
                                        <img
                                            className={`seller-product-featured-media seller-product-featured-image ${
                                                isFeaturedImageZoomed ? 'seller-product-featured-image-zoomed' : ''
                                            }`}
                                            src={resolveMediaUrl(visibleExistingMedia[activeMediaIndex]?.url || '')}
                                            alt={selectedProduct.title}
                                            onClick={handleFeaturedImageClick}
                                            title={isFeaturedImageZoomed ? 'Click to zoom out' : 'Click to zoom in'}
                                            style={{ transformOrigin: featuredImageZoomOrigin }}
                                        />
                                    )}
                                </div>

                                <div className="seller-product-media-strip">
                                    {visibleExistingMedia.map((media, index) => (
                                        <div key={media.id} className="seller-product-media-thumb-item">
                                            <button
                                                type="button"
                                                className={`seller-product-media-thumb-btn ${activeMediaIndex === index ? 'active' : ''}`}
                                                onClick={() => {
                                                    setActiveMediaIndex(index);
                                                    setIsFeaturedImageZoomed(false);
                                                    setFeaturedImageZoomOrigin('50% 50%');
                                                }}
                                            >
                                                {media.media_type === 'video' ? (
                                                    <video className="seller-product-media-thumb" src={resolveMediaUrl(media.url)} preload="metadata" />
                                                ) : (
                                                    <img className="seller-product-media-thumb" src={resolveMediaUrl(media.url)} alt={selectedProduct.title} />
                                                )}
                                            </button>
                                            {isEditingProduct && (
                                                <button
                                                    type="button"
                                                    className="seller-product-media-delete-btn"
                                                    onClick={() => handleRemoveExistingMedia(media.id)}
                                                    title="Remove this media"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {isEditingProduct && (
                                        <button
                                            type="button"
                                            className="seller-product-media-add-box"
                                            onClick={handleOpenAddMoreMediaPicker}
                                            title="Add more images/videos"
                                        >
                                            <span className="seller-product-media-add-plus">+</span>
                                            <span className="seller-product-media-add-text">Add</span>
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

                                {isEditingProduct && additionalMediaEntries.length > 0 && (
                                    <div className="seller-media-grid">
                                        {additionalMediaEntries.map((entry) => (
                                            <div key={entry.id} className="seller-media-item">
                                                <div className="seller-media-preview">
                                                    {entry.type === 'video' ? (
                                                        <video src={entry.previewUrl} controls className="seller-media-thumb" />
                                                    ) : (
                                                        <img src={entry.previewUrl} alt={entry.file.name} className="seller-media-thumb" />
                                                    )}
                                                </div>
                                                <p className="seller-media-name" title={entry.file.name}>{entry.file.name}</p>
                                                <button
                                                    type="button"
                                                    className="seller-ghost-btn seller-media-remove"
                                                    onClick={() => handleRemoveQueuedMedia(entry.id)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isEditingProduct && removedExistingMedia.length > 0 && (
                                    <div className="seller-removed-media-wrap">
                                        <p className="seller-product-detail-label">Removed media (not saved yet)</p>
                                        <div className="seller-removed-media-list">
                                            {removedExistingMedia.map((media) => (
                                                <button
                                                    key={media.id}
                                                    type="button"
                                                    className="seller-removed-media-chip"
                                                    onClick={() => handleUndoRemoveExistingMedia(media.id)}
                                                    title={`Undo remove • ${media.media_type === 'video' ? 'Video' : 'Image'} • ${getMediaFileName(media.file_path)}`}
                                                >
                                                    Undo remove • {media.media_type === 'video' ? 'Video' : 'Image'} • {getMediaFileName(media.file_path)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="seller-product-featured-media-wrap seller-product-featured-media-empty">
                                <div className="seller-product-featured-media-placeholder">No media uploaded for this product.</div>
                            </div>
                        )}

                        {isEditingProduct ? (
                            <>
                                <div className="seller-product-detail-grid">
                                    <div>
                                        <p className="seller-product-detail-label">Name</p>
                                        <input
                                            className="seller-input"
                                            value={editForm.title}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Category</p>
                                        <select
                                            className="seller-input"
                                            value={editForm.category}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                                        >
                                            <option value="">Select category</option>
                                            {HOME_CATEGORY_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Starting Price</p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="seller-input"
                                            value={editForm.startingPrice}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, startingPrice: event.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Maximum Increment</p>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="seller-input"
                                            value={editForm.maxIncrement}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, maxIncrement: event.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Status</p>
                                        <select
                                            className="seller-input"
                                            value={editForm.status}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value as 'open' | 'closed' }))}
                                        >
                                            <option value="open">Open</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Ends At</p>
                                        <input
                                            type="datetime-local"
                                            className="seller-input"
                                            value={editForm.endsAt}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="seller-product-detail-description">
                                    <p className="seller-product-detail-label">Description</p>
                                    <textarea
                                        className="seller-textarea"
                                        rows={4}
                                        value={editForm.description}
                                        onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                                    />
                                </div>

                                <p className="seller-media-help seller-media-help-inline">
                                    {visibleExistingMedia.length + additionalMediaEntries.length}/{MAX_MEDIA_ENTRIES} total media
                                </p>

                                <div className="seller-product-edit-actions">
                                    <button
                                        type="button"
                                        className="seller-ghost-btn"
                                        onClick={() => {
                                            setIsEditingProduct(false);
                                            if (selectedProduct) {
                                                setEditForm(mapProductToEditForm(selectedProduct));
                                            }
                                            setRemovedMediaIds([]);
                                            additionalMediaEntries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
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
                                        {savingProduct ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="seller-product-detail-grid">
                                    <div>
                                        <p className="seller-product-detail-label">Name</p>
                                        <p className="seller-product-detail-value">{selectedProduct.title}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Category</p>
                                        <p className="seller-product-detail-value">{selectedProduct.category || 'Uncategorized'}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Starting Price</p>
                                        <p className="seller-product-detail-value">{formatPeso(selectedProduct.starting_price)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Maximum Increment</p>
                                        <p className="seller-product-detail-value">{formatPeso(selectedProduct.max_increment)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Current Price</p>
                                        <p className="seller-product-detail-value">{formatPeso(selectedProduct.current_price)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Status</p>
                                        <p className="seller-product-detail-value seller-product-detail-value-capitalize">{getProductDisplayStatus(selectedProduct)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Starts At</p>
                                        <p className="seller-product-detail-value">{formatDate(selectedProduct.starts_at ?? undefined)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Ends At</p>
                                        <p className="seller-product-detail-value">{formatDate(selectedProduct.ends_at)}</p>
                                    </div>
                                    <div>
                                        <p className="seller-product-detail-label">Created At</p>
                                        <p className="seller-product-detail-value">{formatDate(selectedProduct.created_at)}</p>
                                    </div>
                                </div>

                                <div className="seller-product-detail-description">
                                    <p className="seller-product-detail-label">Description</p>
                                    <p className="seller-product-detail-value">
                                        {selectedProduct.description?.trim() ? selectedProduct.description : 'No description provided.'}
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
