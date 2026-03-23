import React from 'react';
import { usePreference } from '../../hooks/useLocalStorage';

type PreferredContent =
    | 'electronics'
    | 'collectibles'
    | 'art'
    | 'luxury'
    | 'antiques'
    | 'vehicles'
    | 'fashion'
    | 'property'
    | 'niche'
    | 'school';

interface CategoryOption {
    value: PreferredContent;
    label: string;
    icon: string;
    description: string;
}

const CATEGORIES: CategoryOption[] = [
    {
        value: 'electronics',
        label: 'Electronics',
        icon: '📱',
        description: 'Phones, laptops, gadgets and more',
    },
    {
        value: 'collectibles',
        label: 'Collectibles',
        icon: '🎯',
        description: "Rare items and collectors' editions",
    },
    {
        value: 'art',
        label: 'Art',
        icon: '🎨',
        description: 'Paintings, sculptures and artwork',
    },
    {
        value: 'luxury',
        label: 'Luxury',
        icon: '✨',
        description: 'Premium and high-end goods',
    },
    {
        value: 'antiques',
        label: 'Antiques',
        icon: '⏰',
        description: 'Vintage and antique treasures',
    },
    {
        value: 'vehicles',
        label: 'Vehicles',
        icon: '🚗',
        description: 'Cars, motorcycles and accessories',
    },
    {
        value: 'fashion',
        label: 'Fashion',
        icon: '👗',
        description: 'Clothing, shoes and accessories',
    },
    {
        value: 'property',
        label: 'Property',
        icon: '🏠',
        description: 'Real estate and property listings',
    },
    {
        value: 'niche',
        label: 'Niche',
        icon: '🎪',
        description: 'Specialized and unique items',
    },
    {
        value: 'school',
        label: 'School',
        icon: '📚',
        description: 'Educational supplies and books',
    },
];

export const PreferencesSection: React.FC = () => {
    const [preferredContent, setPreferredContent] =
        React.useState<PreferredContent>(() => {
            const stored = localStorage.getItem('preferred_content');
            return (stored as PreferredContent) || 'electronics';
        });

    const [notifyDealsEmail, setNotifyDealsEmail] = usePreference(
        'notify_deals_email',
        false,
    );
    const [notifyRemindersEmail, setNotifyRemindersEmail] = usePreference(
        'notify_reminders_email',
        true,
    );

    const handlePreferredContentChange = (value: PreferredContent) => {
        setPreferredContent(value);
        localStorage.setItem('preferred_content', value);
    };

    return (
        <div className="preferences-main">
            <div className="preferences-card">
                <div className="preferences-card-header">
                    <div className="preferences-card-title">
                        <span
                            className="preferences-card-icon"
                            aria-hidden="true"
                        >
                            ⚙️
                        </span>
                        <span>Preferences</span>
                    </div>
                </div>

                <div className="preferences-section">
                    <div className="preferences-section-title">
                        Preferred Content
                    </div>
                    <div className="preferences-section-text">
                        Select your favorite category to personalize your
                        Auctify experience. We'll show you relevant auctions and
                        recommendations based on your preference.
                    </div>
                    <div className="preferences-categories-grid">
                        {CATEGORIES.map((category) => (
                            <label
                                key={category.value}
                                className={`preferences-category-card ${
                                    preferredContent === category.value
                                        ? 'active'
                                        : ''
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="preferred-content"
                                    value={category.value}
                                    checked={
                                        preferredContent === category.value
                                    }
                                    onChange={() =>
                                        handlePreferredContentChange(
                                            category.value,
                                        )
                                    }
                                    style={{ display: 'none' }}
                                />
                                <div className="preferences-category-icon">
                                    {category.icon}
                                </div>
                                <div className="preferences-category-name">
                                    {category.label}
                                </div>
                                <div className="preferences-category-description">
                                    {category.description}
                                </div>
                                <div className="preferences-category-checkmark">
                                    ✓
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="preferences-recommendations">
                    <div className="preferences-recommendations-header">
                        <span className="preferences-recommendations-icon">
                            💡
                        </span>
                        <span>Personalization Tips</span>
                    </div>
                    <div className="preferences-recommendations-content">
                        <div className="preferences-recommendation-item">
                            <span className="recommendations-checkmark">→</span>
                            <span>
                                Changing your preference updates your homepage
                                recommendations instantly
                            </span>
                        </div>
                        <div className="preferences-recommendation-item">
                            <span className="recommendations-checkmark">→</span>
                            <span>
                                You can still browse all categories even with a
                                preferred category selected
                            </span>
                        </div>
                        <div className="preferences-recommendation-item">
                            <span className="recommendations-checkmark">→</span>
                            <span>
                                Popular items in your category will appear in
                                recommendations first
                            </span>
                        </div>
                        <div className="preferences-recommendation-item">
                            <span className="recommendations-checkmark">→</span>
                            <span>
                                Change your preference anytime to explore
                                different auction categories
                            </span>
                        </div>
                    </div>
                </div>

                <div className="preferences-section">
                    <div className="preferences-section-title">
                        Notification Preferences
                    </div>
                    <div className="preferences-section-text">
                        Stay informed about deals, reminders and exclusive
                        opportunities.
                    </div>

                    <div className="preferences-notifications">
                        <div className="preferences-notification-item">
                            <div className="preferences-notification-content">
                                <div className="preferences-notification-title">
                                    ⚡ Exclusive Deals &amp; Flash Auctions
                                </div>
                                <div className="preferences-notification-description">
                                    Get notified about flash sales, featured
                                    lots, last-minute bidding opportunities and
                                    insider offers.
                                </div>
                            </div>
                            <label className="preferences-checkbox">
                                <input
                                    type="checkbox"
                                    checked={notifyDealsEmail}
                                    onChange={(event) =>
                                        setNotifyDealsEmail(
                                            event.target.checked,
                                        )
                                    }
                                />
                                <span>Email</span>
                            </label>
                        </div>

                        <div className="preferences-notification-item">
                            <div className="preferences-notification-content">
                                <div className="preferences-notification-title">
                                    🔔 Reminders, Alerts &amp; Rewards
                                </div>
                                <div className="preferences-notification-description">
                                    Receive watchlist reminders, auction winner
                                    alerts, bidding activity updates and
                                    exclusive Auctify rewards.
                                </div>
                            </div>
                            <label className="preferences-checkbox">
                                <input
                                    type="checkbox"
                                    checked={notifyRemindersEmail}
                                    onChange={(event) =>
                                        setNotifyRemindersEmail(
                                            event.target.checked,
                                        )
                                    }
                                />
                                <span>Email</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="preferences-save-row">
                    <button type="button" className="preferences-save-button">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};
