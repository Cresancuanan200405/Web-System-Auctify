import type { FormEvent } from 'react';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { InputField, Button } from '../../components/UI';
import { userService } from '../../services/api';

export const PasswordSection: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);

        try {
            await userService.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            });
            
            toast.success('Password changed successfully!');
            
            // Clear form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            const responseMessage =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            const errorMessage = responseMessage || 'Failed to change password';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="account-section">
            <div className="account-card">
                <div className="account-card-header">
                    <div className="account-card-title">
                        <span className="account-card-icon" aria-hidden="true">
                            <img src="/icons/password.png" alt="Password" />
                        </span>
                        <span>Change Password</span>
                    </div>
                </div>

                <div className="account-card-body">
                    <form onSubmit={handleSubmit}>
                        <InputField
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                        />
                        
                        <InputField
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            required
                        />
                        
                        <InputField
                            label="Confirm New Password"
                            type="password"
                            value={confirmPassword}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            required
                        />

                        <div className="account-form-actions">
                            <Button type="submit" variant="primary" isLoading={loading}>
                                Update Password
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
