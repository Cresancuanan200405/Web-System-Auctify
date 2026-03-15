import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { loginAdmin, verifyAdminMfa } from '../../lib/adminAuth';

interface AdminLoginPageProps {
    onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mfaCode, setMfaCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [useRecoveryCode, setUseRecoveryCode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        const originalTitle = document.title;
        const iconElement = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
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
            if (challengeToken) {
                if (useRecoveryCode) {
                    if (!recoveryCode.trim()) {
                        toast.error('Enter a recovery code.');
                        setIsSubmitting(false);
                        return;
                    }

                    const session = await verifyAdminMfa(challengeToken, undefined, recoveryCode);
                    toast.success(`Welcome back, ${session.name}.`);
                    onLoginSuccess();
                    return;
                }

                if (!mfaCode.trim()) {
                    toast.error('Enter your 6-digit authenticator code.');
                    setIsSubmitting(false);
                    return;
                }

                const session = await verifyAdminMfa(challengeToken, mfaCode);
                toast.success(`Welcome back, ${session.name}.`);
                onLoginSuccess();
                return;
            }

            if (!email.trim() || !password.trim()) {
                toast.error('Enter admin email and password.');
                setIsSubmitting(false);
                return;
            }

            const result = await loginAdmin(email, password);

            if (result.status === 'mfa_required') {
                setChallengeToken(result.challengeToken);
                setMfaCode('');
                setRecoveryCode('');
                toast.info(result.message);
                setIsSubmitting(false);
                return;
            }

            toast.success(`Welcome back, ${result.session.name}.`);
            onLoginSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Invalid admin credentials.');
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
                        <img src="/icons/Admin Logo.png" alt="Auctify Admin" className="admin-login-brand-logo" />
                        <span>Auctify Admin</span>
                    </div>

                    <h1 className="admin-login-headline">Welcome!</h1>
                    <div className="admin-login-headline-rule" aria-hidden="true" />

                    <p className="admin-login-description">
                        The Auctify console gives you full control over your platform — manage promotions, monitor users, adjust system settings, and publish content updates, all from one secure dashboard.
                    </p>

                    <ul className="admin-login-features" aria-label="Feature highlights">
                        <li>
                            <span className="admin-login-feature-dot" aria-hidden="true" />
                            Manage homepage carousel, promo circles, and video ads
                        </li>
                        <li>
                            <span className="admin-login-feature-dot" aria-hidden="true" />
                            Monitor, verify, and moderate seller &amp; buyer accounts
                        </li>
                        <li>
                            <span className="admin-login-feature-dot" aria-hidden="true" />
                            Configure system settings and feature flags in real time
                        </li>
                        <li>
                            <span className="admin-login-feature-dot" aria-hidden="true" />
                            Receive live platform notifications and analytics signals
                        </li>
                    </ul>

                    <a href="/" className="admin-login-learn-more" target="_blank" rel="noopener noreferrer">
                        Go to Auctify
                    </a>
                </div>

                {/* ── Right: sign in card ── */}
                <div className="admin-login-form-col">
                    <form className="admin-login-card" onSubmit={handleSubmit}>
                        <div className="admin-login-card-header">
                            <h2>{challengeToken ? 'Multi-factor verification' : 'Sign in'}</h2>
                            <p>
                                {challengeToken
                                    ? 'Enter your authenticator code to finish admin sign in.'
                                    : 'Access the Auctify control panel using your admin credentials.'}
                            </p>
                        </div>

                        {!challengeToken && (
                            <>
                                <div className="admin-login-field">
                                    <label htmlFor="admin-email">User Name</label>
                                    <input
                                        id="admin-email"
                                        type="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
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
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="••••••••••"
                                        autoComplete="current-password"
                                    />
                                </div>
                            </>
                        )}

                        {challengeToken && !useRecoveryCode && (
                            <div className="admin-login-field">
                                <label htmlFor="admin-mfa-code">Authenticator Code</label>
                                <input
                                    id="admin-mfa-code"
                                    type="text"
                                    value={mfaCode}
                                    onChange={(event) => setMfaCode(event.target.value)}
                                    placeholder="123456"
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                />
                            </div>
                        )}

                        {challengeToken && useRecoveryCode && (
                            <div className="admin-login-field">
                                <label htmlFor="admin-recovery-code">Recovery Code</label>
                                <input
                                    id="admin-recovery-code"
                                    type="text"
                                    value={recoveryCode}
                                    onChange={(event) => setRecoveryCode(event.target.value)}
                                    placeholder="ABCD-EFGH"
                                    autoComplete="off"
                                />
                            </div>
                        )}

                        {challengeToken && (
                            <button
                                type="button"
                                className="admin-login-learn-more"
                                onClick={() => setUseRecoveryCode((prev) => !prev)}
                            >
                                {useRecoveryCode ? 'Use authenticator code instead' : 'Use a recovery code'}
                            </button>
                        )}

                        <button type="submit" className="admin-login-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Verifying…' : challengeToken ? 'Verify MFA' : 'Submit'}
                        </button>

                        {challengeToken && (
                            <button
                                type="button"
                                className="admin-neo-ghost-btn"
                                onClick={() => {
                                    setChallengeToken(null);
                                    setMfaCode('');
                                    setRecoveryCode('');
                                    setUseRecoveryCode(false);
                                }}
                            >
                                Back to sign in
                            </button>
                        )}
                    </form>
                </div>
            </section>
        </main>
    );
};
