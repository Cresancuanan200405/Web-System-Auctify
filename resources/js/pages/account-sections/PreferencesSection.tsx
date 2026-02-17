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

export const PreferencesSection: React.FC = () => {
    const [preferredContent, setPreferredContent] = React.useState<PreferredContent>(() => {
        const stored = localStorage.getItem('preferred_content');
        return (stored as PreferredContent) || 'electronics';
    });

    const [notifyDealsEmail, setNotifyDealsEmail] = usePreference('notify_deals_email', false);
    const [notifyRemindersEmail, setNotifyRemindersEmail] = usePreference('notify_reminders_email', true);

    const handlePreferredContentChange = (value: PreferredContent) => {
        setPreferredContent(value);
        localStorage.setItem('preferred_content', value);
    };

    return (
        <div className="preferences-main">
            <div className="preferences-card">
                <div className="preferences-card-header">
                    <div className="preferences-card-title">
                        <span className="preferences-card-icon" aria-hidden="true">⚙️</span>
                        <span>Preferences</span>
                    </div>
                </div>

                <div className="preferences-section">
                    <div className="preferences-section-title">Preferred Content</div>
                    <div className="preferences-section-text">
                        Tell us what you like to see first on Auctify.
                    </div>
                    <div className="preferences-radio-row">
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'electronics' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="electronics"
                                checked={preferredContent === 'electronics'}
                                onChange={() => handlePreferredContentChange('electronics')}
                            />
                            <span>Electronics &amp; Tech</span>
                        </label>
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'collectibles' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="collectibles"
                                checked={preferredContent === 'collectibles'}
                                onChange={() => handlePreferredContentChange('collectibles')}
                            />
                            <span>Collectibles &amp; Art</span>
                        </label>
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'luxury' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="luxury"
                                checked={preferredContent === 'luxury'}
                                onChange={() => handlePreferredContentChange('luxury')}
                            />
                            <span>Luxury</span>
                        </label>
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'antiques' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="antiques"
                                checked={preferredContent === 'antiques'}
                                onChange={() => handlePreferredContentChange('antiques')}
                            />
                            <span>Antiques</span>
                        </label>
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'vehicles' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="vehicles"
                                checked={preferredContent === 'vehicles'}
                                onChange={() => handlePreferredContentChange('vehicles')}
                            />
                            <span>Vehicles</span>
                        </label>
                        <label
                            className={`preferences-radio-option ${
                                preferredContent === 'fashion' ? 'active' : ''
                            }`}
                        >
                            <input
                                type="radio"
                                name="preferred-content"
                                value="fashion"
                                checked={preferredContent === 'fashion'}
                                onChange={() => handlePreferredContentChange('fashion')}
                            />
                            <span>Fashion</span>
                        </label>
                    </div>
                </div>

                <div className="preferences-notifications">
                    <div className="preferences-subsection">
                        <div className="preferences-subsection-title">
                            Exclusive Deals &amp; Insider Offers
                        </div>
                        <div className="preferences-subsection-text">
                            Get the inside scoop on flash auctions, featured lots and last-minute
                            bidding opportunities.
                        </div>
                        <label className="preferences-checkbox">
                            <input
                                type="checkbox"
                                checked={notifyDealsEmail}
                                onChange={(event) => setNotifyDealsEmail(event.target.checked)}
                            />
                            <span>Email</span>
                        </label>
                    </div>

                    <div className="preferences-subsection">
                        <div className="preferences-subsection-title">
                            Reminders, Alerts &amp; Exclusive Rewards
                        </div>
                        <div className="preferences-subsection-text">
                            Stay in the loop with watchlist reminders, winner alerts and exclusive
                            Auctify perks.
                        </div>
                        <label className="preferences-checkbox">
                            <input
                                type="checkbox"
                                checked={notifyRemindersEmail}
                                onChange={(event) =>
                                    setNotifyRemindersEmail(event.target.checked)
                                }
                            />
                            <span>Email</span>
                        </label>
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
