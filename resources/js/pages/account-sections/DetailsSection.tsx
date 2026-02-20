import type { FormEvent} from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { addressService, authService } from '../../services/api';
import type { AccountSection, Address, User } from '../../types';

interface DetailsSectionProps {
    onNavigateSection: (section: AccountSection) => void;
}

// Utility function to format ISO date strings to YYYY-MM-DD format
const formatBirthdayForInput = (dateString: string): string => {
    if (!dateString) return '';
    try {
        // Handle ISO format like "2005-10-29T00:00:00.000000Z"
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Format as YYYY-MM-DD for the date input
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

// Utility function to format ISO date strings for display (YYYY-MM-DD)
const formatBirthdayForDisplay = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

export const DetailsSection: React.FC<DetailsSectionProps> = ({ onNavigateSection }) => {
    const { authUser, updateUser, logout } = useAuth();
    const passwordCooldownMs = 10 * 60 * 1000;
    const lastPasswordChangeKey = 'last_password_change_at';
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editGender, setEditGender] = useState<'female' | 'male'>('female');
    const [editBirthday, setEditBirthday] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editNewPassword, setEditNewPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const [accountEditError, setAccountEditError] = useState('');
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState<'female' | 'male' | ''>('');

    const userScopeKey = useMemo(() => {
        if (!authUser) return 'anonymous';
        if (authUser.id) return `user-${authUser.id}`;
        return `email-${authUser.email.toLowerCase()}`;
    }, [authUser]);

    const birthdayStorageKey = `user_birthday_${userScopeKey}`;
    const genderStorageKey = `user_gender_${userScopeKey}`;

    useEffect(() => {
        let timeoutId: number | null = null;

        if (!authUser) {
            timeoutId = window.setTimeout(() => {
                setBirthday('');
                setGender('');
            }, 0);
        } else {
            const savedBirthday = localStorage.getItem(birthdayStorageKey) || '';
            const savedGender = (localStorage.getItem(genderStorageKey) as 'female' | 'male' | null) || '';

            timeoutId = window.setTimeout(() => {
                setBirthday(savedBirthday);
                setGender(savedGender);
            }, 0);
        }

        return () => {
            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [authUser, birthdayStorageKey, genderStorageKey]);

    useEffect(() => {
        if (!authUser) {
            const timeoutId = window.setTimeout(() => {
                setSavedAddresses([]);
            }, 0);

            return () => {
                window.clearTimeout(timeoutId);
            };
        }

        let isMounted = true;

        const loadSavedAddresses = async () => {
            try {
                const addresses = await addressService.getAddresses();
                if (isMounted) {
                    setSavedAddresses(addresses);
                }
            } catch {
                if (isMounted) {
                    setSavedAddresses([]);
                }
            }
        };

        loadSavedAddresses();

        return () => {
            isMounted = false;
        };
    }, [authUser]);

    const openAccountEdit = () => {
        if (!authUser) return;

        const nameParts = authUser.name.split(' ');
        const first = nameParts[0] ?? '';
        const last = nameParts.slice(1).join(' ');

        setEditFirstName(first);
        setEditLastName(last);
        setEditEmail(authUser.email);
        setEditGender((gender === 'female' || gender === 'male') ? gender : 'female');
        setEditBirthday(formatBirthdayForInput(birthday));
        setEditPassword('');
        setEditNewPassword('');
        setEditConfirmPassword('');
        setAccountEditError('');
        setIsEditingAccount(true);
    };

    const closeAccountEdit = () => {
        setIsEditingAccount(false);
        setAccountEditError('');
    };

    const handleAccountEditSave = async (event: FormEvent) => {
        event.preventDefault();
        setAccountEditError('');

        if (!authUser) {
            return;
        }

        if (editPassword || editNewPassword || editConfirmPassword) {
            const lastChangedRaw = localStorage.getItem(lastPasswordChangeKey);
            const lastChangedAt = lastChangedRaw ? Number(lastChangedRaw) : 0;
            if (lastChangedAt && Date.now() - lastChangedAt < passwordCooldownMs) {
                const remainingMs = passwordCooldownMs - (Date.now() - lastChangedAt);
                const remainingMinutes = Math.ceil(remainingMs / 60000);
                setAccountEditError(`Password was changed recently. Please wait ${remainingMinutes} minute(s) before changing it again.`);
                return;
            }

            if (!editPassword) {
                setAccountEditError('Current password is required to change password.');
                return;
            }
            if (!editNewPassword) {
                setAccountEditError('Please enter a new password.');
                return;
            }
            if (editNewPassword.length < 8) {
                setAccountEditError('New password must be at least 8 characters long.');
                return;
            }
            if (editNewPassword !== editConfirmPassword) {
                setAccountEditError('New password and confirmation do not match.');
                return;
            }
        }

        try {
            const updateData: Record<string, unknown> = {
                first_name: editFirstName,
                last_name: editLastName,
                email: editEmail,
                birthday: editBirthday,
                gender: editGender,
            };

            if (editPassword && editNewPassword) {
                updateData.current_password = editPassword;
                updateData.password = editNewPassword;
                updateData.password_confirmation = editConfirmPassword;
            }

            const response = await apiClient.apiPost<{ user: User; token?: string }>(
                '/api/auth/update-profile',
                updateData
            );

            const updatedUser = {
                ...authUser,
                ...response.user,
            } satisfies User;

            updateUser(updatedUser);

            if (response.token) {
                localStorage.setItem('auth_token', response.token);
            }

            localStorage.setItem(birthdayStorageKey, editBirthday);
            localStorage.setItem(genderStorageKey, editGender);
            setBirthday(editBirthday);
            setGender(editGender);

            setIsEditingAccount(false);

            if (editPassword && editNewPassword) {
                localStorage.setItem(lastPasswordChangeKey, String(Date.now()));

                toast.success('Password updated. Please log in again.', {
                    autoClose: 3500,
                });

                try {
                    await authService.logout();
                } catch {
                    // Ignore logout API failures and continue with local logout.
                }

                logout();
                localStorage.setItem('ui_auth_mode', 'login');
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
            } else {
                toast.success('Profile updated successfully!', {
                    autoClose: 3500,
                });
            }
        } catch (error: unknown) {
            const err = error as { message?: string };
            setAccountEditError(err.message || 'Failed to update profile. Please try again.');
            toast.error(err.message || 'Failed to update profile.', {
                autoClose: 3500,
            });
        }
    };

    if (!authUser) return null;

    return (
        <>
            <div className="account-card">
                <div className="account-card-header">
                    <div className="account-card-title">
                        <span className="account-card-icon" aria-hidden="true">
                            <img src="/icons/user.png" alt="User" />
                        </span>
                        <span>Personal details</span>
                    </div>
                    <button
                        type="button"
                        className="account-link-button"
                        onClick={openAccountEdit}
                    >
                        Edit
                    </button>
                </div>
                <div className="account-card-body">
                    <div className="account-field-group">
                        <div className="account-field-label">Email Address</div>
                        <div className="account-field-value">{authUser.email}</div>
                    </div>
                    <div className="account-field-group">
                        <div className="account-field-label">Name</div>
                        <div className="account-field-value">{authUser.name}</div>
                    </div>
                    <div className="account-field-group">
                        <div className="account-field-label">Birthday</div>
                        <div className="account-field-value">{formatBirthdayForDisplay(birthday) || '-'}</div>
                    </div>
                    <div className="account-field-group">
                        <div className="account-field-label">Gender</div>
                        <div className="account-field-value">
                            {gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : '-'}
                        </div>
                    </div>
                    <div className="account-field-group">
                        <div className="account-field-label">Password</div>
                        <div className="account-field-value">************</div>
                    </div>
                </div>
            </div>

            <div className="account-card">
                <div className="account-card-header">
                    <div className="account-card-title">
                        <span className="account-card-icon" aria-hidden="true">
                            <img src="/icons/savedaddress.png" alt="Address" />
                        </span>
                        <span>Saved Addresses ({savedAddresses.length})</span>
                    </div>
                    <button
                        type="button"
                        className="account-link-button"
                        onClick={() => onNavigateSection('addresses')}
                    >
                        View All
                    </button>
                </div>
                {savedAddresses.length === 0 ? (
                    <div className="account-card-body account-card-body--centered">
                        <div className="account-empty-icon" aria-hidden="true">📦</div>
                        <p className="account-empty-text">You don&apos;t have any saved address</p>
                        <button
                            type="button"
                            className="account-primary-button"
                            onClick={() => onNavigateSection('addresses')}
                        >
                            Add New Address
                        </button>
                    </div>
                ) : (
                    <div className="account-card-body">
                        {savedAddresses.slice(0, 2).map((address) => {
                            const houseNo = address.building_name || '';
                            return (
                                <div key={address.id} className="account-field-group">
                                    <div className="account-field-label">
                                        {address.first_name} {address.last_name}
                                    </div>
                                    <div className="account-field-value">
                                        {address.street_address}
                                        {houseNo && `, ${houseNo}`}, {address.barangay}, {address.city}
                                    </div>
                                </div>
                            );
                        })}
                        {savedAddresses.length > 2 && (
                            <div className="account-field-group">
                                <div className="account-field-value" style={{ color: '#999', fontSize: '13px' }}>
                                    +{savedAddresses.length - 2} more {savedAddresses.length - 2 === 1 ? 'address' : 'addresses'}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isEditingAccount && (
                <div className="account-edit-overlay">
                    <div className="account-edit-panel">
                        <div className="account-edit-header">
                            <h2 className="account-edit-title">Personal details</h2>
                            <button
                                type="button"
                                className="account-edit-close"
                                onClick={closeAccountEdit}
                                aria-label="Close personal details editor"
                            >
                                ×
                            </button>
                        </div>

                        <form className="account-edit-form" onSubmit={handleAccountEditSave}>
                            <div className="account-edit-email-row">
                                <div className="account-edit-email-label">Email Address</div>
                                <div className="account-edit-email-value">{authUser.email}</div>
                            </div>

                            <div className="field">
                                <label>Gender</label>
                                <div className="gender-row">
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="edit-gender"
                                            value="female"
                                            checked={editGender === 'female'}
                                            onChange={() => setEditGender('female')}
                                        />
                                        <span>Female</span>
                                    </label>
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            name="edit-gender"
                                            value="male"
                                            checked={editGender === 'male'}
                                            onChange={() => setEditGender('male')}
                                        />
                                        <span>Male</span>
                                    </label>
                                </div>
                            </div>

                            <div className="account-edit-two-col">
                                <div className="field">
                                    <label htmlFor="editFirstName">First Name</label>
                                    <input
                                        id="editFirstName"
                                        value={editFirstName}
                                        onChange={(event) => setEditFirstName(event.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="editLastName">Last Name</label>
                                    <input
                                        id="editLastName"
                                        value={editLastName}
                                        onChange={(event) => setEditLastName(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label htmlFor="editBirthday">Birthday</label>
                                <input
                                    id="editBirthday"
                                    type="date"
                                    className="date-input"
                                    value={editBirthday}
                                    onChange={(event) => setEditBirthday(event.target.value)}
                                />
                            </div>

                            <div className="account-edit-two-col">
                                <div className="field">
                                    <label htmlFor="editPassword">Password</label>
                                    <input
                                        id="editPassword"
                                        type="password"
                                        placeholder="Password"
                                        value={editPassword}
                                        onChange={(event) => setEditPassword(event.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="editNewPassword">New Password</label>
                                    <input
                                        id="editNewPassword"
                                        type="password"
                                        placeholder="New Password"
                                        value={editNewPassword}
                                        onChange={(event) => setEditNewPassword(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label htmlFor="editConfirmPassword">Confirm New Password</label>
                                <input
                                    id="editConfirmPassword"
                                    type="password"
                                    placeholder="Confirm New Password"
                                    value={editConfirmPassword}
                                    onChange={(event) => setEditConfirmPassword(event.target.value)}
                                />
                            </div>

                            <p className="account-edit-note">
                                When updating your password, all active sessions will be logged out. Please log in
                                again with your new password to continue.
                            </p>

                            {accountEditError && (
                                <div className="message error account-edit-error">{accountEditError}</div>
                            )}

                            <div className="account-edit-footer">
                                <button
                                    type="button"
                                    className="account-edit-cancel"
                                    onClick={closeAccountEdit}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="account-edit-save">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
