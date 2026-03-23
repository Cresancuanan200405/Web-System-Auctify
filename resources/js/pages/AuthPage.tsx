import type { FormEvent } from 'react';
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
    account_status?: string;
    reason?: string | null;
    suspended_until?: string | null;
    errors?: Record<string, string[]>;
};

type AccountStatusDialogState = {
    title: string;
    message: string;
    suspendedUntil?: string | null;
};

type GoogleStatusNotice = {
    title: string;
    message: string;
};

const GOOGLE_STATUS_STORAGE_KEY = 'google_auth_status_notice';

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
    'school',
];

export const AuthPage: React.FC<AuthPageProps> = ({
    mode,
    onModeChange,
    onAuthSuccess,
}) => {
    const { login } = useAuth();
    const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ||
        'http://127.0.0.1:8000';
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [preferredContent, setPreferredContent] = useState<PreferredContent>(
        () => {
            const stored = localStorage.getItem('preferred_content');
            if (
                stored &&
                PREFERRED_CONTENT_OPTIONS.includes(stored as PreferredContent)
            ) {
                return stored as PreferredContent;
            }
            return 'electronics';
        },
    );
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [googleHint, setGoogleHint] = useState('');
    const [googleStatusNotice, setGoogleStatusNotice] =
        useState<GoogleStatusNotice | null>(() => {
            try {
                const raw = sessionStorage.getItem(GOOGLE_STATUS_STORAGE_KEY);
                if (!raw) {
                    return null;
                }

                const parsed = JSON.parse(raw) as GoogleStatusNotice;
                return parsed?.title && parsed?.message ? parsed : null;
            } catch {
                return null;
            }
        });
    const [loading, setLoading] = useState(false);
    const [accountStatusDialog, setAccountStatusDialog] =
        useState<AccountStatusDialogState | null>(null);
    const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

    const formatRemainingDuration = (targetIso: string, nowMs: number) => {
        const targetMs = new Date(targetIso).getTime();
        if (Number.isNaN(targetMs) || targetMs <= nowMs) {
            return null;
        }

        let totalSeconds = Math.floor((targetMs - nowMs) / 1000);
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds -= days * 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds -= hours * 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds - minutes * 60;

        const parts: string[] = [];
        if (days > 0) {
            parts.push(`${days} day${days === 1 ? '' : 's'}`);
        }
        if (hours > 0 || days > 0) {
            parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
        }
        if (minutes > 0 || hours > 0 || days > 0) {
            parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
        }
        parts.push(`${seconds} second${seconds === 1 ? '' : 's'}`);

        return parts.join(', ');
    };

    const suspendedCountdown = useMemo(() => {
        if (
            !accountStatusDialog?.suspendedUntil ||
            accountStatusDialog.title !== 'Account Suspended'
        ) {
            return null;
        }

        return formatRemainingDuration(
            accountStatusDialog.suspendedUntil,
            nowTimestamp,
        );
    }, [accountStatusDialog, nowTimestamp]);

    useEffect(() => {
        if (
            !accountStatusDialog?.suspendedUntil ||
            accountStatusDialog.title !== 'Account Suspended'
        ) {
            return;
        }

        const interval = window.setInterval(() => {
            setNowTimestamp(Date.now());
        }, 1000);

        return () => {
            window.clearInterval(interval);
        };
    }, [accountStatusDialog]);

    const openAccountStatusDialog = (
        status: string,
        reason?: string | null,
        suspendedUntil?: string | null,
    ) => {
        const cleanedReason = (reason ?? '').trim();
        const untilLabel = suspendedUntil
            ? new Date(suspendedUntil).toLocaleString()
            : null;

        if (status === 'suspended') {
            setAccountStatusDialog({
                title: 'Account Suspended',
                message: cleanedReason
                    ? `Your account is currently suspended. Reason: ${cleanedReason}${untilLabel ? ` Suspension ends: ${untilLabel}.` : ''}`
                    : `Your account is currently suspended. Please contact support.${untilLabel ? ` Suspension ends: ${untilLabel}.` : ''}`,
                suspendedUntil,
            });
            return;
        }

        if (status === 'deleted') {
            setAccountStatusDialog({
                title: 'Account Deleted',
                message: cleanedReason
                    ? `This account was deleted by admin. Reason: ${cleanedReason}`
                    : 'This account was deleted by admin and cannot sign in.',
                suspendedUntil: null,
            });
            return;
        }

        if (status === 'seller_revoked') {
            setAccountStatusDialog({
                title: 'Seller Access Revoked',
                message: cleanedReason
                    ? `Seller privileges were revoked. Reason: ${cleanedReason}`
                    : 'Seller privileges were revoked by admin.',
                suspendedUntil: null,
            });
        }
    };

    const persistGoogleStatusNotice = (notice: GoogleStatusNotice | null) => {
        setGoogleStatusNotice(notice);

        if (!notice) {
            sessionStorage.removeItem(GOOGLE_STATUS_STORAGE_KEY);
            return;
        }

        sessionStorage.setItem(
            GOOGLE_STATUS_STORAGE_KEY,
            JSON.stringify(notice),
        );
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const googleToken = params.get('google_token');
        const googleUser = params.get('google_user');
        const googleError = params.get('google_error');
        const googleReason = params.get('google_reason');
        const googleUntil = params.get('google_until');
        const googleCreated = params.get('google_created') === '1';

        if (googleError) {
            if (googleError === 'account_suspended') {
                openAccountStatusDialog('suspended', googleReason, googleUntil);
                setError('This account is suspended and cannot sign in.');
                setGoogleHint('Account suspended. Please contact support.');
                persistGoogleStatusNotice({
                    title: 'Google Sign-In Blocked',
                    message: googleReason
                        ? `This Google account is linked to a suspended Auctify account. Reason: ${googleReason}`
                        : 'This Google account is linked to a suspended Auctify account.',
                });
            } else if (googleError === 'account_deleted') {
                openAccountStatusDialog('deleted', googleReason);
                setError('This account was deleted and cannot sign in.');
                setGoogleHint('Account deleted by admin.');
                persistGoogleStatusNotice({
                    title: 'Google Sign-In Blocked',
                    message: googleReason
                        ? `This Google account is linked to an Auctify account deleted by admin. Reason: ${googleReason}`
                        : 'This Google account is linked to an Auctify account deleted by admin.',
                });
            } else {
                setError('Google sign-in failed. Please try again.');
                setGoogleHint('Google sign-in failed. Please try again.');
                persistGoogleStatusNotice(null);
            }

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
                    localStorage.setItem(
                        `user_birthday_${userScopeKey}`,
                        parsedUser.birthday,
                    );
                }
                if (parsedUser.gender) {
                    localStorage.setItem(
                        `user_gender_${userScopeKey}`,
                        parsedUser.gender,
                    );
                }
            }

            login(googleToken, parsedUser);
            setGoogleHint('');
            persistGoogleStatusNotice(null);
            sessionStorage.setItem(
                'post_auth_success_toast',
                JSON.stringify({
                    message: googleCreated
                        ? 'Your account was successfully created with Google.'
                        : 'Signed in with Google successfully.',
                    autoClose: googleCreated ? 4500 : 3500,
                }),
            );
            onAuthSuccess();
        } catch {
            setError('Google sign-in failed. Please try again.');
            setGoogleHint('Google sign-in failed. Please try again.');
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
        setAccountStatusDialog(null);
    }, [mode]);

    const submitLabel = useMemo(
        () => (isRegister ? 'Create Account' : 'Login'),
        [isRegister],
    );

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

            const endpoint = isRegister
                ? '/api/auth/register'
                : '/api/auth/login';
            const response = await apiClient.apiPost<AuthResponse>(
                endpoint,
                payload,
            );

            localStorage.setItem('auth_token', response.token);
            localStorage.setItem('auth_user', JSON.stringify(response.user));
            localStorage.setItem('account_section', 'details');

            // Store birthday and gender in user-scoped localStorage keys
            if (response.user && response.user.id) {
                const userScopeKey = `user-${response.user.id}`;
                if (response.user.birthday) {
                    localStorage.setItem(
                        `user_birthday_${userScopeKey}`,
                        response.user.birthday,
                    );
                }
                if (response.user.gender) {
                    localStorage.setItem(
                        `user_gender_${userScopeKey}`,
                        response.user.gender,
                    );
                }
            }

            login(response.token, response.user as User);
            onAuthSuccess();
            setMessage('');

            if (isRegister) {
                toast.success(
                    'Your Auctify account has been created successfully.',
                    {
                        autoClose: 3500,
                    },
                );
            } else {
                toast.success('You have logged in successfully.', {
                    autoClose: 3500,
                });
            }
        } catch (err) {
            const parsed = err as AuthErrors;
            const status =
                typeof parsed.account_status === 'string'
                    ? parsed.account_status
                    : '';
            const reason =
                typeof parsed.reason === 'string' ? parsed.reason : null;
            const suspendedUntil =
                typeof parsed.suspended_until === 'string'
                    ? parsed.suspended_until
                    : null;

            if (status) {
                openAccountStatusDialog(status, reason, suspendedUntil);
            }

            const details = parsed.errors
                ? Object.values(parsed.errors).flat().join(' ')
                : parsed.message || 'Authentication failed.';

            setError(details);

            if (isRegister && details.toLowerCase().includes('email')) {
                const signupWarning =
                    'An account already exists with this email. Please log in instead or continue with Google if your account is linked.';
                setGoogleHint(signupWarning);
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
        <>
            <section className="auth-card" id="auth">
                <div className="tabs">
                    <div
                        className={`tab ${mode === 'login' ? 'active' : ''}`}
                        onClick={() => onModeChange('login')}
                        onKeyDown={(event) =>
                            event.key === 'Enter' && onModeChange('login')
                        }
                        role="button"
                        tabIndex={0}
                    >
                        Login
                    </div>
                    <div
                        className={`tab ${mode === 'register' ? 'active' : ''}`}
                        onClick={() => onModeChange('register')}
                        onKeyDown={(event) =>
                            event.key === 'Enter' && onModeChange('register')
                        }
                        role="button"
                        tabIndex={0}
                    >
                        Sign up
                    </div>
                </div>

                <div className="social-row">
                    <img
                        src="/icons/facebook.png"
                        alt="Facebook"
                        className="social-btn"
                    />
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

                {googleStatusNotice && (
                    <div
                        className="auth-google-status-card"
                        role="status"
                        aria-live="polite"
                    >
                        <div
                            className="auth-google-status-icon"
                            aria-hidden="true"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                role="img"
                                focusable="false"
                            >
                                <path
                                    fill="currentColor"
                                    d="M12 2.75A9.25 9.25 0 1 0 21.25 12 9.26 9.26 0 0 0 12 2.75Zm0 13.5a1.25 1.25 0 1 1 1.25-1.25A1.25 1.25 0 0 1 12 16.25Zm1.02-4.83-.31.22a1.36 1.36 0 0 0-.58 1.11v.25h-1.5v-.25a2.83 2.83 0 0 1 1.19-2.33l.31-.22a1.53 1.53 0 0 0 .66-1.24 1.5 1.5 0 1 0-3 0H8.3a3 3 0 1 1 6 0 2.99 2.99 0 0 1-1.28 2.46Z"
                                />
                            </svg>
                        </div>
                        <div className="auth-google-status-copy">
                            <p className="auth-google-status-title">
                                {googleStatusNotice.title}
                            </p>
                            <p className="auth-google-status-text">
                                {googleStatusNotice.message}
                            </p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div
                        className={`field floating-field ${email ? 'has-value' : ''}`}
                    >
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
                    <div
                        className={`field floating-field ${password ? 'has-value' : ''}`}
                    >
                        <label htmlFor="password">Password *</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder=" "
                            required
                        />
                    </div>

                    {isRegister && (
                        <div
                            className={`field floating-field ${passwordConfirmation ? 'has-value' : ''}`}
                        >
                            <label htmlFor="passwordConfirmation">
                                Confirm Password *
                            </label>
                            <input
                                id="passwordConfirmation"
                                type="password"
                                value={passwordConfirmation}
                                onChange={(event) =>
                                    setPasswordConfirmation(event.target.value)
                                }
                                placeholder=" "
                                required
                            />
                        </div>
                    )}

                    {isRegister && (
                        <>
                            <div
                                className={`field floating-field ${name ? 'has-value' : ''}`}
                            >
                                <label htmlFor="name">First Name *</label>
                                <input
                                    id="name"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    placeholder=" "
                                    required
                                />
                            </div>

                            <div className="field birthday-field">
                                <label htmlFor="birthday">
                                    Birthday (optional)
                                </label>
                                <input
                                    id="birthday"
                                    type="date"
                                    value={birthday}
                                    onChange={(event) =>
                                        setBirthday(event.target.value)
                                    }
                                    className="date-input input-field"
                                />
                            </div>

                            <div
                                className={`field floating-field ${preferredContent ? 'has-value' : ''}`}
                            >
                                <label htmlFor="category">
                                    Preferred auction category *
                                </label>
                                <select
                                    id="category"
                                    value={preferredContent}
                                    onChange={(event) =>
                                        setPreferredContent(
                                            event.target
                                                .value as PreferredContent,
                                        )
                                    }
                                    required
                                >
                                    <option value="electronics">
                                        Electronics
                                    </option>
                                    <option value="collectibles">
                                        Collectibles
                                    </option>
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
                                    onChange={(event) =>
                                        setRemember(event.target.checked)
                                    }
                                />
                                Keep me signed in
                            </label>
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={wantNotifications}
                                    onChange={(event) =>
                                        setWantNotifications(
                                            event.target.checked,
                                        )
                                    }
                                />
                                I want auction alerts, new listings and bidding
                                updates sent to my inbox!
                            </label>
                        </div>
                    )}

                    {!isRegister && (
                        <div className="row">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(event) =>
                                        setRemember(event.target.checked)
                                    }
                                />
                                Keep me signed in
                            </label>
                            <button type="button" className="auth-link">
                                Forgot Password?
                            </button>
                        </div>
                    )}

                    <button
                        className="primary-btn"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : submitLabel}
                    </button>
                </form>

                {message && <div className="message">{message}</div>}
                {error && <div className="message error">{error}</div>}

                <div className="hint">
                    By continuing you agree to our Terms and Conditions and
                    Privacy Policy.
                </div>
                <button
                    type="button"
                    className="auth-skip"
                    onClick={onAuthSuccess}
                >
                    SKIP
                </button>
            </section>

            {accountStatusDialog && (
                <div
                    className="delete-modal-overlay"
                    role="presentation"
                    onClick={() => setAccountStatusDialog(null)}
                >
                    <div
                        className="delete-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h3 className="delete-modal-title">
                                {accountStatusDialog.title}
                            </h3>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                {accountStatusDialog.message}
                            </p>
                            {suspendedCountdown && (
                                <p className="delete-modal-text">
                                    Time remaining:{' '}
                                    <strong>{suspendedCountdown}</strong>
                                </p>
                            )}
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => setAccountStatusDialog(null)}
                                >
                                    Okay
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
