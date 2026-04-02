import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { loginAdmin } from '../../lib/adminAuth';

interface AdminLoginPageProps {
    onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
    onLoginSuccess,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        const originalTitle = document.title;
        const iconElement = document.querySelector(
            "link[rel='icon']",
        ) as HTMLLinkElement | null;
        const originalHref = iconElement?.href ?? null;

        document.title = 'Auctify Admin Login';

        if (iconElement) {
            iconElement.href = '/icons/Admin Logo.png';
            iconElement.type = 'image/png';
        }

        return () => {
            document.title = originalTitle;
            if (iconElement && originalHref) {
                iconElement.href = originalHref;
            }
        };
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        setIsSubmitting(true);

        try {
            if (!email.trim() || !password.trim()) {
                toast.error('Enter admin email and password.');
                setIsSubmitting(false);
                return;
            }

            const result = await loginAdmin(email, password);

            toast.success(`Welcome back, ${result.session.name}.`);
            onLoginSuccess();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Invalid admin credentials.',
            );
            setIsSubmitting(false);
        }
    };

    return (
        <main className="admin-login-shell" aria-label="Admin login">
            {/* Decorative background shapes */}
            <div className="admin-login-bg-shapes" aria-hidden="true">
                <div className="admin-login-bg-shape albs-1" />
                <div className="admin-login-bg-shape albs-2" />
                <div className="admin-login-bg-shape albs-3" />
                <div className="admin-login-bg-shape albs-4" />
            </div>

            <section className="admin-login-panel">
                {/* ── Left: welcome ── */}
                <div className="admin-login-welcome">
                    <div className="admin-login-wordmark">
                        <img
                            src="/icons/Admin Logo.png"
                            alt="Auctify Admin"
                            className="admin-login-brand-logo"
                        />
                        <span>Auctify Admin</span>
                    </div>

                    <h1 className="admin-login-headline">Welcome!</h1>
                    <div
                        className="admin-login-headline-rule"
                        aria-hidden="true"
                    />

                    <p className="admin-login-description">
                        The Auctify console gives you full control over your
                        platform — manage promotions, monitor users, adjust
                        system settings, and publish content updates, all from
                        one secure dashboard.
                    </p>

                    <ul
                        className="admin-login-features"
                        aria-label="Feature highlights"
                    >
                        <li>
                            <span
                                className="admin-login-feature-dot"
                                aria-hidden="true"
                            />
                            Manage homepage carousel, promo circles, and video
                            ads
                        </li>
                        <li>
                            <span
                                className="admin-login-feature-dot"
                                aria-hidden="true"
                            />
                            Monitor, verify, and moderate seller &amp; buyer
                            accounts
                        </li>
                        <li>
                            <span
                                className="admin-login-feature-dot"
                                aria-hidden="true"
                            />
                            Configure system settings and feature flags in real
                            time
                        </li>
                        <li>
                            <span
                                className="admin-login-feature-dot"
                                aria-hidden="true"
                            />
                            Receive live platform notifications and analytics
                            signals
                        </li>
                    </ul>

                    <a
                        href="/"
                        className="admin-login-learn-more"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Go to Auctify
                    </a>
                </div>

                {/* ── Right: sign in card ── */}
                <div className="admin-login-form-col">
                    <form className="admin-login-card" onSubmit={handleSubmit}>
                        <div className="admin-login-card-header">
                            <h2>
                                Sign in
                            </h2>
                            <p>
                                Access the Auctify control panel using your admin credentials.
                            </p>
                        </div>

                        <div className="admin-login-field">
                            <label htmlFor="admin-email">User Name</label>
                            <input
                                id="admin-email"
                                type="email"
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                placeholder="admin@auctify.com"
                                autoComplete="username"
                            />
                        </div>

                        <div className="admin-login-field">
                            <label htmlFor="admin-password">Password</label>
                            <input
                                id="admin-password"
                                type="password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                placeholder="••••••••••"
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="admin-login-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Signing in…' : 'Submit'}
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
};
