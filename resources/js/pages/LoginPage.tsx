import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import { InputField, Button } from '../components/UI';
import { toast } from 'react-toastify';

interface LoginPageProps {
    onNavigateRegister: () => void;
    onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateRegister, onLoginSuccess }) => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authService.login({ email, password });
            login(response.token, response.user);
            toast.success('Login successful!');
            onLoginSuccess();
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="auth-card" id="auth">
            <div className="tabs">
                <div className="tab active">Login</div>
                <div className="tab" onClick={onNavigateRegister}>Sign up</div>
            </div>

            <div className="social-row">
                <img src="/icons/facebook.png" alt="Facebook" className="social-btn" />
                <img src="/icons/google.png" alt="Google" className="social-btn" />
            </div>

            <div className="divider">Or continue with</div>

            <form onSubmit={handleSubmit}>
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
                    placeholder="********"
                    required
                />

                <div className="row">
                    <label>
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        Keep me signed in
                    </label>
                    <span>Forgot Password?</span>
                </div>

                <Button type="submit" variant="primary" isLoading={loading} className="primary-btn">
                    {loading ? 'Please wait...' : 'Login'}
                </Button>
            </form>

            {error && <div className="message error">{error}</div>}

            <div className="hint">
                By continuing you agree to our Terms and Conditions and Privacy Policy.
            </div>
        </section>
    );
};
