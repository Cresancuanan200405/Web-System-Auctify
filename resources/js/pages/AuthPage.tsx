import type { FormEvent} from 'react';
import React, { useEffect, useMemo, useState } from 'react';
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
        birthday?: string | null;
        gender?: string | null;
    };
};

type AuthErrors = {
    message?: string;
    errors?: Record<string, string[]>;
};

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

const PREFERRED_CONTENT_OPTIONS: PreferredContent[] = [
    'electronics',
    'collectibles',
    'art',
    'luxury',
    'antiques',
    'vehicles',
    'fashion',
    'property',
    'niche',
    'school'
];

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onModeChange, onAuthSuccess }) => {
    const { login } = useAuth();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || 'http://127.0.0.1:8000';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [preferredContent, setPreferredContent] = useState<PreferredContent>(() => {
        const stored = localStorage.getItem('preferred_content');
        if (stored && PREFERRED_CONTENT_OPTIONS.includes(stored as PreferredContent)) {
            return stored as PreferredContent;
        }
        return 'electronics';
    });
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [googleHint, setGoogleHint] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const googleToken = params.get('google_token');
        const googleUser = params.get('google_user');
        const googleError = params.get('google_error');
        const googleCreated = params.get('google_created') === '1';

        if (googleError) {
            setError('Google sign-in failed. Please try again.');
            setGoogleHint('⚠ Google sign-in failed. Please try again.');

            window.history.replaceState({}, '', window.location.pathname);
            return;
        }

        if (!googleToken || !googleUser) return;

        try {
            const parsedUser = JSON.parse(atob(googleUser)) as User;
            localStorage.setItem('auth_token', googleToken);
            localStorage.setItem('auth_user', JSON.stringify(parsedUser));
            localStorage.setItem('account_section', 'details');

            // Store birthday and gender in user-scoped localStorage keys
            if (parsedUser && parsedUser.id) {
                const userScopeKey = `user-${parsedUser.id}`;
                if (parsedUser.birthday) {
                    localStorage.setItem(`user_birthday_${userScopeKey}`, parsedUser.birthday);
                }
                if (parsedUser.gender) {
                    localStorage.setItem(`user_gender_${userScopeKey}`, parsedUser.gender);
                }
            }

            login(googleToken, parsedUser);
            setGoogleHint('');
            sessionStorage.setItem(
                'post_auth_success_toast',
                JSON.stringify({
                    message: googleCreated
                        ? 'Your account was successfully created with Google.'
                        : 'Signed in with Google successfully.',
                    autoClose: googleCreated ? 4500 : 3500,
                })
            );
            onAuthSuccess();
        } catch {
            setError('Google sign-in failed. Please try again.');
            setGoogleHint('⚠ Google sign-in failed. Please try again.');
        } finally {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [login, onAuthSuccess]);

    const isRegister = mode === 'register';

    useEffect(() => {
        // Clear form when switching between login and register
        setEmail('');
        setPassword('');
        setPasswordConfirmation('');
        setName('');
        setBirthday('');
        setMessage('');
        setError('');
        setGoogleHint('');
    }, [mode]);

    const submitLabel = useMemo(() => (isRegister ? 'Create Account' : 'Login'), [isRegister]);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const payload = isRegister
                ? {
                      name,
                      email,
                      password,
                      password_confirmation: passwordConfirmation,
                      birthday: birthday || null,
                  }
                : { email, password, remember };

            const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
            const response = await apiClient.apiPost<AuthResponse>(endpoint, payload);

            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('auth_user', JSON.stringify(response.user));
            localStorage.setItem('account_section', 'details');

            // Store birthday and gender in user-scoped localStorage keys
            if (response.user && response.user.id) {
                const userScopeKey = `user-${response.user.id}`;
                if (response.user.birthday) {
                    localStorage.setItem(`user_birthday_${userScopeKey}`, response.user.birthday);
                }
                if (response.user.gender) {
                    localStorage.setItem(`user_gender_${userScopeKey}`, response.user.gender);
                }
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

            if (isRegister && details.toLowerCase().includes('email')) {
                const signupWarning =
                    'An account already exists with this email. Please log in instead or continue with Google if your account is linked.';
                setGoogleHint(`⚠ ${signupWarning}`);
                toast.warn(signupWarning, { autoClose: 4000 });
            }

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
                <button
                    type="button"
                    className="social-btn"
                    onClick={() => {
                        const frontendOrigin = window.location.origin;
                        const redirectUrl = `${apiBaseUrl}/api/auth/google/redirect?frontend=${encodeURIComponent(frontendOrigin)}`;
                        window.location.href = redirectUrl;
                    }}
                    aria-label="Continue with Google"
                >
                    <img src="/icons/google.png" alt="Google" />
                </button>
            </div>

            <div className="divider">Or continue with</div>

            {googleHint && (
                <p className="auth-google-hint auth-google-hint-warning">
                    {googleHint}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <div className={`field floating-field ${email ? 'has-value' : ''}`}>
                    <label htmlFor="email">Email Address *</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder=" "
                        required
                    />
                </div>
                <div className={`field floating-field ${password ? 'has-value' : ''}`}>
                    <label htmlFor="password">Password *</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder=" "
                        required
                    />
                </div>

                {isRegister && (
                    <div className={`field floating-field ${passwordConfirmation ? 'has-value' : ''}`}>
                        <label htmlFor="passwordConfirmation">Confirm Password *</label>
                        <input
                            id="passwordConfirmation"
                            type="password"
                            value={passwordConfirmation}
                            onChange={(event) => setPasswordConfirmation(event.target.value)}
                            placeholder=" "
                            required
                        />
                    </div>
                )}

                {isRegister && (
                    <>
                        <div className={`field floating-field ${name ? 'has-value' : ''}`}>
                            <label htmlFor="name">First Name *</label>
                            <input
                                id="name"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder=" "
                                required
                            />
                        </div>

                        <div className="field birthday-field">
                            <label htmlFor="birthday">Birthday (optional)</label>
                            <input
                                id="birthday"
                                type="date"
                                value={birthday}
                                onChange={(event) => setBirthday(event.target.value)}
                                className="date-input input-field"
                            />
                        </div>

                        <div className={`field floating-field ${preferredContent ? 'has-value' : ''}`}>
                            <label htmlFor="category">Preferred auction category *</label>
                            <select
                                id="category"
                                value={preferredContent}
                                onChange={(event) => setPreferredContent(event.target.value as PreferredContent)}
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
                        <button type="button" className="auth-link">Forgot Password?</button>
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
            <button type="button" className="auth-skip" onClick={onAuthSuccess}>
                SKIP
            </button>
        </section>
    );
};
