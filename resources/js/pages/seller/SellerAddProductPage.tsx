import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HOME_CATEGORY_OPTIONS, getSubcategoryLabel, getSubcategoryOptions } from '../../lib/homeCategories';
import { sellerService } from '../../services/api';

interface SellerAddProductPageProps {
    onNavigateDashboard: () => void;
}

export const SellerAddProductPage: React.FC<SellerAddProductPageProps> = ({ onNavigateDashboard }) => {
    const MAX_MEDIA_ENTRIES = 10;
    const formatDateTimeForApi = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
    const [scheduledStartDateTime, setScheduledStartDateTime] = useState('');
    const [endTimeMode, setEndTimeMode] = useState<'days' | 'hours' | 'minutes'>('days');
    const [endTimeValue, setEndTimeValue] = useState('7');
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [startingPrice, setStartingPrice] = useState('');
    const [maxIncrement, setMaxIncrement] = useState('');
    const [description, setDescription] = useState('');
    const [mediaEntries, setMediaEntries] = useState<Array<{ id: string; file: File; previewUrl: string; type: 'image' | 'video' }>>([]);
    const [mediaError, setMediaError] = useState('');
    const [saving, setSaving] = useState(false);
    const mediaEntriesRef = useRef(mediaEntries);

    useEffect(() => {
        mediaEntriesRef.current = mediaEntries;
    }, [mediaEntries]);

    useEffect(() => {
        return () => {
            mediaEntriesRef.current.forEach((entry) => {
                URL.revokeObjectURL(entry.previewUrl);
            });
        };
    }, []);

    const handleMediaChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files ?? []);

        if (selectedFiles.length === 0) {
            return;
        }

        setMediaError('');

        setMediaEntries((prevEntries) => {
            const remainingSlots = MAX_MEDIA_ENTRIES - prevEntries.length;

            if (remainingSlots <= 0) {
                setMediaError('You can upload up to 10 media files only.');
                return prevEntries;
            }

            const validFiles = selectedFiles
                .filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
                .slice(0, remainingSlots);

            if (validFiles.length !== selectedFiles.length) {
                setMediaError('Only image and video files are allowed, with a maximum of 10 entries.');
            }

            const nextEntries = validFiles.map((file, index) => ({
                id: `${Date.now()}-${index}-${file.name}`,
                file,
                previewUrl: URL.createObjectURL(file),
                type: file.type.startsWith('video/') ? 'video' : 'image' as 'image' | 'video',
            }));

            return [...prevEntries, ...nextEntries];
        });

        event.target.value = '';
    };

    const handleRemoveMedia = (entryId: string) => {
        setMediaEntries((prevEntries) => {
            const entryToRemove = prevEntries.find((entry) => entry.id === entryId);
            if (entryToRemove) {
                URL.revokeObjectURL(entryToRemove.previewUrl);
            }
            return prevEntries.filter((entry) => entry.id !== entryId);
        });
    };

    const getDurationMs = (mode: 'days' | 'hours' | 'minutes', value: number) => {
        if (mode === 'hours') {
            return value * 60 * 60 * 1000;
        }

        if (mode === 'minutes') {
            return value * 60 * 1000;
        }

        return value * 24 * 60 * 60 * 1000;
    };

    const buildBidSchedule = () => {
        const now = new Date();
        let startsAt = now;

        if (startMode === 'scheduled') {
            if (!scheduledStartDateTime) {
                return { error: 'Please choose when bidding should start.' };
            }

            const scheduledDate = new Date(scheduledStartDateTime);
            if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= now) {
                return { error: 'Scheduled start time must be a valid future date and time.' };
            }

            startsAt = scheduledDate;
        }

        const durationValue = Number.parseInt(endTimeValue, 10);
        if (!Number.isInteger(durationValue) || durationValue <= 0) {
            return { error: `Please enter a valid number of ${endTimeMode}.` };
        }

        const endsAt = new Date(startsAt.getTime() + getDurationMs(endTimeMode, durationValue));
        if (endsAt <= startsAt) {
            return { error: 'End date and time must be after the bidding start time.' };
        }

        return { startsAt, endsAt };
    };

    const formatSchedulePreview = (date: Date) => {
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(date);
    };

    const bidSchedulePreview = useMemo(() => {
        const schedule = buildBidSchedule();
        if ('error' in schedule) {
            return schedule.error;
        }

        return `Bidding will run from ${formatSchedulePreview(schedule.startsAt)} to ${formatSchedulePreview(schedule.endsAt)}.`;
    }, [startMode, scheduledStartDateTime, endTimeMode, endTimeValue]);

    const durationModeMeaning = useMemo(() => {
        if (endTimeMode === 'hours') {
            return 'Example: 1 hour means bidding ends 1 hour after the selected start time.';
        }

        if (endTimeMode === 'minutes') {
            return 'Example: 30 minutes means bidding ends 30 minutes after the selected start time.';
        }

        return 'Example: 2 days means bidding ends exactly 2 days after the selected start time.';
    }, [endTimeMode]);

    const subcategoryOptions = useMemo(() => getSubcategoryOptions(category), [category]);

    const handleSaveProduct = async () => {
        if (!productName.trim()) {
            toast.error('Product name is required.');
            return;
        }

        if (!category) {
            toast.error('Please select a category.');
            return;
        }

        if (!subcategory) {
            toast.error('Please select a subcategory.');
            return;
        }

        if (!startingPrice || Number(startingPrice) <= 0) {
            toast.error('Starting price must be greater than 0.');
            return;
        }

        if (!maxIncrement || Number(maxIncrement) < 0) {
            toast.error('Maximum increment must be 0 or higher.');
            return;
        }

        if (mediaEntries.length > MAX_MEDIA_ENTRIES) {
            toast.error('Maximum of 10 media files is allowed.');
            return;
        }

        const schedule = buildBidSchedule();
        if ('error' in schedule) {
            toast.error(schedule.error);
            return;
        }

        const startsAtIso = formatDateTimeForApi(schedule.startsAt);

        const formData = new FormData();
        formData.append('title', productName.trim());
        formData.append('category', category);
        formData.append('subcategory', subcategory);
        formData.append('starting_price', startingPrice);
        formData.append('max_increment', maxIncrement);
        formData.append('description', description.trim());
        formData.append('start_mode', startMode);
        formData.append('end_time_mode', endTimeMode);
        formData.append('end_time_value', endTimeValue);

        // Backend is the source of truth for schedule math to avoid client-side drift.
        if (startMode === 'scheduled') {
            formData.append('starts_at', startsAtIso);
        }

        const mediaEntriesOrderedForDisplay = [...mediaEntries].sort((left, right) => {
            const leftIsVideo = left.file.type.startsWith('video/');
            const rightIsVideo = right.file.type.startsWith('video/');

            if (leftIsVideo === rightIsVideo) {
                return 0;
            }

            return leftIsVideo ? -1 : 1;
        });

        mediaEntriesOrderedForDisplay.forEach((entry) => {
            formData.append('media[]', entry.file);
        });

        setSaving(true);
        try {
            await sellerService.createProduct(formData);
            toast.success('Product listed successfully.');
            onNavigateDashboard();
        } catch (error) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to save product. Please try again.';
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="seller-add-page">
            <div className="page-breadcrumb seller-add-breadcrumb">
                <button type="button" onClick={() => onNavigateDashboard()}>Seller Dashboard</button>
                <span>›</span>
                <span className="page-breadcrumb-current">Add Product</span>
            </div>

            <div className="seller-add-header">
                <div>
                    <h2>Add New Product</h2>
                    <p className="seller-add-subtitle">Create a polished listing with strong visuals, clear pricing, and the right auction timing.</p>
                </div>
                <div className="seller-add-steps" aria-label="Listing steps">
                    <span className="seller-add-step active">1. Details</span>
                    <span className="seller-add-step">2. Media</span>
                    <span className="seller-add-step">3. Publish</span>
                </div>
            </div>

            <div className="seller-add-layout">
                <div className="seller-add-main">
                    <div className="seller-add-card seller-add-section-card">
                        <div className="seller-add-section-head">
                            <h3>Product Information</h3>
                            <p>Start with the essentials buyers scan first.</p>
                        </div>
                        <div className="seller-add-grid">
                            <div className="seller-input-wrap seller-add-grid-full">
                                <label className="seller-add-label">Product Name</label>
                                <input
                                    type="text"
                                    className="seller-input"
                                    placeholder="Enter product name"
                                    value={productName}
                                    onChange={(event) => setProductName(event.target.value)}
                                />
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Category</label>
                                <select
                                    className="seller-input"
                                    value={category}
                                    onChange={(event) => {
                                        const nextCategory = event.target.value;
                                        setCategory(nextCategory);
                                        setSubcategory('');
                                    }}
                                >
                                    <option value="">Select category</option>
                                    {HOME_CATEGORY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Subcategory</label>
                                <select
                                    className="seller-input"
                                    value={subcategory}
                                    onChange={(event) => setSubcategory(event.target.value)}
                                    disabled={!category}
                                >
                                    <option value="">Select subcategory</option>
                                    {subcategoryOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Starting Price</label>
                                <input
                                    type="number"
                                    className="seller-input"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value={startingPrice}
                                    onChange={(event) => setStartingPrice(event.target.value)}
                                />
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Maximum Increment</label>
                                <input
                                    type="number"
                                    className="seller-input"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value={maxIncrement}
                                    onChange={(event) => setMaxIncrement(event.target.value)}
                                />
                            </div>
                            <div className="seller-input-wrap seller-add-grid-full">
                                <label className="seller-add-label">Description</label>
                                <textarea
                                    className="seller-textarea"
                                    rows={5}
                                    placeholder="Describe your item"
                                    value={description}
                                    onChange={(event) => setDescription(event.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="seller-add-card seller-add-section-card">
                        <div className="seller-add-section-head">
                            <h3>Auction Setup</h3>
                            <p>Configure when bidding begins and how long the auction runs.</p>
                        </div>
                        <div className="seller-add-grid">
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">When should bidding start?</label>
                                <select
                                    className="seller-input"
                                    value={startMode}
                                    onChange={(event) => setStartMode(event.target.value as 'now' | 'scheduled')}
                                >
                                    <option value="now">Start immediately</option>
                                    <option value="scheduled">Start at scheduled date/time</option>
                                </select>
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Scheduled start date & time</label>
                                <input
                                    type="datetime-local"
                                    className="seller-input"
                                    value={scheduledStartDateTime}
                                    onChange={(event) => setScheduledStartDateTime(event.target.value)}
                                    disabled={startMode !== 'scheduled'}
                                />
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">How long should bidding run?</label>
                                <select
                                    className="seller-input"
                                    value={endTimeMode}
                                    onChange={(event) => setEndTimeMode(event.target.value as 'days' | 'hours' | 'minutes')}
                                >
                                    <option value="days">Days</option>
                                    <option value="hours">Hours</option>
                                    <option value="minutes">Minutes</option>
                                </select>
                            </div>
                            <div className="seller-input-wrap">
                                <label className="seller-add-label">Duration value ({endTimeMode})</label>
                                <input
                                    type="number"
                                    className="seller-input"
                                    min="1"
                                    step="1"
                                    value={endTimeValue}
                                    onChange={(event) => {
                                        const digitsOnly = event.target.value.replace(/[^\d]/g, '');
                                        setEndTimeValue(digitsOnly);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="seller-add-auction-note">
                            <p className="seller-field-help">{durationModeMeaning}</p>
                            <p className="seller-field-help seller-schedule-preview">{bidSchedulePreview}</p>
                        </div>
                    </div>

                    <div className="seller-add-card seller-add-section-card">
                        <div className="seller-add-section-head">
                            <h3>Media Gallery</h3>
                            <p>Upload up to 10 images or videos. Strong cover media increases conversions.</p>
                        </div>
                        <div className="seller-input-wrap seller-add-grid-full">
                            <label className="seller-add-label">Product Media (Images or Videos, up to 10)</label>
                            <input
                                type="file"
                                className="seller-input seller-file-input"
                                accept="image/*,video/*"
                                multiple
                                onChange={handleMediaChange}
                            />
                            <p className="seller-media-help">{mediaEntries.length}/10 uploaded</p>
                            {mediaError && <p className="seller-media-error">{mediaError}</p>}

                            {mediaEntries.length > 0 && (
                                <div className="seller-media-grid">
                                    {mediaEntries.map((entry) => (
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
                                                onClick={() => handleRemoveMedia(entry.id)}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="seller-add-actions">
                        <button type="button" className="seller-ghost-btn" onClick={() => onNavigateDashboard()}>
                            Cancel
                        </button>
                        <button type="button" className="seller-primary-btn" onClick={handleSaveProduct} disabled={saving}>
                            {saving ? 'Publishing...' : 'Publish Product'}
                        </button>
                    </div>
                </div>

                <aside className="seller-add-side">
                    <div className="seller-add-side-card">
                        <h4>Listing Preview</h4>
                        <p className="seller-add-side-title">{productName.trim() || 'Your product title will appear here'}</p>
                        <div className="seller-add-side-meta">
                            <p><span>Category</span><strong>{category || 'Not selected'}</strong></p>
                            <p><span>Subcategory</span><strong>{getSubcategoryLabel(category, subcategory) || 'Not selected'}</strong></p>
                            <p><span>Start Price</span><strong>{startingPrice ? `P${startingPrice}` : 'P0.00'}</strong></p>
                            <p><span>Max Increment</span><strong>{maxIncrement ? `P${maxIncrement}` : 'P0.00'}</strong></p>
                            <p><span>Media</span><strong>{mediaEntries.length}/10</strong></p>
                        </div>
                    </div>

                    <div className="seller-add-side-card seller-add-side-note">
                        <h4>Quality Checklist</h4>
                        <ul>
                            <li className={productName.trim() ? 'done' : ''}>Clear product title</li>
                            <li className={category ? 'done' : ''}>Correct category selected</li>
                            <li className={subcategory ? 'done' : ''}>Correct subcategory selected</li>
                            <li className={description.trim() ? 'done' : ''}>Detailed description</li>
                            <li className={mediaEntries.length > 0 ? 'done' : ''}>At least one media file</li>
                            <li className={Number(startingPrice) > 0 ? 'done' : ''}>Valid starting price</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </section>
    );
};
