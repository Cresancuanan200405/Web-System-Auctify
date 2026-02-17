import type { FormEvent } from 'react';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as apiClient from './api/client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type AuthMode = 'login' | 'register';

type AuthResponse = {
    token: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
};

type User = {
    id: number;
    name: string;
    email: string;
};

type AuthErrors = {
    message?: string;
    errors?: Record<string, string[]>;
};

type OrdersTab = 'all' | 'unpaid' | 'processing' | 'delivered' | 'returns' | 'cancelled';
type ReviewsTab = 'to-review' | 'submitted';

type Address = {
    id: number;
    firstName: string;
    lastName: string;
    phone: string;
    region: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
    houseNo: string;
};

type Card = {
    id: number;
    type: 'visa' | 'mastercard' | 'jcb' | 'gcash' | 'maya';
    number: string;
    expiry: string;
    cvc: string;
    name: string;
    balance: number;
};

export function AppRoot() {
    const [currentView, setCurrentView] = useState<'home' | 'auth' | 'account'>('home');
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [birthday, setBirthday] = useState('');
    const [gender, setGender] = useState<'female' | 'male'>('female');
    const [remember, setRemember] = useState(true);
    const [wantNotifications, setWantNotifications] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthResponse['user'] | null>(null);
    const [accountSection, setAccountSection] = useState<
        | 'details'
        | 'wallet'
        | 'cashback'
        | 'zvip'
        | 'orders'
        | 'reviews'
        | 'cards'
        | 'addresses'
        | 'preferences'
        | 'wishlist'
        | 'delete-account'
    >('details');
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [isAddingCard, setIsAddingCard] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editGender, setEditGender] = useState<'female' | 'male'>('female');
    const [editBirthday, setEditBirthday] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editNewPassword, setEditNewPassword] = useState('');
    const [editConfirmPassword, setEditConfirmPassword] = useState('');
    const [accountEditError, setAccountEditError] = useState('');
    const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
    const [menuTopOffset, setMenuTopOffset] = useState(190);
    const [ordersTab, setOrdersTab] = useState<OrdersTab>('all');
    const [reviewsTab, setReviewsTab] = useState<ReviewsTab>('to-review');
    const [zvipCarouselPage, setZvipCarouselPage] = useState(0);
    const [preferredContent, setPreferredContent] = useState<'electronics' | 'collectibles' | 'art' | 'luxury' | 'antiques' | 'vehicles' | 'fashion' | 'property' | 'niche' | 'school'>(() => {
        const stored = localStorage.getItem('preferred_content');
        return (stored as any) || 'electronics';
    });
    const [notifyDealsEmail, setNotifyDealsEmail] = useState(() => {
        const stored = localStorage.getItem('notify_deals_email');
        return stored === 'true';
    });
    const [notifyRemindersEmail, setNotifyRemindersEmail] = useState(() => {
        const stored = localStorage.getItem('notify_reminders_email');
        return stored !== null ? stored === 'true' : true;
    });
    const [cardType, setCardType] = useState<'visa' | 'mastercard' | 'jcb' | 'gcash' | 'maya'>('visa');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');
    const [cardName, setCardName] = useState('');
    const [savedCards, setSavedCards] = useState<Card[]>(() => {
        const stored = localStorage.getItem('saved_cards');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return [];
            }
        }
        return [];
    });
    const [mainCardId, setMainCardId] = useState<number | null>(() => {
        const stored = localStorage.getItem('main_card_id');
        return stored ? parseInt(stored, 10) : null;
    });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isAddingAddress, setIsAddingAddress] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
    const [addressFirstName, setAddressFirstName] = useState('');
    const [addressLastName, setAddressLastName] = useState('');
    const [addressPhone, setAddressPhone] = useState('');
    const [addressRegion, setAddressRegion] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressBarangay, setAddressBarangay] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressHouseNo, setAddressHouseNo] = useState('');
    const [regions, setRegions] = useState<Array<{ code: string; name: string }>>([]);
    const [provinces, setProvinces] = useState<Array<{ code: string; name: string }>>([]);
    const [cities, setCities] = useState<Array<{ code: string; name: string }>>([]);
    const [barangays, setBarangays] = useState<Array<{ code: string; name: string }>>([]);
    const [selectedRegionCode, setSelectedRegionCode] = useState('');
    const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
    const [selectedCityCode, setSelectedCityCode] = useState('');
    const [selectedProvinceName, setSelectedProvinceName] = useState('');
    const [savedAddresses, setSavedAddresses] = useState<Address[]>(() => {
        const stored = localStorage.getItem('saved_addresses');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return [];
            }
        }
        return [];
    });
    const carouselRef = useRef<HTMLDivElement>(null);
    const navWrapperRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const hasLoadedAddresses = useRef(false);

    const isRegister = mode === 'register';

    const submitLabel = useMemo(() => (isRegister ? 'Create Account' : 'Login'), [isRegister]);

    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('auth_user');
        const storedBirthday = localStorage.getItem('user_birthday');
        const storedGender = localStorage.getItem('user_gender');
        const storedSection = localStorage.getItem('account_section');

        hasLoadedAddresses.current = false;

        if (storedToken && storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setAuthUser(user);

                // Load user addresses from API
                fetch('/api/addresses', {
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                    },
                })
                    .then((res) => res.json())
                    .then((data) => {
                        if (Array.isArray(data)) {
                            setSavedAddresses(
                                data.map((addr: any) => ({
                                    id: addr.id,
                                    firstName: addr.first_name,
                                    lastName: addr.last_name,
                                    phone: addr.phone,
                                    region: addr.region,
                                    province: addr.province,
                                    city: addr.city,
                                    barangay: addr.barangay,
                                    street: addr.street,
                                    houseNo: addr.house_no,
                                }))
                            );
                        }
                    })
                    .catch(() => {
                        setSavedAddresses([]);
                    });

                if (
                    storedSection === 'details' ||
                    storedSection === 'wallet' ||
                    storedSection === 'cashback' ||
                    storedSection === 'zvip' ||
                    storedSection === 'orders' ||
                    storedSection === 'reviews' ||
                    storedSection === 'cards' ||
                    storedSection === 'addresses' ||
                    storedSection === 'preferences' ||
                    storedSection === 'wishlist' ||
                    storedSection === 'delete-account'
                ) {
                    setAccountSection(storedSection);
                }

                setCurrentView('account');
                if (storedBirthday) setBirthday(storedBirthday);
                if (storedGender) setGender(storedGender as 'female' | 'male');
                
                // Load preferences
                const storedPreferredContent = localStorage.getItem('preferred_content');
                if (storedPreferredContent) {
                    setPreferredContent(storedPreferredContent as any);
                }
                const storedDealsEmail = localStorage.getItem('notify_deals_email');
                if (storedDealsEmail !== null) {
                    setNotifyDealsEmail(storedDealsEmail === 'true');
                }
                const storedRemindersEmail = localStorage.getItem('notify_reminders_email');
                if (storedRemindersEmail !== null) {
                    setNotifyRemindersEmail(storedRemindersEmail === 'true');
                }
            } catch {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('auth_user');
            }
        }

        hasLoadedAddresses.current = true;
    }, []);

    useEffect(() => {
        if (authUser) {
            localStorage.setItem('account_section', accountSection);
        } else {
            localStorage.removeItem('account_section');
        }
    }, [authUser, accountSection]);

    useEffect(() => {
        if (hasLoadedAddresses.current) {
            hasLoadedAddresses.current;
        }
    }, [savedAddresses, authUser]);

    useEffect(() => {
        if (!hoveredMenu) return;

        const handleScroll = () => {
            const wrapper = navWrapperRefs.current[hoveredMenu];
            if (wrapper) {
                const rect = wrapper.getBoundingClientRect();
                const mainNavTop = 74; // main-nav top position
                const megamenuBottom = mainNavTop + 40; // account for main-nav height + padding
                const newTop = Math.max(mainNavTop + 40, rect.bottom + 10);
                setMenuTopOffset(newTop);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hoveredMenu]);

    useEffect(() => {
        const anyOverlayOpen = isEditingAccount || isAddingCard || isAddingAddress || isDeleteModalOpen || isLogoutModalOpen;

        if (anyOverlayOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.dataset.originalOverflow = originalOverflow;
            document.body.style.overflow = 'hidden';
        } else if (document.body.dataset.originalOverflow !== undefined) {
            document.body.style.overflow = document.body.dataset.originalOverflow;
            delete document.body.dataset.originalOverflow;
        }

        return () => {
            if (document.body.dataset.originalOverflow !== undefined) {
                document.body.style.overflow = document.body.dataset.originalOverflow;
                delete document.body.dataset.originalOverflow;
            }
        };
    }, [isEditingAccount, isAddingCard, isAddingAddress, isDeleteModalOpen, isLogoutModalOpen]);

    // Fetch regions when address drawer opens
    useEffect(() => {
        if (isAddingAddress) {
            fetch('https://psgc.cloud/api/regions')
                .then((res) => res.json())
                .then((data) => setRegions(data))
                .catch((err) => console.error('Failed to fetch regions:', err));
        }
    }, [isAddingAddress]);

    // Fetch provinces when region is selected
    useEffect(() => {
        if (selectedRegionCode) {
            setProvinces([]);
            setCities([]);
            setBarangays([]);
            setAddressCity('');
            setAddressBarangay('');
            setSelectedProvinceCode('');
            setSelectedCityCode('');

            fetch(`https://psgc.cloud/api/regions/${selectedRegionCode}/provinces`)
                .then((res) => res.json())
                .then((data) => setProvinces(data))
                .catch((err) => console.error('Failed to fetch provinces:', err));
        }
    }, [selectedRegionCode]);

    // Fetch cities when province is selected
    useEffect(() => {
        if (selectedProvinceCode) {
            setCities([]);
            setBarangays([]);
            setAddressBarangay('');
            setSelectedCityCode('');

            fetch(`https://psgc.cloud/api/provinces/${selectedProvinceCode}/cities-municipalities`)
                .then((res) => res.json())
                .then((data) => setCities(data))
                .catch((err) => console.error('Failed to fetch cities:', err));
        }
    }, [selectedProvinceCode]);

    // Fetch barangays when city is selected
    useEffect(() => {
        if (selectedCityCode) {
            setBarangays([]);

            fetch(`https://psgc.cloud/api/cities-municipalities/${selectedCityCode}/barangays`)
                .then((res) => res.json())
                .then((data) => setBarangays(data))
                .catch((err) => console.error('Failed to fetch barangays:', err));
        }
    }, [selectedCityCode]);

    // Save preferences to localStorage
    useEffect(() => {
        localStorage.setItem('preferred_content', preferredContent);
    }, [preferredContent]);

    useEffect(() => {
        localStorage.setItem('notify_deals_email', String(notifyDealsEmail));
    }, [notifyDealsEmail]);

    useEffect(() => {
        localStorage.setItem('notify_reminders_email', String(notifyRemindersEmail));
    }, [notifyRemindersEmail]);

    useEffect(() => {
        localStorage.setItem('saved_cards', JSON.stringify(savedCards));
    }, [savedCards]);

    useEffect(() => {
        if (mainCardId !== null) {
            localStorage.setItem('main_card_id', String(mainCardId));
        } else {
            localStorage.removeItem('main_card_id');
        }
    }, [mainCardId]);

    const handleMenuMouseEnter = (menuId: string) => {
        setHoveredMenu(menuId);
        setMenuTopOffset(190);
    };

    const handleMenuMouseLeave = () => {
        setHoveredMenu(null);
        setMenuTopOffset(190);
    };

    const navigateToAuth = (authMode: AuthMode = 'login') => {
        setMode(authMode);

        // Reset auth form fields appropriately when switching modes
        if (authMode === 'register') {
            setName('');
            setEmail('');
            setPassword('');
            setBirthday('');
            setGender('female');
            setWantNotifications(false);
        } else {
            // For login, at least clear the password for safety
            setPassword('');
        }

        setMessage('');
        setError('');
        setCurrentView('auth');
        window.scrollTo(0, 0);
    };

    const navigateToHome = () => {
        setCurrentView('home');
        window.scrollTo(0, 0);
    };

    const navigateToAccount = () => {
        if (!authUser) return;
        setAccountSection('details');
        localStorage.setItem('account_section', 'details');
        setCurrentView('account');
        window.scrollTo(0, 0);
    };

    const navigateToAccountSection = (
        section:
            | 'details'
            | 'wallet'
            | 'cashback'
            | 'zvip'
            | 'orders'
            | 'reviews'
            | 'cards'
            | 'addresses'
            | 'preferences'
            | 'wishlist'
            | 'delete-account',
    ) => {
        if (!authUser) return;
        setAccountSection(section);
        localStorage.setItem('account_section', section);
        setCurrentView('account');
        window.scrollTo(0, 0);
    };

    const scrollCarouselLeft = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
        }
    };

    const scrollCarouselRight = () => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('user_birthday');
        localStorage.removeItem('user_gender');
        setSavedAddresses([]);
        setAuthUser(null);
        setCurrentView('home');
        setMessage('');
        toast.success('You have been logged out successfully.', {
            autoClose: 3500,
        });
    };

    const openAddCard = () => {
        setCardType('visa');
        setCardNumber('');
        setCardExpiry('');
        setCardCvc('');
        setCardName('');
        setIsAddingCard(true);
    };

    const closeAddCard = () => {
        setIsAddingCard(false);
    };

    const openAddAddress = () => {
        setEditingAddressId(null);
        setAddressFirstName('');
        setAddressLastName('');
        setAddressPhone('');
        setAddressRegion('');
        setAddressCity('');
        setAddressBarangay('');
        setAddressStreet('');
        setAddressHouseNo('');
        setSelectedRegionCode('');
        setSelectedProvinceCode('');
        setSelectedCityCode('');
        setSelectedProvinceName('');
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setIsAddingAddress(true);
    };

    const openEditAddress = (address: Address) => {
        setEditingAddressId(address.id);
        setAddressFirstName(address.firstName);
        setAddressLastName(address.lastName);
        setAddressPhone(address.phone);
        setAddressRegion(address.region);
        setAddressCity(address.city);
        setAddressBarangay(address.barangay);
        setAddressStreet(address.street);
        setAddressHouseNo(address.houseNo);
        setSelectedProvinceName(address.province);
        setIsAddingAddress(true);

        // Fetch the regions first
        fetch('https://psgc.cloud/api/regions')
            .then((res) => res.json())
            .then((data) => {
                setRegions(data);
                // Find the region code
                const region = data.find((r: { name: string }) => r.name === address.region);
                if (region) {
                    setSelectedRegionCode(region.code);
                    // Fetch provinces for this region
                    return fetch(`https://psgc.cloud/api/regions/${region.code}/provinces`);
                }
            })
            .then((res) => res?.json())
            .then((data) => {
                if (data) {
                    setProvinces(data);
                    // Find the province code
                    const province = data.find((p: { name: string }) => p.name === address.province);
                    if (province) {
                        setSelectedProvinceCode(province.code);
                        // Fetch cities for this province
                        return fetch(`https://psgc.cloud/api/provinces/${province.code}/cities-municipalities`);
                    }
                }
            })
            .then((res) => res?.json())
            .then((data) => {
                if (data) {
                    setCities(data);
                    // Find the city code
                    const city = data.find((c: { name: string }) => c.name === address.city);
                    if (city) {
                        setSelectedCityCode(city.code);
                        // Fetch barangays for this city
                        return fetch(`https://psgc.cloud/api/cities-municipalities/${city.code}/barangays`);
                    }
                }
            })
            .then((res) => res?.json())
            .then((data) => {
                if (data) {
                    setBarangays(data);
                }
            })
            .catch(() => {
                // If any error occurs, just open with the data we have
            });
    };

    const closeAddAddress = () => {
        setIsAddingAddress(false);
        setEditingAddressId(null);
    };

    const openAccountEdit = () => {
        if (!authUser) return;

        const nameParts = authUser.name.split(' ');
        const first = nameParts[0] ?? '';
        const last = nameParts.slice(1).join(' ');

        setEditFirstName(first);
        setEditLastName(last);
        setEditEmail(authUser.email);
        setEditGender(gender);
        setEditBirthday(birthday);
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
            setAuthUser(response.user);
            setAccountSection('details');
            setCurrentView('account');
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

            // Automatically clear auth errors after 5 seconds
            setTimeout(() => {
                setError('');
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountEditSave = async (event: FormEvent) => {
        event.preventDefault();
        setAccountEditError('');

        // Validate password fields if user is trying to change password
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
            // Prepare update data
            const updateData: Record<string, unknown> = {
                first_name: editFirstName,
                last_name: editLastName,
                email: editEmail,
                birthday: editBirthday,
                gender: editGender,
            };

            // Add password fields if changing password
            if (editPassword && editNewPassword) {
                updateData.current_password = editPassword;
                updateData.password = editNewPassword;
                updateData.password_confirmation = editConfirmPassword;
            }

            // Call API to update profile
            const response = await apiClient.apiPost<{ user: User; token?: string; message: string }>(
                '/api/auth/update-profile',
                updateData
            );

            // Update local state with new user data
            setAuthUser(response.user);
            setBirthday(editBirthday);
            setGender(editGender);

            // Update localStorage
            localStorage.setItem('auth_user', JSON.stringify(response.user));
            localStorage.setItem('user_birthday', editBirthday);
            localStorage.setItem('user_gender', editGender);

            // If password was changed, update the token
            if (response.token) {
                localStorage.setItem('auth_token', response.token);
            }

            // Close the edit panel
            setIsEditingAccount(false);

            // Show success notification
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

    return (
        <div className="page">
            <div className="promo-banner">
                <div className="promo-item">
                    🎯 7 Days Free Returns | T&C Apply
                </div>
                <div className="promo-item">
                    ⭐ Become an AUCTIFY VIP today!
                </div>
                <div className="promo-item">
                    📱 Save more on the AUCTIFY App! 25% Off + ₱150 Off + Free Shipping
                </div>
            </div>
            <header className="topbar">
                <a onClick={navigateToHome} className="brand">AUCTIFY</a>
                <div className="search-bar">
                    <input type="text" placeholder="Search for auctions, items, categories..." />
                    <button className="search-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </button>
                </div>
                <div className="actions">
                    <div className="dropdown-wrapper">
                        <span
                            className="dropdown-trigger login-trigger"
                            aria-label={authUser ? 'Account menu' : 'Login or Register'}
                        >
                            <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 20c0-3 2.5-5 8-5s8 2 8 5" />
                            </svg>
                            <span>
                                {authUser ? `Hi, ${authUser.name.split(' ')[0]}` : 'Login / Register'}
                            </span>
                        </span>
                        <div className="dropdown-menu">
                            {authUser ? (
                                <>
                                    <div onClick={() => navigateToAccountSection('details')} className="dropdown-item clickable">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="8" r="4" />
                                            <path d="M4 20c0-3 2.5-5 8-5s8 2 8 5" />
                                        </svg>
                                        <span>Details</span>
                                    </div>
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => navigateToAccountSection('cashback')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 7v10M9 9h3.5a2.5 2.5 0 0 1 0 5H10" />
                                        </svg>
                                        <span>Cashback</span>
                                        <span className="dropdown-amount">Php 0.00</span>
                                    </div>
                                    <div className="dropdown-item clickable" onClick={() => navigateToAccountSection('wallet')}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="7" width="18" height="12" rx="2" />
                                            <path d="M7 7V5a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v2" />
                                            <path d="M7 12h4" />
                                        </svg>
                                        <span>Wallet</span>
                                        {mainCardId && savedCards.find(card => card.id === mainCardId) && (
                                            <img
                                                src={savedCards.find(card => card.id === mainCardId)!.type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${savedCards.find(card => card.id === mainCardId)!.type}.png`}
                                                alt="Card logo"
                                                className="dropdown-card-icon"
                                            />
                                        )}
                                        <span className="dropdown-amount">
                                            {mainCardId && savedCards.find(card => card.id === mainCardId)
                                                ? `₱${savedCards.find(card => card.id === mainCardId)!.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                : 'Php 0.00'
                                            }
                                        </span>
                                    </div>
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => navigateToAccountSection('wishlist')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                        </svg>
                                        <span>Wishlist</span>
                                    </div>
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => navigateToAccountSection('orders')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="3" y="4" width="18" height="16" rx="2" />
                                            <path d="M7 8h10M7 12h10M7 16h6" />
                                        </svg>
                                        <span>Orders</span>
                                    </div>
                                    <div
                                        className="dropdown-item clickable"
                                        onClick={() => navigateToAccountSection('reviews')}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
                                        </svg>
                                        <span>Reviews</span>
                                    </div>
                                    <div className="dropdown-item clickable">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M9.09 9A3 3 0 0 1 15 10c0 2-3 3-3 3" />
                                            <line x1="12" y1="17" x2="12.01" y2="17" />
                                        </svg>
                                        <span>FAQ</span>
                                    </div>
                                    <div
                                        onClick={() => setIsLogoutModalOpen(true)}
                                        className="dropdown-item clickable"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                            <path d="M10 17l5-5-5-5" />
                                            <path d="M13.8 12H3" />
                                        </svg>
                                        <span>Logout</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div onClick={() => navigateToAuth('login')} className="dropdown-item clickable">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3"/>
                                        </svg>
                                        Login
                                    </div>
                                    <div onClick={() => navigateToAuth('register')} className="dropdown-item clickable">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                            <circle cx="12" cy="7" r="4"/>
                                            <polyline points="12 12 12 12 16 16 16 20"/>
                                            <line x1="12" y1="12" x2="12" y2="20"/>
                                        </svg>
                                        Register
                                    </div>
                                    <a href="#orders" className="dropdown-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                                        </svg>
                                        Orders
                                    </a>
                                    <a href="#faq" className="dropdown-item">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"/>
                                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
                                        </svg>
                                        FAQ
                                    </a>
                                </>
                            )}
                        </div>
                    </div>
                    <a href="#favorites" className="fav-link" aria-label="Favorites">
                        <svg
                            className="fav-icon"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                        </svg>
                    </a>
                    <div className="dropdown-wrapper bag-dropdown">
                        <span className="dropdown-trigger" aria-label="Shopping Bag">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <rect x="4" y="7" width="16" height="13" rx="2" ry="2" />
                                <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                            </svg>
                        </span>
                        <div className="dropdown-menu bag-menu">
                            <div className="bag-empty-state">
                                <div className="bag-icon-wrapper">
                                    <svg className="bag-icon" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <rect x="3" y="7" width="18" height="13" rx="2" ry="2"/>
                                        <path d="M8 7V5a4 4 0 0 1 8 0v2"/>
                                        <path d="M12 12v3" strokeLinecap="round"/>
                                        <circle cx="12" cy="15" r="0.5" fill="currentColor"/>
                                    </svg>
                                    <div className="sparkle sparkle-1">✨</div>
                                    <div className="sparkle sparkle-2">✨</div>
                                </div>
                                <h3 className="bag-title">Your Bag is empty.</h3>
                                <p className="bag-subtitle">Start filling it up with your favourites.</p>
                                <button className="bag-cta-btn">See what's new</button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <nav className="main-nav">
                <div 
                    className="nav-item-wrapper"
                    ref={(el) => { if (el) navWrapperRefs.current['electronics'] = el; }}
                    onMouseEnter={() => handleMenuMouseEnter('electronics')}
                    onMouseLeave={handleMenuMouseLeave}
                >
                    <a href="#electronics" className="nav-item">ELECTRONICS</a>
                    <div className="nav-megamenu" style={{ top: `${menuTopOffset}px` }}>
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Electronics</div>
                            <a href="#new-auctions" className="megamenu-link">New Auctions</a>
                            <a href="#ending-soon" className="megamenu-link">Ending Soon</a>
                            <a href="#hot-items" className="megamenu-link">Hot Items</a>
                            <a href="#laptops" className="megamenu-link">Laptops & Computers</a>
                            <a href="#phones" className="megamenu-link">Phones & Accessories</a>
                            <a href="#audio" className="megamenu-link">Audio & Video</a>
                            <a href="#gaming" className="megamenu-link">Gaming</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Electronics</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Latest Gadgets</div>
                                    <div className="featured-item">Premium Brands</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Popular Sellers</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Apple</div>
                                <div className="brand-box">Samsung</div>
                                <div className="brand-box">Sony</div>
                                <div className="brand-box">LG</div>
                                <div className="brand-box">Dell</div>
                                <div className="brand-box">HP</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div 
                    className="nav-item-wrapper"
                    ref={(el) => { if (el) navWrapperRefs.current['collectibles'] = el; }}
                    onMouseEnter={() => handleMenuMouseEnter('collectibles')}
                    onMouseLeave={handleMenuMouseLeave}
                >
                    <a href="#collectibles" className="nav-item">COLLECTIBLES</a>
                    <div className="nav-megamenu" style={{ top: `${menuTopOffset}px` }}>
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Collectibles</div>
                            <a href="#coins" className="megamenu-link">Rare Coins</a>
                            <a href="#trading-cards" className="megamenu-link">Trading Cards</a>
                            <a href="#memorabilia" className="megamenu-link">Sports Memorabilia</a>
                            <a href="#vintage-items" className="megamenu-link">Vintage Items</a>
                            <a href="#stamps" className="megamenu-link">Stamps & Documents</a>
                            <a href="#action-figures" className="megamenu-link">Action Figures</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Collectibles</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Trending Now</h3>
                                <div className="featured-items">
                                    <div className="featured-item">High Value Items</div>
                                    <div className="featured-item">Authenticated Items</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Categories</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Graded Items</div>
                                <div className="brand-box">Vintage</div>
                                <div className="brand-box">Modern</div>
                                <div className="brand-box">Rare</div>
                                <div className="brand-box">Limited</div>
                                <div className="brand-box">Unique</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#art" className="nav-item">ART</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Art</div>
                            <a href="#paintings" className="megamenu-link">Paintings</a>
                            <a href="#sculptures" className="megamenu-link">Sculptures</a>
                            <a href="#photography" className="megamenu-link">Photography</a>
                            <a href="#prints" className="megamenu-link">Prints & Drawings</a>
                            <a href="#contemporary" className="megamenu-link">Contemporary Art</a>
                            <a href="#digital" className="megamenu-link">Digital Art</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Art</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Artist Collections</div>
                                    <div className="featured-item">Signed Works</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Art Styles</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Abstract</div>
                                <div className="brand-box">Modern</div>
                                <div className="brand-box">Classical</div>
                                <div className="brand-box">Contemporary</div>
                                <div className="brand-box">Surreal</div>
                                <div className="brand-box">Impressionist</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#luxury" className="nav-item">LUXURY</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Luxury</div>
                            <a href="#designer-bags" className="megamenu-link">Designer Bags</a>
                            <a href="#luxury-watches" className="megamenu-link">Luxury Watches</a>
                            <a href="#fine-jewelry" className="megamenu-link">Fine Jewelry</a>
                            <a href="#designer-fashion" className="megamenu-link">Designer Fashion</a>
                            <a href="#luxury-accessories" className="megamenu-link">Accessories</a>
                            <a href="#haute-couture" className="megamenu-link">Haute Couture</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Luxury</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Premium Collections</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Certified Authentic</div>
                                    <div className="featured-item">Limited Edition</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Luxury Brands</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Hermès</div>
                                <div className="brand-box">Gucci</div>
                                <div className="brand-box">Louis Vuitton</div>
                                <div className="brand-box">Chanel</div>
                                <div className="brand-box">Cartier</div>
                                <div className="brand-box">Rolex</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#antiques" className="nav-item">ANTIQUES</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Antiques</div>
                            <a href="#furniture" className="megamenu-link">Antique Furniture</a>
                            <a href="#porcelain" className="megamenu-link">Porcelain & Pottery</a>
                            <a href="#silver" className="megamenu-link">Silver & Metals</a>
                            <a href="#textiles" className="megamenu-link">Textiles & Rugs</a>
                            <a href="#decor" className="megamenu-link">Decorative Items</a>
                            <a href="#vintage-tools" className="megamenu-link">Vintage Tools</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Antiques</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Rare Finds</h3>
                                <div className="featured-items">
                                    <div className="featured-item">18th Century</div>
                                    <div className="featured-item">Victorian Era</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Periods</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Art Deco</div>
                                <div className="brand-box">Victorian</div>
                                <div className="brand-box">Edwardian</div>
                                <div className="brand-box">Medieval</div>
                                <div className="brand-box">Colonial</div>
                                <div className="brand-box">Ancient</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#vehicles" className="nav-item">VEHICLES</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Vehicles</div>
                            <a href="#classic-cars" className="megamenu-link">Classic Cars</a>
                            <a href="#motorcycles" className="megamenu-link">Motorcycles</a>
                            <a href="#rare-vehicles" className="megamenu-link">Rare Vehicles</a>
                            <a href="#auto-parts" className="megamenu-link">Auto Parts</a>
                            <a href="#memorabilia" className="megamenu-link">Automotive Memorabilia</a>
                            <a href="#restoration" className="megamenu-link">Restoration Projects</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Vehicles</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Certified Pre-Owned</div>
                                    <div className="featured-item">Collector's Items</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Popular Makes</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Ferrari</div>
                                <div className="brand-box">Bugatti</div>
                                <div className="brand-box">Mercedes</div>
                                <div className="brand-box">Lamborghini</div>
                                <div className="brand-box">Porsche</div>
                                <div className="brand-box">Harley</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#fashion" className="nav-item">FASHION</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Fashion</div>
                            <a href="#dresses" className="megamenu-link">Dresses</a>
                            <a href="#menswear" className="megamenu-link">Menswear</a>
                            <a href="#footwear" className="megamenu-link">Footwear</a>
                            <a href="#outerwear" className="megamenu-link">Outerwear</a>
                            <a href="#accessories-fashion" className="megamenu-link">Fashion Accessories</a>
                            <a href="#sportswear" className="megamenu-link">Sportswear</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Fashion</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>New Arrivals</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Designer Collections</div>
                                    <div className="featured-item">Vintage Fashion</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Top Brands</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Versace</div>
                                <div className="brand-box">Prada</div>
                                <div className="brand-box">Dior</div>
                                <div className="brand-box">Valentino</div>
                                <div className="brand-box">Armani</div>
                                <div className="brand-box">Balenciaga</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#property" className="nav-item">PROPERTY</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Property</div>
                            <a href="#residential" className="megamenu-link">Residential</a>
                            <a href="#commercial" className="megamenu-link">Commercial</a>
                            <a href="#land" className="megamenu-link">Land & Lots</a>
                            <a href="#foreclosures" className="megamenu-link">Foreclosures</a>
                            <a href="#lease" className="megamenu-link">Lease Auctions</a>
                            <a href="#unique-properties" className="megamenu-link">Unique Properties</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Property</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Featured Auctions</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Prime Locations</div>
                                    <div className="featured-item">Investment Properties</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Property Types</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Apartments</div>
                                <div className="brand-box">Houses</div>
                                <div className="brand-box">Offices</div>
                                <div className="brand-box">Retail</div>
                                <div className="brand-box">Warehouse</div>
                                <div className="brand-box">Estates</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#niche" className="nav-item">NICHE</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">Niche</div>
                            <a href="#unique-items" className="megamenu-link">Unique Items</a>
                            <a href="#novelty" className="megamenu-link">Novelty & Fun</a>
                            <a href="#handmade" className="megamenu-link">Handmade Crafts</a>
                            <a href="#collectibles-niche" className="megamenu-link">Specialized Collections</a>
                            <a href="#pop-culture" className="megamenu-link">Pop Culture</a>
                            <a href="#experiential" className="megamenu-link">Experiential Auctions</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">Niche</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Trending</h3>
                                <div className="featured-items">
                                    <div className="featured-item">One-of-a-Kind</div>
                                    <div className="featured-item">Exclusive Finds</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Collections</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Toys</div>
                                <div className="brand-box">Gifts</div>
                                <div className="brand-box">Curiosities</div>
                                <div className="brand-box">Art Crafts</div>
                                <div className="brand-box">Oddities</div>
                                <div className="brand-box">Premium</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="nav-item-wrapper">
                    <a href="#school" className="nav-item">SCHOOL</a>
                    <div className="nav-megamenu">
                        <div className="megamenu-sidebar">
                            <div className="megamenu-section-title">School</div>
                            <a href="#textbooks" className="megamenu-link">Textbooks</a>
                            <a href="#supplies" className="megamenu-link">School Supplies</a>
                            <a href="#equipment" className="megamenu-link">Educational Equipment</a>
                            <a href="#uniforms" className="megamenu-link">Uniforms & Gear</a>
                            <a href="#sports-equip" className="megamenu-link">Sports Equipment</a>
                            <a href="#tech-learning" className="megamenu-link">Learning Tech</a>
                        </div>
                        <div className="megamenu-content">
                            <div className="megamenu-header">School</div>
                            <a href="#shop-all" className="megamenu-shop-all">Shop All</a>
                            <div className="megamenu-featured">
                                <h3>Essential Items</h3>
                                <div className="featured-items">
                                    <div className="featured-item">Back-to-School</div>
                                    <div className="featured-item">Bulk Supplies</div>
                                </div>
                            </div>
                        </div>
                        <div className="megamenu-brands">
                            <h3>Categories</h3>
                            <div className="brand-grid">
                                <div className="brand-box">Early Years</div>
                                <div className="brand-box">Primary</div>
                                <div className="brand-box">Secondary</div>
                                <div className="brand-box">Higher Ed</div>
                                <div className="brand-box">Specialized</div>
                                <div className="brand-box">Bulk</div>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="content">
                {currentView === 'home' && (
                <>
                <div className="carousel-container">
                    <button className="carousel-btn carousel-btn-prev" onClick={scrollCarouselLeft} aria-label="Previous">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <div className="brand-carousel" ref={carouselRef}>
                        <div className="brand-circle">
                            <div className="circle yellow">
                                <span className="circle-text">FLASH<br/>SALE</span>
                            </div>
                            <p className="circle-label">Up to 70% Off!</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">ROLEX<br/>OMEGA</span>
                            </div>
                            <p className="circle-label">Up to 15% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">CLASSIC<br/>CARS</span>
                            </div>
                            <p className="circle-label">Up to 85% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">HERMES<br/>GUCCI</span>
                            </div>
                            <p className="circle-label">Up to 25% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">FINE<br/>ART</span>
                            </div>
                            <p className="circle-label">Up to 50% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">VINTAGE<br/>WATCHES</span>
                            </div>
                            <p className="circle-label">Up to 30% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">RARE<br/>COINS</span>
                            </div>
                            <p className="circle-label">Up to 40% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">JEWELRY</span>
                            </div>
                            <p className="circle-label">Up to 45% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">GAMING<br/>CONSOLES</span>
                            </div>
                            <p className="circle-label">Up to 35% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">FASHION<br/>BRANDS</span>
                            </div>
                            <p className="circle-label">Up to 55% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">VEHICLES<br/>MEMORABILIA</span>
                            </div>
                            <p className="circle-label">Up to 60% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">RARE<br/>BOOKS</span>
                            </div>
                            <p className="circle-label">Up to 45% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">WINE &<br/>SPIRITS</span>
                            </div>
                            <p className="circle-label">Up to 30% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">MUSICAL<br/>INSTRUMENTS</span>
                            </div>
                            <p className="circle-label">Up to 50% Off</p>
                        </div>
                        <div className="brand-circle">
                            <div className="circle black">
                                <span className="circle-text">PHOTOGRAPHY<br/>GEAR</span>
                            </div>
                            <p className="circle-label">Up to 40% Off</p>
                        </div>
                    </div>
                    <button className="carousel-btn carousel-btn-next" onClick={scrollCarouselRight} aria-label="Next">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                </div>

                <div className="hero-banner">
                    <div className="hero-content">
                        <h2 className="hero-subtitle">WEEKEND SPECIAL</h2>
                        <h1 className="hero-title">Exceptional Finds</h1>
                        <h1 className="hero-price">Up to 60% Off</h1>
                        <div className="hero-brands">
                            <span>Rolex</span>
                            <span>Ferrari</span>
                            <span>Picasso</span>
                        </div>
                        <button className="hero-btn" onClick={() => navigateToAuth('register')}>BID NOW →</button>
                        <p className="hero-disclaimer">T&Cs apply. Ends February 18, 12 noon.<br/>Live Auction Starts at 2PM</p>
                    </div>
                    <div className="hero-image">
                        <div className="hero-placeholder">🏆</div>
                    </div>
                </div>
                </>
                )}

                {currentView === 'auth' && (
                <section className="auth-card" id="auth">
                    <div className="tabs">
                        <div
                            className={`tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => setMode('login')}
                            onKeyDown={(event) => event.key === 'Enter' && setMode('login')}
                            role="button"
                            tabIndex={0}
                        >
                            Login
                        </div>
                        <div
                            className={`tab ${mode === 'register' ? 'active' : ''}`}
                            onClick={() => setMode('register')}
                            onKeyDown={(event) => event.key === 'Enter' && setMode('register')}
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
                )}

                {currentView === 'account' && authUser && (
                <section className="account-layout">
                    <aside className="account-sidebar">
                        <h2 className="account-sidebar-title">MY ACCOUNT</h2>
                        <button
                            className={`account-sidebar-item ${accountSection === 'details' ? 'active' : ''}`}
                            onClick={() => setAccountSection('details')}
                        >
                            Account information
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'wallet' ? 'active' : ''}`}
                            onClick={() => setAccountSection('wallet')}
                        >
                            My Wallet
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'cashback' ? 'active' : ''}`}
                            onClick={() => setAccountSection('cashback')}
                        >
                            My Cashback
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'zvip' ? 'active' : ''}`}
                            onClick={() => setAccountSection('zvip')}
                        >
                            My ZVIP
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'orders' ? 'active' : ''}`}
                            onClick={() => setAccountSection('orders')}
                        >
                            Orders &amp; Tracking
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'reviews' ? 'active' : ''}`}
                            onClick={() => setAccountSection('reviews')}
                        >
                            My Reviews
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'cards' ? 'active' : ''}`}
                            onClick={() => setAccountSection('cards')}
                        >
                            My Cards
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'addresses' ? 'active' : ''}`}
                            onClick={() => setAccountSection('addresses')}
                        >
                            Saved Addresses
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'preferences' ? 'active' : ''}`}
                            onClick={() => setAccountSection('preferences')}
                        >
                            Preferences
                        </button>
                        <button
                            className={`account-sidebar-item ${accountSection === 'wishlist' ? 'active' : ''}`}
                            onClick={() => setAccountSection('wishlist')}
                        >
                            Wishlist
                        </button>
                        <button
                            className={`account-sidebar-item ${
                                accountSection === 'delete-account' ? 'active' : ''
                            }`}
                            onClick={() => setAccountSection('delete-account')}
                        >
                            Request Account Deletion
                        </button>
                    </aside>

                    <div className="account-main">
                        {accountSection === 'details' && (
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
                                            onClick={() => setAccountSection('addresses')}
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
                                                onClick={openAddAddress}
                                            >
                                                Add New Address
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="account-card-body">
                                            {savedAddresses.slice(0, 2).map((address) => (
                                                <div key={address.id} className="account-field-group">
                                                    <div className="account-field-label">
                                                        {address.firstName} {address.lastName}
                                                    </div>
                                                    <div className="account-field-value">
                                                        {address.street}
                                                        {address.houseNo && `, ${address.houseNo}`}, {address.barangay}, {address.city}
                                                    </div>
                                                </div>
                                            ))}
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
                            </>
                        )}

                        {accountSection === 'wallet' && (
                            <div className="wallet-main">
                                <div className="wallet-header">
                                    <div className="wallet-header-icon" aria-hidden="true">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        >
                                            <rect x="3" y="7" width="18" height="12" rx="3" />
                                            <path d="M7 7V6a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                                        </svg>
                                    </div>
                                    <h2 className="wallet-header-title">My Wallet</h2>
                                </div>

                                <div className="wallet-balance-card">
                                    <div className="wallet-balance-illustration" aria-hidden="true">
                                        {(() => {
                                            const mainCard = savedCards.find((card) => card.id === mainCardId);
                                            if (mainCard) {
                                                return (
                                                    <img
                                                        src={mainCard.type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${mainCard.type}.png`}
                                                        alt={`${mainCard.type} logo`}
                                                        className="wallet-balance-card-logo"
                                                    />
                                                );
                                            }
                                            return (
                                                <>
                                                    <div className="wallet-illustration-main" />
                                                    <div className="wallet-illustration-line" />
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="wallet-balance-content">
                                        <div className="wallet-balance-label">You have</div>
                                        <div className="wallet-balance-amount">
                                            {(() => {
                                                const mainCard = savedCards.find((card) => card.id === mainCardId);
                                                if (mainCard) {
                                                    return `₱${mainCard.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                                }
                                                return 'Php 0.00';
                                            })()}
                                        </div>
                                        <div className="wallet-balance-subtext">available in wallet credit</div>
                                        <button type="button" className="wallet-balance-link">
                                            How does it work?
                                        </button>
                                    </div>
                                </div>

                                {savedCards.length > 0 && (
                                    <div className="wallet-cards-section">
                                        <h3 className="wallet-cards-title">Select Main Card for Transactions</h3>
                                        <div className="wallet-cards-list">
                                            {savedCards.map((card) => (
                                                <div
                                                    key={card.id}
                                                    className={`wallet-card-item ${mainCardId === card.id ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setMainCardId(card.id);
                                                        const displayName = card.type === 'mastercard' ? 'LANDBANK' : card.type.toUpperCase();
                                                        toast.success(`${displayName} card set as main card.`, {
                                                            autoClose: 2500,
                                                        });
                                                    }}
                                                >
                                                    <div className="wallet-card-radio">
                                                        <input
                                                            type="radio"
                                                            name="main-card"
                                                            checked={mainCardId === card.id}
                                                            onChange={() => setMainCardId(card.id)}
                                                        />
                                                    </div>
                                                    <img
                                                        src={card.type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${card.type}.png`}
                                                        alt={card.type === 'mastercard' ? 'Landbank' : card.type}
                                                        className="wallet-card-logo"
                                                    />
                                                    <div className="wallet-card-info">
                                                        <div className="wallet-card-number">
                                                            •••• •••• •••• {card.number.slice(-4)}
                                                        </div>
                                                        <div className="wallet-card-name">{card.name}</div>
                                                    </div>
                                                    <div className="wallet-card-balance">
                                                        ₱{card.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="wallet-code-card">
                                    <div className="wallet-code-header">
                                        <div className="wallet-code-icon" aria-hidden="true">
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                            >
                                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                                <path d="M7 9h10" />
                                                <path d="M9 13h2" />
                                                <path d="M13 13h2" />
                                            </svg>
                                        </div>
                                        <div className="wallet-code-title">Have a store credit code?</div>
                                    </div>
                                    <div className="wallet-code-input-row">
                                        <input
                                            type="text"
                                            className="wallet-code-input"
                                            placeholder="Enter store credit code"
                                        />
                                        <button type="button" className="wallet-code-apply">
                                            Apply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {accountSection === 'cashback' && (
                            <div className="cashback-main">
                                <div className="cashback-header">
                                    <div className="cashback-header-icon" aria-hidden="true">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        >
                                            <circle cx="12" cy="12" r="9" />
                                            <path d="M12 7v10M9.5 9.5H13a2.5 2.5 0 0 1 0 5h-2" />
                                        </svg>
                                    </div>
                                    <h2 className="cashback-header-title">Cashback</h2>
                                </div>

                                <div className="cashback-balance-card">
                                    <div className="cashback-balance-illustration" aria-hidden="true">
                                        <div className="cashback-coin">
                                            <div className="cashback-coin-inner">₱</div>
                                        </div>
                                        <div className="cashback-arrow" />
                                    </div>
                                    <div className="cashback-balance-content">
                                        <div className="cashback-balance-label">You have</div>
                                        <div className="cashback-balance-amount">Php 0.00</div>
                                        <div className="cashback-balance-subtext">available cashback to spend!</div>
                                    </div>
                                </div>

                                <div className="cashback-empty-card">
                                    <div className="cashback-empty-icon" aria-hidden="true">
                                        <svg
                                            width="60"
                                            height="60"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.4"
                                        >
                                            <path d="M4 9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                                            <path d="M9 9V7a3 3 0 0 1 6 0v2" />
                                            <path d="M10 13h4" />
                                        </svg>
                                    </div>
                                    <div className="cashback-empty-text">Start shopping now to earn cashback!</div>
                                    <button type="button" className="cashback-empty-button">
                                        Let&apos;s go Shopping!
                                    </button>
                                </div>
                            </div>
                        )}

                        {accountSection === 'zvip' && (
                            <div className="zvip-main">
                                <div className="zvip-header">
                                    <div className="zvip-header-icon" aria-hidden="true">
                                        <span>VIP</span>
                                    </div>
                                    <h2 className="zvip-header-title">My ZVIP</h2>
                                </div>

                                <div className="zvip-banner">
                                    <div className="zvip-badge" aria-hidden="true">
                                        <span className="zvip-badge-label">VIP</span>
                                    </div>
                                    <div className="zvip-banner-content">
                                        <div className="zvip-banner-title">
                                            Enjoy 1-year of Unlimited Free Shipping
                                        </div>
                                        <div className="zvip-banner-subtext">
                                            to all Sold by AUCTIFY and Havaianas items for Php 500.00 <span className="zvip-banner-strikethrough">750.00!</span>
                                        </div>
                                    </div>
                                    <div className="zvip-banner-arrow" aria-hidden="true">
                                        ›
                                    </div>
                                </div>

                                <h3 className="zvip-subscribe-title">Subscribe to AUCTIFY VIP</h3>

                                <div className="zvip-benefits">
                                    <div className="zvip-benefit-card">
                                        <div className="zvip-benefit-image" style={{ background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)' }} />
                                        <h4 className="zvip-benefit-title">Unlimited Free Shipping with no min spend</h4>
                                        <p className="zvip-benefit-desc">For products sold by AUCTIFY and participating sellers.</p>
                                    </div>
                                    <div className="zvip-benefit-card">
                                        <div className="zvip-benefit-image" style={{ background: 'linear-gradient(135deg, #a78bfa, #c4b5fd)' }} />
                                        <h4 className="zvip-benefit-title">Full Rebate</h4>
                                        <p className="zvip-benefit-desc">Get Php 600 worth of vouchers</p>
                                    </div>
                                    <div className="zvip-benefit-card">
                                        <div className="zvip-benefit-image" style={{ background: 'linear-gradient(135deg, #fb7185, #fda4af)' }} />
                                        <h4 className="zvip-benefit-title">Priority Access to Exclusive Sales</h4>
                                        <p className="zvip-benefit-desc">Get the best deals before everyone else.</p>
                                    </div>
                                    <div className="zvip-benefit-card">
                                        <div className="zvip-benefit-image" style={{ background: 'linear-gradient(135deg, #fb923c, #fdba74)' }} />
                                        <h4 className="zvip-benefit-title">Exclusive Rewards from Partners</h4>
                                        <p className="zvip-benefit-desc">Enjoy specially curated deals from Klook, Parlon, and many more.</p>
                                    </div>
                                </div>

                                <div className="zvip-carousel-nav">
                                    <button 
                                        type="button" 
                                        className="zvip-nav-button" 
                                        disabled={zvipCarouselPage === 0}
                                        onClick={() => setZvipCarouselPage(0)}
                                    >
                                        ‹ Back
                                    </button>
                                    <div className="zvip-dots">
                                        <span 
                                            className={`zvip-dot ${zvipCarouselPage === 0 ? 'active' : ''}`}
                                            onClick={() => setZvipCarouselPage(0)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span 
                                            className={`zvip-dot ${zvipCarouselPage === 1 ? 'active' : ''}`}
                                            onClick={() => setZvipCarouselPage(1)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        className="zvip-nav-button"
                                        disabled={zvipCarouselPage === 1}
                                        onClick={() => setZvipCarouselPage(1)}
                                    >
                                        Next ›
                                    </button>
                                </div>

                                <button type="button" className="zvip-add-button">
                                    Add to Bag
                                </button>
                            </div>
                        )}

                        {accountSection === 'orders' && (
                            <div className="orders-main">
                                <div className="orders-header">
                                    <div className="orders-header-icon" aria-hidden="true">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        >
                                            <rect x="3" y="4" width="18" height="16" rx="2" />
                                            <path d="M7 8h10" />
                                            <path d="M7 12h10" />
                                        </svg>
                                    </div>
                                    <h2 className="orders-header-title">Orders &amp; Tracking</h2>
                                </div>

                                <div className="orders-tabs">
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'all' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('all')}
                                    >
                                        All
                                    </button>
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'unpaid' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('unpaid')}
                                    >
                                        Unpaid
                                    </button>
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'processing' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('processing')}
                                    >
                                        Processing
                                    </button>
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'delivered' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('delivered')}
                                    >
                                        Delivered
                                    </button>
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'returns' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('returns')}
                                    >
                                        Returns/Exchanges
                                    </button>
                                    <button
                                        type="button"
                                        className={`orders-tab ${ordersTab === 'cancelled' ? 'active' : ''}`}
                                        onClick={() => setOrdersTab('cancelled')}
                                    >
                                        Cancelled
                                    </button>
                                </div>

                                {ordersTab === 'all' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">No products at this moment</div>
                                        <div className="orders-empty-text">
                                            Once you place an order, it will show here so you can
                                            track its status.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            Continue Shopping
                                        </button>
                                    </div>
                                )}

                                {ordersTab === 'unpaid' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">You have no unpaid orders</div>
                                        <div className="orders-empty-text">
                                            Any orders waiting for payment will appear here until
                                            you complete checkout.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            Go to Checkout
                                        </button>
                                    </div>
                                )}

                                {ordersTab === 'processing' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">No processing orders right now</div>
                                        <div className="orders-empty-text">
                                            When sellers are preparing your items, you&apos;ll see
                                            those orders in this tab.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            Continue Shopping
                                        </button>
                                    </div>
                                )}

                                {ordersTab === 'delivered' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">No delivered orders yet</div>
                                        <div className="orders-empty-text">
                                            Once your items arrive, your completed orders will be
                                            listed here.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            Start Bidding
                                        </button>
                                    </div>
                                )}

                                {ordersTab === 'returns' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">No returns or exchanges</div>
                                        <div className="orders-empty-text">
                                            Any items you send back or exchange will be tracked in
                                            this tab.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            View Return Policy
                                        </button>
                                    </div>
                                )}

                                {ordersTab === 'cancelled' && (
                                    <div className="orders-empty-card">
                                        <div className="orders-empty-icon" aria-hidden="true">
                                            <svg
                                                width="60"
                                                height="60"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <path d="M3 9h18l-2 9H5z" />
                                                <path d="M8 9l1-4h6l1 4" />
                                            </svg>
                                        </div>
                                        <div className="orders-empty-title">You have no cancelled orders</div>
                                        <div className="orders-empty-text">
                                            If any orders are cancelled, you&apos;ll see them listed
                                            here for your reference.
                                        </div>
                                        <button type="button" className="orders-empty-button">
                                            Continue Shopping
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {accountSection === 'cards' && (
                            <div className="cards-main">
                                <div className="cards-header">
                                    <div className="cards-header-icon" aria-hidden="true">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        >
                                            <rect x="3" y="6" width="18" height="12" rx="2" />
                                            <path d="M3 10h18" />
                                        </svg>
                                    </div>
                                    <h2 className="cards-header-title">My Cards</h2>
                                </div>

                                {savedCards.length === 0 ? (
                                    <div className="cards-empty-card">
                                        <div className="cards-empty-illustration" aria-hidden="true">
                                            <div className="cards-empty-face">
                                                <div className="cards-empty-eyes" />
                                                <div className="cards-empty-smile" />
                                            </div>
                                        </div>
                                        <div className="cards-empty-title">Simplify Shopping</div>
                                        <div className="cards-empty-subtitle">
                                            Save Your Credit/Debit Cards Today!
                                        </div>
                                        <div className="cards-empty-text">
                                            Trust in us to deliver not only fashion but also the utmost
                                            security and convenience.
                                        </div>
                                        <button
                                            type="button"
                                            className="cards-empty-button"
                                            onClick={openAddCard}
                                        >
                                            Add New Card
                                        </button>
                                    </div>
                                ) : (
                                    <div className="cards-list">
                                        {savedCards.map((card) => (
                                            <div key={card.id} className="saved-card">
                                                <div className="saved-card-header">
                                                    <img 
                                                        src={card.type === 'mastercard' ? '/icons/landbank.jpg' : `/icons/${card.type}.png`} 
                                                        alt={card.type === 'mastercard' ? 'Landbank' : card.type} 
                                                        className="saved-card-logo"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="saved-card-delete"
                                                        onClick={() => {
                                                            if (mainCardId === card.id) {
                                                                setMainCardId(null);
                                                            }
                                                            setSavedCards((prev) => prev.filter((c) => c.id !== card.id));
                                                            toast.success('Card removed successfully.', {
                                                                autoClose: 3500,
                                                            });
                                                        }}
                                                        aria-label="Delete card"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="saved-card-number">
                                                    •••• •••• •••• {card.number.slice(-4)}
                                                </div>
                                                <div className="saved-card-details">
                                                    <div className="saved-card-name">{card.name}</div>
                                                    <div className="saved-card-expiry">{card.expiry}</div>
                                                </div>
                                                <div className="saved-card-balance">
                                                    Balance: ₱{card.balance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="cards-add-button"
                                            onClick={openAddCard}
                                        >
                                            + Add New Card
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {accountSection === 'addresses' && (
                            <div className="addresses-main">
                                <div className="addresses-header">
                                    <div className="addresses-header-icon" aria-hidden="true">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                        >
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                    </div>
                                    <h2 className="addresses-header-title">Saved Addresses ({savedAddresses.length})</h2>
                                </div>

                                {savedAddresses.length === 0 ? (
                                    <div className="addresses-empty-card">
                                        <div className="addresses-empty-icon" aria-hidden="true">
                                            <svg
                                                width="100"
                                                height="100"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.2"
                                            >
                                                <rect x="3" y="7" width="18" height="13" rx="2" />
                                                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </div>
                                        <div className="addresses-empty-text">You don&apos;t have any saved address</div>
                                        <button
                                            type="button"
                                            className="addresses-empty-button"
                                            onClick={openAddAddress}
                                        >
                                            Add New Address
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="addresses-list">
                                            {savedAddresses.map((address) => (
                                                <div key={address.id} className="address-card">
                                                    <div className="address-card-header">
                                                        <div className="address-card-name">
                                                            {address.firstName} {address.lastName}
                                                        </div>
                                                        <div className="address-card-actions">
                                                            <button
                                                                type="button"
                                                                className="address-card-edit"
                                                                onClick={() => openEditAddress(address)}
                                                                aria-label="Edit address"
                                                            >
                                                                <img src="/icons/edit.png" alt="Edit" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="address-card-delete"
                                                                onClick={() => {
                                                                    fetch(`/api/addresses/${address.id}`, {
                                                                        method: 'DELETE',
                                                                        headers: {
                                                                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                                                        },
                                                                    })
                                                                        .then(async (res) => {
                                                                            const data = await res.json();
                                                                            if (!res.ok) {
                                                                                throw new Error(data.message || 'Failed to delete address');
                                                                            }
                                                                            return data;
                                                                        })
                                                                        .then(() => {
                                                                            setSavedAddresses((prev) =>
                                                                                prev.filter((a) => a.id !== address.id)
                                                                            );
                                                                            toast.success('Address deleted successfully.', {
                                                                                autoClose: 3500,
                                                                            });
                                                                        })
                                                                        .catch((error) => {
                                                                            console.error('Address error:', error);
                                                                            toast.error(error.message || 'Failed to delete address.', {
                                                                                autoClose: 3500,
                                                                            });
                                                                        });
                                                                }}
                                                                aria-label="Delete address"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="address-card-phone">{address.phone}</div>
                                                    <div className="address-card-details">
                                                        {address.street}
                                                        {address.houseNo && `, ${address.houseNo}`}
                                                        <br />
                                                        {address.barangay}, {address.city}
                                                        <br />
                                                        {address.province}, {address.region}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            className="addresses-add-button"
                                            onClick={openAddAddress}
                                        >
                                            Add New Address
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {accountSection === 'reviews' && (
                            <div className="reviews-main">
                                <div className="reviews-tabs">
                                    <button
                                        type="button"
                                        className={`reviews-tab ${reviewsTab === 'to-review' ? 'active' : ''}`}
                                        onClick={() => setReviewsTab('to-review')}
                                    >
                                        To Review
                                    </button>
                                    <button
                                        type="button"
                                        className={`reviews-tab ${reviewsTab === 'submitted' ? 'active' : ''}`}
                                        onClick={() => setReviewsTab('submitted')}
                                    >
                                        Submitted
                                    </button>
                                </div>

                                {reviewsTab === 'to-review' && (
                                    <div className="reviews-empty-card">
                                        <div className="reviews-empty-icon" aria-hidden="true">
                                            <svg
                                                width="90"
                                                height="90"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <circle cx="12" cy="12" r="9" />
                                                <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                                            </svg>
                                        </div>
                                        <div className="reviews-empty-text-main">
                                            No products to review yet. Start shopping and write a review after the
                                            delivery!
                                        </div>
                                        <button type="button" className="reviews-empty-button">
                                            Continue Shopping
                                        </button>
                                    </div>
                                )}

                                {reviewsTab === 'submitted' && (
                                    <div className="reviews-empty-card">
                                        <div className="reviews-empty-icon" aria-hidden="true">
                                            <svg
                                                width="90"
                                                height="90"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.4"
                                            >
                                                <circle cx="12" cy="12" r="9" />
                                                <path d="M12 6.5l1.76 3.57 3.94.57-2.85 2.77.67 3.89L12 15.8l-3.52 1.9.67-3.89-2.85-2.77 3.94-.57z" />
                                            </svg>
                                        </div>
                                        <div className="reviews-empty-text-main">
                                            You haven&apos;t submitted any product reviews yet.
                                        </div>
                                        <button type="button" className="reviews-empty-button">
                                            Continue Shopping
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {accountSection === 'wishlist' && (
                            <div className="wishlist-main">
                                <div className="wishlist-empty-card">
                                    <div className="wishlist-illustration" aria-hidden="true">
                                        <div className="wishlist-circle">
                                            <svg
                                                width="80"
                                                height="80"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                            >
                                                <path d="M12 21s-5.5-3.2-8.2-6C1.7 12.8 1.5 9.3 3.7 7.1 5.3 5.5 7.9 5.4 9.6 6.7L12 8.9l2.4-2.2c1.7-1.3 4.3-1.2 5.9.4 2.2 2.2 2 5.7-.1 7.9-2.7 2.8-8.2 6-8.2 6z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <div className="wishlist-title">Your Wishlist is empty.</div>
                                    <div className="wishlist-text">
                                        Start saving auctions you love and find them all in one place.
                                    </div>
                                    <button type="button" className="wishlist-button">
                                        Let&apos;s go Shopping!
                                    </button>
                                </div>
                            </div>
                        )}

                        {accountSection === 'preferences' && (
                            <div className="preferences-main">
                                <div className="preferences-card">
                                    <div className="preferences-card-header">
                                        <div className="preferences-card-title">
                                            <span className="preferences-card-icon" aria-hidden="true">⚙️</span>
                                            <span>Preferences</span>
                                        </div>
                                    </div>

                                    <div className="preferences-section">
                                        <div className="preferences-section-title">Preferred Content</div>
                                        <div className="preferences-section-text">
                                            Tell us what you like to see first on Auctify.
                                        </div>
                                        <div className="preferences-radio-row">
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'electronics' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="electronics"
                                                    checked={preferredContent === 'electronics'}
                                                    onChange={() => setPreferredContent('electronics')}
                                                />
                                                <span>Electronics &amp; Tech</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'collectibles' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="collectibles"
                                                    checked={preferredContent === 'collectibles'}
                                                    onChange={() => setPreferredContent('collectibles')}
                                                />
                                                <span>Collectibles &amp; Art</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'luxury' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="luxury"
                                                    checked={preferredContent === 'luxury'}
                                                    onChange={() => setPreferredContent('luxury')}
                                                />
                                                <span>Luxury</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'antiques' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="antiques"
                                                    checked={preferredContent === 'antiques'}
                                                    onChange={() => setPreferredContent('antiques')}
                                                />
                                                <span>Antiques</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'vehicles' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="vehicles"
                                                    checked={preferredContent === 'vehicles'}
                                                    onChange={() => setPreferredContent('vehicles')}
                                                />
                                                <span>Vehicles</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'fashion' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="fashion"
                                                    checked={preferredContent === 'fashion'}
                                                    onChange={() => setPreferredContent('fashion')}
                                                />
                                                <span>Fashion</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'property' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="property"
                                                    checked={preferredContent === 'property'}
                                                    onChange={() => setPreferredContent('property')}
                                                />
                                                <span>Property</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'niche' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="niche"
                                                    checked={preferredContent === 'niche'}
                                                    onChange={() => setPreferredContent('niche')}
                                                />
                                                <span>Niche</span>
                                            </label>
                                            <label
                                                className={`preferences-radio-option ${
                                                    preferredContent === 'school' ? 'active' : ''
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="preferred-content"
                                                    value="school"
                                                    checked={preferredContent === 'school'}
                                                    onChange={() => setPreferredContent('school')}
                                                />
                                                <span>School</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="preferences-card">
                                    <div className="preferences-section">
                                        <div className="preferences-section-title">Notifications</div>
                                        <div className="preferences-section-text">
                                            Customise your auction alerts here. You&apos;ll still receive essential
                                            account and bid updates.
                                        </div>
                                    </div>

                                    <div className="preferences-subsection">
                                        <div className="preferences-subsection-title">Deals &amp; Latest Auctions</div>
                                        <div className="preferences-subsection-text">
                                            Get the inside scoop on flash auctions, featured lots and last-minute
                                            bidding opportunities.
                                        </div>
                                        <label className="preferences-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={notifyDealsEmail}
                                                onChange={(event) => setNotifyDealsEmail(event.target.checked)}
                                            />
                                            <span>Email</span>
                                        </label>
                                    </div>

                                    <div className="preferences-subsection">
                                        <div className="preferences-subsection-title">
                                            Reminders, Alerts &amp; Exclusive Rewards
                                        </div>
                                        <div className="preferences-subsection-text">
                                            Stay in the loop with watchlist reminders, winner alerts and exclusive
                                            Auctify perks.
                                        </div>
                                        <label className="preferences-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={notifyRemindersEmail}
                                                onChange={(event) =>
                                                    setNotifyRemindersEmail(event.target.checked)
                                                }
                                            />
                                            <span>Email</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="preferences-save-row">
                                    <button type="button" className="preferences-save-button">
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {accountSection === 'delete-account' && (
                            <div className="delete-main">
                                <div className="delete-header">
                                    <div className="delete-title-row">
                                        <span className="delete-title-icon" aria-hidden="true">
                                            ⚠
                                        </span>
                                        <h1 className="delete-title">Request Account Deletion</h1>
                                    </div>
                                </div>

                                <div className="delete-card">
                                    <div className="delete-info-header">
                                        <span className="delete-info-icon" aria-hidden="true">!</span>
                                        <span className="delete-info-title">
                                            Important information &amp; disclaimers
                                        </span>
                                    </div>

                                    <div className="delete-info-text">
                                        <ol className="delete-list">
                                            <li>
                                                Once your account is deleted, your profile, preferences and saved
                                                auctions will be permanently removed. Any remaining wallet balance or
                                                cashback will be forfeited.
                                            </li>
                                            <li>
                                                Make sure there are no ongoing auctions, unpaid orders or pending
                                                withdrawals. If there are any active activities, your deletion request
                                                may be delayed or rejected.
                                            </li>
                                            <li>
                                                Auctify may retain limited transactional records as required for
                                                financial auditing, fraud prevention and regulatory obligations.
                                            </li>
                                            <li>
                                                After deletion, you will no longer be able to access your Auctify
                                                account, view order history or download invoices using this login.
                                            </li>
                                            <li>
                                                Submitting a deletion request will sign you out from all active
                                                sessions. You will need to create a new account if you wish to bid on
                                                Auctify again in the future.
                                            </li>
                                        </ol>
                                    </div>

                                    <div className="delete-button-row">
                                        <button
                                            type="button"
                                            className="delete-button"
                                            onClick={() => setIsDeleteModalOpen(true)}
                                        >
                                            Continue to account deletion
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
                )}
            </main>

            {isEditingAccount && authUser && (
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

            {isAddingCard && (
                <div className="card-drawer-overlay">
                    <div className="card-drawer-panel">
                        <div className="card-drawer-header">
                            <button
                                type="button"
                                className="card-drawer-close"
                                onClick={closeAddCard}
                                aria-label="Close add card panel"
                            >
                                ×
                            </button>
                            <h2 className="card-drawer-title">Add New Card</h2>
                        </div>

                        <form
                            className="card-drawer-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                
                                // Create new card with 10,000 PHP balance
                                const newCard: Card = {
                                    id: Date.now(),
                                    type: cardType,
                                    number: cardNumber,
                                    expiry: cardExpiry,
                                    cvc: cardCvc,
                                    name: cardName,
                                    balance: 10000,
                                };
                                
                                setSavedCards((prev) => {
                                    const updated = [...prev, newCard];
                                    // Set as main card if no main card is set
                                    if (mainCardId === null && updated.length === 1) {
                                        setMainCardId(newCard.id);
                                    }
                                    return updated;
                                });
                                toast.success('Card added successfully with ₱10,000 balance!', {
                                    autoClose: 3500,
                                });
                                closeAddCard();
                            }}
                        >
                            <div className="card-drawer-field">
                                <label htmlFor="cardType">Payment Method *</label>
                                <select
                                    id="cardType"
                                    value={cardType}
                                    onChange={(event) => setCardType(event.target.value as any)}
                                    required
                                >
                                    <option value="visa">Visa</option>
                                    <option value="mastercard">Landbank</option>
                                    <option value="jcb">JCB</option>
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya</option>
                                </select>
                            </div>

                            <div className="card-drawer-field">
                                <label htmlFor="cardNumber">Card Number</label>
                                <input
                                    id="cardNumber"
                                    type="text"
                                    placeholder="Card Number"
                                    value={cardNumber}
                                    onChange={(event) => setCardNumber(event.target.value)}
                                    required
                                />
                            </div>

                            <div className="card-drawer-row">
                                <div className="card-drawer-field">
                                    <label htmlFor="cardExpiry">Valid Thru (MM/YY)</label>
                                    <input
                                        id="cardExpiry"
                                        type="text"
                                        placeholder="MM/YY"
                                        value={cardExpiry}
                                        onChange={(event) => setCardExpiry(event.target.value)}
                                        required
                                    />
                                </div>
                                <div className="card-drawer-field">
                                    <label htmlFor="cardCvc">CVC/CVV</label>
                                    <input
                                        id="cardCvc"
                                        type="text"
                                        placeholder="CVC/CVV"
                                        value={cardCvc}
                                        onChange={(event) => setCardCvc(event.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="card-drawer-field">
                                <label htmlFor="cardName">Name on Card</label>
                                <input
                                    id="cardName"
                                    type="text"
                                    placeholder="Name on Card"
                                    value={cardName}
                                    onChange={(event) => setCardName(event.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="card-drawer-submit">
                                Add Card
                            </button>

                            <div className="card-drawer-logos" aria-hidden="true">
                                <img src="/icons/visa.png" alt="Visa" className="card-logo" />
                                <img src="/icons/landbank.jpg" alt="Landbank" className="card-logo" />
                                <img src="/icons/jcb.png" alt="JCB" className="card-logo" />
                                <img src="/icons/gcash.png" alt="GCash" className="card-logo" />
                                <img src="/icons/maya.png" alt="Maya" className="card-logo" />
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingAddress && (
                <div className="address-drawer-overlay">
                    <div className="address-drawer-panel">
                        <div className="address-drawer-header">
                            <button
                                type="button"
                                className="address-drawer-close"
                                onClick={closeAddAddress}
                                aria-label="Close add address panel"
                            >
                                ×
                            </button>
                            <h2 className="address-drawer-title">
                                {editingAddressId ? 'Edit Address' : 'Add Address'}
                            </h2>
                        </div>

                        <form
                            className="address-drawer-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                
                                const addressData = {
                                    first_name: addressFirstName,
                                    last_name: addressLastName,
                                    phone: addressPhone,
                                    region: addressRegion,
                                    province: selectedProvinceName,
                                    city: addressCity,
                                    barangay: addressBarangay,
                                    street: addressStreet,
                                    house_no: addressHouseNo,
                                };

                                if (editingAddressId) {
                                    // Update existing address via API
                                    setIsSubmittingAddress(true);
                                    fetch(`/api/addresses/${editingAddressId}`, {
                                        method: 'PATCH',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                        },
                                        body: JSON.stringify(addressData),
                                    })
                                        .then(async (res) => {
                                            const data = await res.json();
                                            if (!res.ok) {
                                                throw new Error(data.message || 'Failed to update address');
                                            }
                                            return data;
                                        })
                                        .then((data) => {
                                            setSavedAddresses((prev) =>
                                                prev.map((addr) =>
                                                    addr.id === editingAddressId
                                                        ? {
                                                              id: data.id,
                                                              firstName: data.first_name,
                                                              lastName: data.last_name,
                                                              phone: data.phone,
                                                              region: data.region,
                                                              province: data.province,
                                                              city: data.city,
                                                              barangay: data.barangay,
                                                              street: data.street,
                                                              houseNo: data.house_no,
                                                          }
                                                        : addr
                                                )
                                            );
                                            toast.success('Address updated successfully.', {
                                                autoClose: 3500,
                                            });
                                            closeAddAddress();
                                        })
                                        .catch((error) => {
                                            console.error('Address error:', error);
                                            toast.error(error.message || 'Failed to update address.', {
                                                autoClose: 3500,
                                            });
                                        })
                                        .finally(() => {
                                            setIsSubmittingAddress(false);
                                        });
                                } else {
                                    // Add new address via API
                                    setIsSubmittingAddress(true);
                                    fetch('/api/addresses', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                        },
                                        body: JSON.stringify(addressData),
                                    })
                                        .then(async (res) => {
                                            const data = await res.json();
                                            if (!res.ok) {
                                                throw new Error(data.message || 'Failed to add address');
                                            }
                                            return data;
                                        })
                                        .then((data) => {
                                            setSavedAddresses((prev) => [
                                                ...prev,
                                                {
                                                    id: data.id,
                                                    firstName: data.first_name,
                                                    lastName: data.last_name,
                                                    phone: data.phone,
                                                    region: data.region,
                                                    province: data.province,
                                                    city: data.city,
                                                    barangay: data.barangay,
                                                    street: data.street,
                                                    houseNo: data.house_no,
                                                },
                                            ]);
                                            toast.success('Address added successfully.', {
                                                autoClose: 3500,
                                            });
                                            closeAddAddress();
                                        })
                                        .catch((error) => {
                                            console.error('Address error:', error);
                                            toast.error(error.message || 'Failed to add address.', {
                                                autoClose: 3500,
                                            });
                                        })
                                        .finally(() => {
                                            setIsSubmittingAddress(false);
                                        });
                                }
                            }}
                        >
                            <div className="address-drawer-field">
                                <label htmlFor="addressFirstName">First Name</label>
                                <input
                                    id="addressFirstName"
                                    type="text"
                                    placeholder="First Name"
                                    value={addressFirstName}
                                    onChange={(event) => setAddressFirstName(event.target.value)}
                                    disabled={isSubmittingAddress}
                                />
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressLastName">Last Name</label>
                                <input
                                    id="addressLastName"
                                    type="text"
                                    placeholder="Last Name"
                                    value={addressLastName}
                                    onChange={(event) => setAddressLastName(event.target.value)}
                                    disabled={isSubmittingAddress}
                                />
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressPhone">Mobile Phone Number</label>
                                <input
                                    id="addressPhone"
                                    type="tel"
                                    placeholder="Mobile Phone Number"
                                    value={addressPhone}
                                    onChange={(event) => setAddressPhone(event.target.value)}
                                    disabled={isSubmittingAddress}
                                />
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressRegion">State / Region</label>
                                <select
                                    id="addressRegion"
                                    value={addressRegion}
                                    onChange={(event) => {
                                        const selectedOption = event.target.options[event.target.selectedIndex];
                                        const regionCode = selectedOption.getAttribute('data-code') || '';
                                        setAddressRegion(event.target.value);
                                        setSelectedRegionCode(regionCode);
                                    }}
                                    disabled={isSubmittingAddress}
                                >
                                    <option value="">State / Region</option>
                                    {regions.map((region) => (
                                        <option key={region.code} value={region.name} data-code={region.code}>
                                            {region.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressProvince">Province</label>
                                <select
                                    id="addressProvince"
                                    value={selectedProvinceCode}
                                    onChange={(event) => {
                                        const selectedOption = event.target.options[event.target.selectedIndex];
                                        const provinceName = selectedOption.getAttribute('data-name') || '';
                                        setSelectedProvinceCode(event.target.value);
                                        setSelectedProvinceName(provinceName);
                                    }}
                                    disabled={!selectedRegionCode || provinces.length === 0 || isSubmittingAddress}
                                >
                                    <option value="">Province</option>
                                    {provinces.map((province) => (
                                        <option key={province.code} value={province.code} data-name={province.name}>
                                            {province.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressCity">Town / City</label>
                                <select
                                    id="addressCity"
                                    value={addressCity}
                                    onChange={(event) => {
                                        const selectedOption = event.target.options[event.target.selectedIndex];
                                        const cityCode = selectedOption.getAttribute('data-code') || '';
                                        setAddressCity(event.target.value);
                                        setSelectedCityCode(cityCode);
                                    }}
                                    disabled={!selectedProvinceCode || cities.length === 0 || isSubmittingAddress}
                                >
                                    <option value="">Town / City</option>
                                    {cities.map((city) => (
                                        <option key={city.code} value={city.name} data-code={city.code}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressBarangay">Barangay</label>
                                <select
                                    id="addressBarangay"
                                    value={addressBarangay}
                                    onChange={(event) => setAddressBarangay(event.target.value)}
                                    disabled={!selectedCityCode || barangays.length === 0 || isSubmittingAddress}
                                >
                                    <option value="">Barangay</option>
                                    {barangays.map((barangay) => (
                                        <option key={barangay.code} value={barangay.name}>
                                            {barangay.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressStreet">Street/ Building Name</label>
                                <input
                                    id="addressStreet"
                                    type="text"
                                    placeholder="Street/ Building Name"
                                    value={addressStreet}
                                    onChange={(event) => setAddressStreet(event.target.value)}
                                    disabled={isSubmittingAddress}
                                />
                            </div>

                            <div className="address-drawer-field">
                                <label htmlFor="addressHouseNo">House No./ Unit-Floor/ Landmark (Optional)</label>
                                <input
                                    id="addressHouseNo"
                                    type="text"
                                    placeholder="House No./ Unit-Floor/ Landmark (Optional)"
                                    value={addressHouseNo}
                                    onChange={(event) => setAddressHouseNo(event.target.value)}
                                    disabled={isSubmittingAddress}
                                />
                            </div>

                            <button type="submit" className="address-drawer-submit" disabled={isSubmittingAddress}>
                                {isSubmittingAddress ? 'Saving...' : editingAddressId ? 'Update' : 'Add'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {isLogoutModalOpen && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Log out of Auctify?</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Are you sure you want to log out of your account?
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => setIsLogoutModalOpen(false)}
                                >
                                    Stay logged in
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={() => {
                                        handleLogout();
                                        setIsLogoutModalOpen(false);
                                    }}
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal">
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Delete Your Account?</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Once you confirm to delete your account, your account data will be permanently and
                                irreversibly deleted.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => setIsDeleteModalOpen(false)}
                                >
                                    Keep my account
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={async () => {
                                        try {
                                            await apiClient.apiDelete<{ message: string }>('/api/auth/delete-account');

                                            // Clear local session and navigate away
                                            localStorage.removeItem('auth_token');
                                            localStorage.removeItem('auth_user');
                                            setAuthUser(null);
                                            setCurrentView('home');
                                            setIsDeleteModalOpen(false);

                                            toast.success('Your Auctify account was deleted successfully.', {
                                                autoClose: 3500,
                                            });
                                        } catch (apiError: any) {
                                            const errorMessage =
                                                (apiError && (apiError.message as string)) ||
                                                'Something went wrong while deleting your account.';

                                            toast.error(errorMessage);
                                        }
                                    }}
                                >
                                    Delete my account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <button className="chat-button" aria-label="Help">
                <span>A</span>
            </button>

            <ToastContainer
                position="top-center"
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnHover
                style={{ position: 'fixed', zIndex: 9999 }}
            />

            <footer className="footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h3 className="footer-title">AUCTIFY</h3>
                        <p className="footer-desc">
                            As the Premier Online Auction Platform, we create endless bidding possibilities through an
                            ever-expanding range of products from the most coveted international and local sellers,
                            putting you at the centre of it all. With AUCTIFY, You Own Now.
                        </p>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">CUSTOMER SERVICE</h4>
                        <ul className="footer-links">
                            <li><a href="#faq">FAQ</a></li>
                            <li><a href="#guide">Bidding Guide</a></li>
                            <li><a href="#returns">Returns & Refunds</a></li>
                            <li><a href="#contact">Contact Us</a></li>
                            <li><a href="#gift">Buy Gift Cards</a></li>
                            <li><a href="#index">Product Index</a></li>
                            <li><a href="#sellers">Sellers</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">ABOUT US</h4>
                        <ul className="footer-links">
                            <li><a href="#who">Who We Are</a></li>
                            <li><a href="#property">Intellectual Property</a></li>
                            <li><a href="#sell">Sell With Us</a></li>
                            <li><a href="#careers">Careers</a></li>
                            <li><a href="#promotions">Promotions</a></li>
                            <li><a href="#influencer">Influencer Program</a></li>
                            <li><a href="#partner">Partner Program</a></li>
                            <li><a href="#advertise">Advertise with Us</a></li>
                            <li><a href="#terms">Terms & Conditions</a></li>
                            <li><a href="#privacy">Privacy Policy</a></li>
                        </ul>
                    </div>

                    <div className="footer-section">
                        <h4 className="footer-heading">NEW TO AUCTIFY?</h4>
                        <p className="footer-newsletter-text">
                            Get the latest auction listings and product launches just by subscribing to our newsletter.
                        </p>
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="footer-email-input"
                        />
                        <div className="footer-buttons">
                            <button className="footer-btn">FOR ELECTRONICS</button>
                            <button className="footer-btn">FOR COLLECTIBLES</button>
                        </div>
                        <p className="footer-privacy-note">
                            By signing up, you agree to the terms in our Privacy Policy
                        </p>
                    </div>
                </div>

                <div className="footer-bottom">
                    <div className="footer-social">
                        <h4 className="social-title">FIND US ON</h4>
                        <div className="social-icons">
                            <a href="#facebook" aria-label="Facebook">
                                <img src="/icons/facebook.png" alt="Facebook" />
                            </a>
                            <a href="#instagram" aria-label="Instagram">📷</a>
                            <a href="#twitter" aria-label="Twitter">🐦</a>
                            <a href="#blog" aria-label="Blog">📝</a>
                            <a href="#youtube" aria-label="YouTube">▶</a>
                            <a href="#linkedin" aria-label="LinkedIn">in</a>
                        </div>
                    </div>

                    <div className="footer-app">
                        <h4 className="app-title">DOWNLOAD OUR APP NOW</h4>
                        <div className="app-buttons">
                            <button className="app-store-btn">Google Play</button>
                            <button className="app-store-btn">App Store</button>
                        </div>
                    </div>
                </div>

                <div className="footer-copyright">
                    <div className="copyright-links">
                        <a href="#about">About</a>
                        <span>|</span>
                        <a href="#privacy">Privacy</a>
                        <span>|</span>
                        <a href="#terms">Terms of Service</a>
                    </div>
                    <p>&copy; 2012-2026 Auctify</p>
                </div>
            </footer>
        </div>
    );
}
