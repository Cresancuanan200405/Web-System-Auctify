import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { InputField, SelectField, Button } from '../components/UI';
import { toast } from 'react-toastify';

interface RegisterPageProps {
    onNavigateLogin: () => void;
    onRegisterSuccess: () => void;
}

type PreferredContent = 'electronics' | 'collectibles' | 'art' | 'luxury' | 'antiques' | 'vehicles' | 'fashion' | 'property' | 'niche' | 'school';
type Gender = 'female' | 'male';

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateLogin, onRegisterSuccess }) => {
    const { login } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState<Gender>('female');
    const [preferredContent, setPreferredContent] = useState<PreferredContent>('electronics');
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate password confirmation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            toast.error('Passwords do not match');
            return;
        }

        // Validate password length
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            toast.error('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await authService.register({
                name,
                email,
                password,
                password_confirmation: confirmPassword,
                gender,
                preferred_content: preferredContent,
                want_notifications: wantNotifications
            });

            // Store preferred content
            localStorage.setItem('preferred_content', preferredContent);

            login(response.token, response.user);
            toast.success('Registration successful! Welcome to Auctify!');
            onRegisterSuccess();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-card" id="auth">
            <div className="tabs">
                <div className="tab" onClick={onNavigateLogin}>Login</div>
                <div className="tab active">Sign up</div>
            </div>

            <div className="social-row">
                <img src="/icons/facebook.png" alt="Facebook" className="social-btn" />
                <img src="/icons/google.png" alt="Google" className="social-btn" />
            </div>

            <div className="divider">Or continue with</div>

            <form onSubmit={handleSubmit}>
                <InputField
                    label="First Name *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    required
                />

                <div className="field">
                    <label htmlFor="birthday">Birthday (optional)</label>
                    <input
                        id="birthday"
                        type="date"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        className="date-input input-field"
                    />
                </div>

                <SelectField
                    label="Preferred auction category *"
                    value={preferredContent}
                    onChange={(e) => setPreferredContent(e.target.value as PreferredContent)}
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
                </SelectField>

                <InputField
                    label="Email Address *"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                />

                <InputField
                    label="Password *"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                />

                <InputField
                    label="Confirm Password *"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                />

                <div className="checkbox-group">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        Keep me signed in
                    </label>
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={wantNotifications}
                            onChange={(e) => setWantNotifications(e.target.checked)}
                        />
                        I want auction alerts, new listings and bidding updates sent to my inbox!
                    </label>
                </div>

                <Button type="submit" variant="primary" isLoading={loading} className="primary-btn">
                    {loading ? 'Please wait...' : 'Create Account'}
                </Button>
            </form>

            {error && <div className="message error">{error}</div>}

            <div className="hint">
                By continuing you agree to our Terms and Conditions and Privacy Policy.
            </div>
        </section>
    );
};
