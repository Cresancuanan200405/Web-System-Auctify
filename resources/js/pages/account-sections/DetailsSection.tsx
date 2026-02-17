import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type { AccountSection, User } from '../../types';

interface DetailsSectionProps {
    onNavigateSection: (section: AccountSection) => void;
}

type SavedAddress = {
    id: string | number;
    firstName?: string;
    lastName?: string;
    first_name?: string;
    last_name?: string;
    street?: string;
    street_address?: string;
    houseNo?: string;
    house_no?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
};

export const DetailsSection: React.FC<DetailsSectionProps> = ({ onNavigateSection }) => {
    const { authUser, updateUser } = useAuth();
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
    const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

    const birthday = useMemo(() => localStorage.getItem('user_birthday') || '', []);
    const gender = useMemo(() => (localStorage.getItem('user_gender') as 'female' | 'male') || '', []);

    useEffect(() => {
        const stored = localStorage.getItem('saved_addresses');
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as SavedAddress[];
                setSavedAddresses(parsed);
            } catch {
                setSavedAddresses([]);
            }
        }
    }, []);

    const openAccountEdit = () => {
        if (!authUser) return;

        const nameParts = authUser.name.split(' ');
        const first = nameParts[0] ?? '';
        const last = nameParts.slice(1).join(' ');

        setEditFirstName(first);
        setEditLastName(last);
        setEditEmail(authUser.email);
        setEditGender(gender || 'female');
        setEditBirthday(birthday || '');
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

            const response = await apiClient.apiPost<{ user: { name: string; email: string }; token?: string }>(
                '/api/auth/update-profile',
                updateData
            );

            const mergedName = `${editFirstName} ${editLastName}`.trim();
            const updatedUser = {
                ...authUser,
                name: mergedName || authUser?.name || '',
                email: editEmail,
            } satisfies User;

            updateUser(updatedUser);

            if (response.token) {
                localStorage.setItem('auth_token', response.token);
            }

            localStorage.setItem('user_birthday', editBirthday);
            localStorage.setItem('user_gender', editGender);

            setIsEditingAccount(false);

            if (editPassword && editNewPassword) {
                toast.success('Profile and password updated successfully!', {
                    autoClose: 3500,
                });
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
                        <div className="account-field-value">{birthday || '-'}</div>
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
                            const first = address.firstName || address.first_name || '';
                            const last = address.lastName || address.last_name || '';
                            const street = address.street || address.street_address || '';
                            const houseNo = address.houseNo || address.house_no || '';
                            return (
                                <div key={address.id} className="account-field-group">
                                    <div className="account-field-label">
                                        {first} {last}
                                    </div>
                                    <div className="account-field-value">
                                        {street}
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
                            <div className="field">
                                <label htmlFor="editEmail">Email Address</label>
                                <input
                                    id="editEmail"
                                    type="email"
                                    value={editEmail}
                                    onChange={(event) => setEditEmail(event.target.value)}
                                    required
                                />
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
