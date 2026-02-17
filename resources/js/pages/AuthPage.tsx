import React, { FormEvent, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as apiClient from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

interface AuthPageProps {
    mode: 'login' | 'register';
    onModeChange: (mode: 'login' | 'register') => void;
    onAuthSuccess: () => void;
}

type AuthResponse = {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

type AuthErrors = {
    message?: string;
    errors?: Record<string, string[]>;
};

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onModeChange, onAuthSuccess }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [preferredContent, setPreferredContent] = useState<'electronics' | 'collectibles' | 'art' | 'luxury' | 'antiques' | 'vehicles' | 'fashion' | 'property' | 'niche' | 'school'>(() => {
        const stored = localStorage.getItem('preferred_content');
        return (stored as any) || 'electronics';
    });
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isRegister = mode === 'register';

    const submitLabel = useMemo(() => (isRegister ? 'Create Account' : 'Login'), [isRegister]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const payload = isRegister
                ? { name, email, password, password_confirmation: password }
                : { email, password, remember };

            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const response = await apiClient.apiPost<AuthResponse>(endpoint, payload);

            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('auth_user', JSON.stringify(response.user));
            localStorage.setItem('account_section', 'details');

            if (birthday) {
                localStorage.setItem('user_birthday', birthday);
            }

            login(response.token, response.user as User);
            onAuthSuccess();
            setMessage('');

            if (isRegister) {
                toast.success('Your Auctify account has been created successfully.', {
                    autoClose: 3500,
                });
            } else {
                toast.success('You have logged in successfully.', {
                    autoClose: 3500,
                });
            }
        } catch (err) {
            const parsed = err as AuthErrors;
            const details = parsed.errors
                ? Object.values(parsed.errors)
                      .flat()
                      .join(' ')
                : parsed.message || 'Authentication failed.';
            setError(details);

            setTimeout(() => {
                setError('');
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-card" id="auth">
            <div className="tabs">
                <div
                    className={`tab ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => onModeChange('login')}
                    onKeyDown={(event) => event.key === 'Enter' && onModeChange('login')}
                    role="button"
                    tabIndex={0}
                >
                    Login
                </div>
                <div
                    className={`tab ${mode === 'register' ? 'active' : ''}`}
                    onClick={() => onModeChange('register')}
                    onKeyDown={(event) => event.key === 'Enter' && onModeChange('register')}
                    role="button"
                    tabIndex={0}
                >
                    Sign up
                </div>
            </div>

            <div className="social-row">
                <img src="/icons/facebook.png" alt="Facebook" className="social-btn" />
                <img src="/icons/google.png" alt="Google" className="social-btn" />
            </div>

            <div className="divider">Or continue with</div>

            <form onSubmit={handleSubmit}>
                {isRegister && (
                    <>
                        <div className="field">
                            <label htmlFor="name">First Name *</label>
                            <input
                                id="name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Your first name"
                                required
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="birthday">Birthday (optional)</label>
                            <input
                                id="birthday"
                                type="date"
                                value={birthday}
                                onChange={(event) => setBirthday(event.target.value)}
                                className="date-input"
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="category">Preferred auction category *</label>
                            <select
                                id="category"
                                value={preferredContent}
                                onChange={(event) => setPreferredContent(event.target.value as any)}
                                required
                            >
                                <option value="electronics">Electronics</option>
                                <option value="collectibles">Collectibles</option>
                                <option value="art">Art</option>
                                <option value="luxury">Luxury</option>
                                <option value="antiques">Antiques</option>
                                <option value="vehicles">Vehicles</option>
                                <option value="fashion">Fashion</option>
                                <option value="property">Property</option>
                                <option value="niche">Niche</option>
                                <option value="school">School</option>
                            </select>
                        </div>
                    </>
                )}
                <div className="field">
                    <label htmlFor="email">Email Address *</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="name@example.com"
                        required
                    />
                </div>
                <div className="field">
                    <label htmlFor="password">Password *</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="********"
                        required
                    />
                </div>

                {isRegister && (
                    <div className="checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(event) => setRemember(event.target.checked)}
                            />
                            Keep me signed in
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={wantNotifications}
                                onChange={(event) => setWantNotifications(event.target.checked)}
                            />
                            I want auction alerts, new listings and bidding updates sent to my inbox!
                        </label>
                    </div>
                )}

                {!isRegister && (
                    <div className="row">
                        <label>
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(event) => setRemember(event.target.checked)}
                            />
                            Keep me signed in
                        </label>
                        <span>Forgot Password?</span>
                    </div>
                )}

                <button className="primary-btn" type="submit" disabled={loading}>
                    {loading ? 'Please wait...' : submitLabel}
                </button>
            </form>

            {message && <div className="message">{message}</div>}
            {error && <div className="message error">{error}</div>}

            <div className="hint">
                By continuing you agree to our Terms and Conditions and Privacy Policy.
            </div>
        </section>
    );
};
