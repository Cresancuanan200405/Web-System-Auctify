import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { getAdminHintCredentials, loginAdmin } from '../../lib/adminAuth';

interface AdminLoginPageProps {
    onLoginSuccess: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const hintCredentials = useMemo(() => getAdminHintCredentials(), []);

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

        if (!email.trim() || !password.trim()) {
            toast.error('Enter admin email and password.');
            return;
        }

        setIsSubmitting(true);

        const session = await loginAdmin(email, password);

        if (!session) {
            toast.error('Invalid admin credentials.');
            setIsSubmitting(false);
            return;
        }

        toast.success(`Welcome back, ${session.name}.`);
        onLoginSuccess();
    };

    return (
        <main className="admin-login-shell" aria-label="Admin login">
            <section className="admin-login-panel">
                <div className="admin-login-brand-block">
                    <img src="/icons/Admin Logo.png" alt="Auctify Admin" className="admin-login-brand-logo" />
                    <p className="admin-login-kicker">Auctify Console</p>
                    <h1 className="admin-login-title">Admin Access</h1>
                    <p className="admin-login-description">
                        Manage homepage promotions, carousel assets, video ads, and monitor users from one control center.
                    </p>
                    <div className="admin-login-stats">
                        <article>
                            <strong>Realtime</strong>
                            <span>Homepage controls</span>
                        </article>
                        <article>
                            <strong>Secure</strong>
                            <span>Session-based admin access</span>
                        </article>
                        <article>
                            <strong>Focused</strong>
                            <span>Landscape dashboard UI</span>
                        </article>
                    </div>
                </div>

                <form className="admin-login-card" onSubmit={handleSubmit}>
                    <h2>Sign in as Admin</h2>
                    <p className="admin-login-card-subtitle">Use the pre-created admin account below.</p>

                    <div className="admin-login-field">
                        <label htmlFor="admin-email">Admin Email</label>
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
                            placeholder="Enter password"
                            autoComplete="current-password"
                        />
                    </div>

                    <button type="submit" className="admin-login-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Verifying...' : 'Enter Dashboard'}
                    </button>

                    <div className="admin-login-hint" role="note" aria-label="Default admin credentials">
                        <p>Default admin account:</p>
                        <p>Email: {hintCredentials.email}</p>
                        <p>Password: {hintCredentials.password}</p>
                    </div>
                </form>
            </section>
        </main>
    );
};
