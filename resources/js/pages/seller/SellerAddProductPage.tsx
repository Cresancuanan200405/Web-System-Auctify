import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { HOME_CATEGORY_OPTIONS } from '../../lib/homeCategories';
import { sellerService } from '../../services/api';

interface SellerAddProductPageProps {
    onNavigateDashboard: () => void;
}

export const SellerAddProductPage: React.FC<SellerAddProductPageProps> = ({ onNavigateDashboard }) => {
    const MAX_MEDIA_ENTRIES = 10;
    const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
    const [scheduledStartDateTime, setScheduledStartDateTime] = useState('');
    const [endTimeMode, setEndTimeMode] = useState<'days' | 'hours' | 'minutes' | 'custom'>('days');
    const [endTimeValue, setEndTimeValue] = useState('7');
    const [customEndDateTime, setCustomEndDateTime] = useState('');
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
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

    const resetForm = () => {
        mediaEntriesRef.current.forEach((entry) => {
            URL.revokeObjectURL(entry.previewUrl);
        });

        setProductName('');
        setCategory('');
        setStartingPrice('');
        setMaxIncrement('');
        setStartMode('now');
        setScheduledStartDateTime('');
        setEndTimeMode('days');
        setEndTimeValue('7');
        setCustomEndDateTime('');
        setDescription('');
        setMediaEntries([]);
        setMediaError('');
    };

    const handleSaveProduct = async () => {
        if (!productName.trim()) {
            toast.error('Product name is required.');
            return;
        }

        if (!category) {
            toast.error('Please select a category.');
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

        let endsAtIso = '';
        let startsAtIso = '';

        if (startMode === 'scheduled') {
            if (!scheduledStartDateTime) {
                toast.error('Please choose a start date and time for scheduled bidding.');
                return;
            }

            const scheduledDate = new Date(scheduledStartDateTime);
            if (Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
                toast.error('Scheduled start time must be a valid future date and time.');
                return;
            }

            startsAtIso = scheduledDate.toISOString();
        }

        if (endTimeMode === 'custom') {
            if (!customEndDateTime) {
                toast.error('Please choose a custom end date and time.');
                return;
            }

            const customDate = new Date(customEndDateTime);
            if (Number.isNaN(customDate.getTime()) || customDate <= new Date()) {
                toast.error('Custom end time must be a valid future date and time.');
                return;
            }

            endsAtIso = customDate.toISOString();
        } else {
            const numericValue = Number(endTimeValue);

            if (!Number.isFinite(numericValue) || numericValue <= 0) {
                toast.error(`Please enter a valid number of ${endTimeMode}.`);
                return;
            }

            let durationMs = numericValue * 24 * 60 * 60 * 1000;

            if (endTimeMode === 'hours') {
                durationMs = numericValue * 60 * 60 * 1000;
            } else if (endTimeMode === 'minutes') {
                durationMs = numericValue * 60 * 1000;
            }

            endsAtIso = new Date(Date.now() + durationMs).toISOString();
        }

        if (startsAtIso && new Date(endsAtIso) <= new Date(startsAtIso)) {
            toast.error('End date and time must be after the scheduled start date and time.');
            return;
        }

        const formData = new FormData();
        formData.append('title', productName.trim());
        formData.append('category', category);
        formData.append('starting_price', startingPrice);
        formData.append('max_increment', maxIncrement);
        formData.append('description', description.trim());
        if (startsAtIso) {
            formData.append('starts_at', startsAtIso);
        }
        formData.append('ends_at', endsAtIso);

        mediaEntries.forEach((entry) => {
            formData.append('media[]', entry.file);
        });

        setSaving(true);
        try {
            await sellerService.createProduct(formData);
            toast.success('Product saved successfully.');
            resetForm();
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
            <div className="seller-add-header">
                <h2>Add New Product</h2>
                <button type="button" className="seller-secondary-btn" onClick={onNavigateDashboard}>
                    Back to Dashboard
                </button>
            </div>

            <div className="seller-add-card">
                <div className="seller-add-grid">
                    <div className="seller-input-wrap">
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
                            onChange={(event) => setCategory(event.target.value)}
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
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Bidding Starts</label>
                        <select
                            className="seller-input"
                            value={startMode}
                            onChange={(event) => setStartMode(event.target.value as 'now' | 'scheduled')}
                        >
                            <option value="now">Start now</option>
                            <option value="scheduled">Schedule start</option>
                        </select>
                    </div>
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Start Date & Time</label>
                        <input
                            type="datetime-local"
                            className="seller-input"
                            value={scheduledStartDateTime}
                            onChange={(event) => setScheduledStartDateTime(event.target.value)}
                            disabled={startMode !== 'scheduled'}
                        />
                    </div>
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Bidding Ends In</label>
                        <select
                            className="seller-input"
                            value={endTimeMode}
                            onChange={(event) => setEndTimeMode(event.target.value as 'days' | 'hours' | 'minutes' | 'custom')}
                        >
                            <option value="days">Days</option>
                            <option value="hours">Hours</option>
                            <option value="minutes">Minutes</option>
                            <option value="custom">Custom date & time</option>
                        </select>
                    </div>
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">
                            {endTimeMode === 'custom'
                                ? 'Custom End Date & Time'
                                : `Number of ${endTimeMode}`}
                        </label>
                        {endTimeMode === 'custom' ? (
                            <input
                                type="datetime-local"
                                className="seller-input"
                                value={customEndDateTime}
                                onChange={(event) => setCustomEndDateTime(event.target.value)}
                            />
                        ) : (
                            <input
                                type="number"
                                className="seller-input"
                                min="1"
                                step="1"
                                value={endTimeValue}
                                onChange={(event) => setEndTimeValue(event.target.value)}
                            />
                        )}
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
                <div className="seller-add-actions">
                    <button type="button" className="seller-ghost-btn" onClick={onNavigateDashboard}>
                        Cancel
                    </button>
                    <button type="button" className="seller-primary-btn" onClick={handleSaveProduct} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Product'}
                    </button>
                </div>
            </div>
        </section>
    );
};
