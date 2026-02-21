import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { addressService, sellerService } from '../../services/api';
import { getRegions, getProvinces, getCities, getBarangays } from '../../services/psgc';
import type { Region, Province, City, Barangay } from '../../types';

export const BecomeSellerSection: React.FC = () => {
    const { authUser } = useAuth();

    const [started, setStarted] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [shopName, setShopName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(authUser?.phone ?? '');
    const email = authUser?.email ?? '';
    const maxShopNameLength = 30;

    const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
    const [locationStep, setLocationStep] = useState<'region' | 'province' | 'city' | 'barangay' | 'postal'>('region');
    const [regions, setRegions] = useState<Region[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [barangays, setBarangays] = useState<Barangay[]>([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState('');
    const [selectedPostalCode, setSelectedPostalCode] = useState('');
    const [pickupFullName, setPickupFullName] = useState('');
    const [pickupPhone, setPickupPhone] = useState(authUser?.phone ?? '');
    const [pickupDetailAddress, setPickupDetailAddress] = useState('');
    const [submitBusinessMode, setSubmitBusinessMode] = useState<'now' | 'later'>('now');
    const [sellerType, setSellerType] = useState('sole');
    const [registeredLastName, setRegisteredLastName] = useState('');
    const [registeredFirstName, setRegisteredFirstName] = useState('');
    const [registeredMiddleName, setRegisteredMiddleName] = useState('');
    const [registeredSuffix, setRegisteredSuffix] = useState('');
    const [companyRegisteredName, setCompanyRegisteredName] = useState('');
    const [generalLocation, setGeneralLocation] = useState('');
    const [registeredAddress, setRegisteredAddress] = useState('');
    const [zipCode, setZipCode] = useState(selectedPostalCode);
    const [primaryDocumentType, setPrimaryDocumentType] = useState('DTI Certificate');
    const [governmentIdType, setGovernmentIdType] = useState('');
    const [businessEmail, setBusinessEmail] = useState(email);
    const [businessEmailOtp, setBusinessEmailOtp] = useState('');
    const [businessPhoneNumber, setBusinessPhoneNumber] = useState(phoneNumber);
    const [businessPhoneOtp, setBusinessPhoneOtp] = useState('');
    const [taxTin, setTaxTin] = useState('');
    const [vatStatus, setVatStatus] = useState<'vat' | 'non-vat' | ''>('');
    const [submitSwornDeclaration, setSubmitSwornDeclaration] = useState<'yes' | 'no' | ''>('');
    const [agreeBusinessTerms, setAgreeBusinessTerms] = useState(false);
    const [primaryDocumentName, setPrimaryDocumentName] = useState('');
    const [governmentIdFrontName, setGovernmentIdFrontName] = useState('');
    const [birCertificateName, setBirCertificateName] = useState('');
    const [isSubmittingSeller, setIsSubmittingSeller] = useState(false);
    const [isSellerSubmitted, setIsSellerSubmitted] = useState(false);
    const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);
    const [hasSubmittedRegistration, setHasSubmittedRegistration] = useState(false);

    const locationSummary = [
        regions.find((r) => r.code === selectedRegion)?.name,
        provinces.find((p) => p.code === selectedProvince)?.name,
        cities.find((c) => c.code === selectedCity)?.name,
        barangays.find((b) => b.code === selectedBarangay)?.name,
        selectedPostalCode.trim(),
    ]
        .filter(Boolean)
        .join(', ');

    const goNext = () => {
        setStep((current) => (current === 3 ? 3 : ((current + 1) as 1 | 2 | 3)));
    };

    const goBack = () => {
        setStep((current) => (current === 1 ? 1 : ((current - 1) as 1 | 2 | 3)));
    };

    useEffect(() => {
        if (!isPickupModalOpen || regions.length > 0) return;

        const loadRegions = async () => {
            try {
                const data = await getRegions();
                setRegions(data);
            } catch (error) {
                console.error('Failed to load regions for pickup address:', error);
            }
        };

        void loadRegions();
    }, [isPickupModalOpen, regions.length]);

    useEffect(() => {
        const loadSellerRegistration = async () => {
            try {
                const response = await sellerService.getRegistration();
                setHasSubmittedRegistration(Boolean(response.registration));
            } catch (error) {
                console.error('Failed to load seller registration:', error);
            } finally {
                setIsCheckingRegistration(false);
            }
        };

        void loadSellerRegistration();
    }, []);

    const handleRegionSelect = async (regionCode: string) => {
        setSelectedRegion(regionCode);
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedBarangay('');
        setSelectedPostalCode('');
        setLocationStep('province');
        setProvinces([]);
        setCities([]);
        setBarangays([]);

        if (!regionCode) return;

        try {
            const data = await getProvinces(regionCode);
            setProvinces(data);
        } catch (error) {
            console.error('Failed to load provinces for pickup address:', error);
        }
    };

    const handleProvinceSelect = async (provinceCode: string) => {
        setSelectedProvince(provinceCode);
        setSelectedCity('');
        setSelectedBarangay('');
        setSelectedPostalCode('');
        setLocationStep('city');
        setCities([]);
        setBarangays([]);

        if (!provinceCode) return;

        try {
            const data = await getCities(provinceCode);
            setCities(data);
        } catch (error) {
            console.error('Failed to load cities for pickup address:', error);
        }
    };

    const handleCitySelect = async (cityCode: string) => {
        setSelectedCity(cityCode);
        setSelectedBarangay('');
        setSelectedPostalCode('');
        setLocationStep('barangay');
        setBarangays([]);

        if (!cityCode) return;

        try {
            const data = await getBarangays(cityCode);
            setBarangays(data);
        } catch (error) {
            console.error('Failed to load barangays for pickup address:', error);
        }
    };

    const handleBarangaySelect = (barangayCode: string) => {
        setSelectedBarangay(barangayCode);
        setLocationStep('postal');
    };

    const handleSavePickupAddress = async () => {
        if (!pickupFullName.trim()) {
            toast.error('Please enter the full name for this pickup address.');
            return;
        }

        if (!pickupPhone.trim()) {
            toast.error('Please enter a phone number for this pickup address.');
            return;
        }

        if (!selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay) {
            toast.error('Please complete the region, province, city, and barangay fields.');
            return;
        }

        if (!pickupDetailAddress.trim()) {
            toast.error('Please enter the detailed pickup address.');
            return;
        }

        const [firstName, ...rest] = pickupFullName.trim().split(' ');
        const lastName = rest.join(' ');

        const addressData = {
            first_name: firstName,
            last_name: lastName,
            phone: pickupPhone.trim(),
            region: selectedRegion,
            province: selectedProvince,
            city: selectedCity,
            barangay: selectedBarangay,
            street_address: pickupDetailAddress.trim(),
            building_name: '',
            unit_floor: '',
            postal_code: selectedPostalCode.trim(),
            notes: '',
        };

        try {
            await addressService.createAddress(addressData);
            if (!generalLocation.trim() && locationSummary) {
                setGeneralLocation(locationSummary);
            }
            if (!zipCode.trim() && selectedPostalCode) {
                setZipCode(selectedPostalCode);
            }
            toast.success('Pickup address saved.');
            setIsPickupModalOpen(false);
        } catch (err: unknown) {
            const responseMessage =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;

            const errorMessage = responseMessage || 'Failed to save pickup address.';
            toast.error(errorMessage);
        }
    };

    const handleSubmitSellerRegistration = async () => {
        if (!agreeBusinessTerms) {
            toast.error('Please agree to the Terms and Conditions before submitting.');
            return;
        }

        setIsSubmittingSeller(true);

        try {
            await sellerService.submitRegistration({
                shop_name: shopName || undefined,
                contact_email: email || undefined,
                contact_phone: phoneNumber || undefined,
                pickup_address_summary: locationSummary || undefined,
                submit_business_mode: submitBusinessMode,
                seller_type: sellerType as 'sole' | 'corp' | 'opc',
                company_registered_name: companyRegisteredName || undefined,
                registered_last_name: registeredLastName || undefined,
                registered_first_name: registeredFirstName || undefined,
                registered_middle_name: registeredMiddleName || undefined,
                registered_suffix: registeredSuffix || undefined,
                general_location: generalLocation || undefined,
                registered_address: registeredAddress || undefined,
                zip_code: zipCode || undefined,
                primary_document_type: primaryDocumentType || undefined,
                primary_document_name: primaryDocumentName || undefined,
                government_id_type: governmentIdType || undefined,
                government_id_front_name: governmentIdFrontName || undefined,
                business_email: businessEmail || undefined,
                business_email_otp: businessEmailOtp || undefined,
                business_phone_number: businessPhoneNumber || undefined,
                business_phone_otp: businessPhoneOtp || undefined,
                tax_tin: taxTin || undefined,
                vat_status: vatStatus || undefined,
                bir_certificate_name: birCertificateName || undefined,
                submit_sworn_declaration: submitSwornDeclaration || undefined,
                agree_business_terms: agreeBusinessTerms,
            });

            setIsSellerSubmitted(true);
            toast.success('Seller registration submitted successfully.');
        } catch (err: unknown) {
            const responseMessage =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;

            toast.error(responseMessage || 'Failed to submit seller registration.');
        } finally {
            setIsSubmittingSeller(false);
        }
    };

    const handlePrimaryAction = async () => {
        if (step === 3) {
            await handleSubmitSellerRegistration();
            return;
        }

        goNext();
    };

    const navigateToSellerProductListing = () => {
        window.history.pushState({}, '', '/seller/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo(0, 0);
    };

    const sellerTypeLabel =
        sellerType === 'corp'
            ? 'Corporation / Partnership / Cooperative'
            : sellerType === 'opc'
                ? 'One Person Corporation'
                : 'Sole Proprietorship';

    const selectedPrimaryDocLabel = primaryDocumentType || 'Not set';
    const selectedGovernmentIdLabel = governmentIdType || 'Not set';
    const selectedVatStatusLabel =
        vatStatus === 'vat' ? 'VAT Registered' : vatStatus === 'non-vat' ? 'Non-VAT Registered' : 'Not set';
    const selectedSwornDeclarationLabel =
        submitSwornDeclaration === 'yes'
            ? 'Yes'
            : submitSwornDeclaration === 'no'
                ? 'No'
                : 'Not set';

    if (!started) {
        return (
            <div className="seller-main">
                <div className="seller-card">
                    <div className="seller-illustration" aria-hidden="true">
                        <div className="seller-illustration-inner">
                            <span className="seller-illustration-badge">A</span>
                        </div>
                    </div>
                    <h2 className="seller-title">Welcome to AUCTIFY Seller Center</h2>
                    <p className="seller-subtitle">
                        {hasSubmittedRegistration
                            ? 'Your seller registration is already submitted. You can now manage your seller workspace and products.'
                            : 'To get started, register as a seller by providing a few details about yourself and the auctions you plan to host.'}
                    </p>
                    <button
                        type="button"
                        className="seller-primary-btn"
                        onClick={() => {
                            if (hasSubmittedRegistration) {
                                navigateToSellerProductListing();
                                return;
                            }

                            setStarted(true);
                        }}
                        disabled={isCheckingRegistration}
                    >
                        {isCheckingRegistration
                            ? 'Checking...'
                            : hasSubmittedRegistration
                                ? 'Add Product'
                                : 'Start Seller Registration'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="seller-main">
            <div className="seller-form-card">
                <div className="seller-form-steps" aria-label="Seller registration steps">
                    <div className="seller-form-step-row">
                        <button
                            type="button"
                            className={`seller-step ${step === 1 ? 'active' : ''}`}
                        >
                            <span className="seller-step-dot" />
                            <span className="seller-step-label">Shop Information</span>
                        </button>
                        <div className="seller-step-line" />
                        <button
                            type="button"
                            className={`seller-step ${step === 2 ? 'active' : ''}`}
                        >
                            <span className="seller-step-dot" />
                            <span className="seller-step-label">Business Information</span>
                        </button>
                        <div className="seller-step-line" />
                        <button
                            type="button"
                            className={`seller-step ${step === 3 ? 'active' : ''}`}
                        >
                            <span className="seller-step-dot" />
                            <span className="seller-step-label">Submit</span>
                        </button>
                    </div>
                </div>

                {isSellerSubmitted && (
                    <div className="seller-success-wrap">
                        <div className="seller-success-icon" aria-hidden="true">✓</div>
                        <h3 className="seller-success-title">Submitted Successfully</h3>
                        <p className="seller-success-text">
                            Your seller registration has been saved. You can now proceed to add your first product.
                        </p>
                        <button
                            type="button"
                            className="seller-primary-btn"
                            onClick={navigateToSellerProductListing}
                        >
                            Go to Add Product
                        </button>
                    </div>
                )}

                {!isSellerSubmitted && (
                <>
                <div className="seller-form-body">
                    {step === 1 && (
                        <div className="seller-form-section">
                            <h3 className="seller-form-title">Shop Information</h3>
                            <p className="seller-hint">
                                Tell buyers who you are and how they can reach you. You can always update these details later.
                            </p>
                            <div className="seller-form-row">
                                <label className="seller-label">
                                    <span className="seller-label-required">*</span> Shop Name
                                </label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        value={shopName}
                                        onChange={(event) => {
                                            const value = event.target.value.slice(0, maxShopNameLength);
                                            setShopName(value);
                                        }}
                                        placeholder="Choose a name buyers will recognize"
                                    />
                                    <div className="seller-input-counter">
                                        {shopName.length} / {maxShopNameLength}
                                    </div>
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <div className="seller-label">Pickup Address</div>
                                <div className="seller-input-inline">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="No pickup address added"
                                        value={locationSummary}
                                        readOnly
                                    />
                                    <button
                                        type="button"
                                        className="seller-secondary-btn"
                                        onClick={() => setIsPickupModalOpen(true)}
                                    >
                                        + Add
                                    </button>
                                </div>
                                <p className="seller-hint">
                                    This is where couriers will collect items for your auctions.
                                </p>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">
                                    <span className="seller-label-required">*</span> Email
                                </label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="email"
                                        className="seller-input"
                                        value={email}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">
                                    <span className="seller-label-required">*</span> Phone Number
                                </label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="tel"
                                        className="seller-input"
                                        value={phoneNumber}
                                        onChange={(event) => setPhoneNumber(event.target.value)}
                                        placeholder="e.g. +639123456789"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="seller-form-section">
                            <h3 className="seller-form-title">Business Information</h3>
                            <div className="seller-info-banner">
                                This information is used for invoicing and compliance. You can still submit now and complete
                                missing details later.
                            </div>

                            <div className="seller-form-row seller-radio-row">
                                <label className="seller-label">Submit Business Information?</label>
                                <div className="seller-radio-group">
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="submit-business-mode"
                                            checked={submitBusinessMode === 'now'}
                                            onChange={() => setSubmitBusinessMode('now')}
                                        />
                                        Submit Now
                                    </label>
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="submit-business-mode"
                                            checked={submitBusinessMode === 'later'}
                                            onChange={() => setSubmitBusinessMode('later')}
                                        />
                                        Submit Later
                                    </label>
                                </div>
                            </div>

                            <h4 className="seller-subsection-title">Entity Information</h4>

                            <div className="seller-form-row seller-radio-row">
                                <label className="seller-label">Seller Type</label>
                                <div className="seller-radio-group seller-radio-group-multi">
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="seller-type"
                                            checked={sellerType === 'sole'}
                                            onChange={() => setSellerType('sole')}
                                        />
                                        Sole Proprietorship
                                    </label>
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="seller-type"
                                            checked={sellerType === 'corp'}
                                            onChange={() => setSellerType('corp')}
                                        />
                                        Corporation / Partnership / Cooperative
                                    </label>
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="seller-type"
                                            checked={sellerType === 'opc'}
                                            onChange={() => setSellerType('opc')}
                                        />
                                        One Person Corporation
                                    </label>
                                </div>
                            </div>

                            {(sellerType === 'corp' || sellerType === 'opc') && (
                                <div className="seller-form-row">
                                    <label className="seller-label">Company Registered Name</label>
                                    <div className="seller-input-wrap">
                                        <input
                                            type="text"
                                            className="seller-input"
                                            placeholder="Input"
                                            value={companyRegisteredName}
                                            onChange={(event) => setCompanyRegisteredName(event.target.value.slice(0, 255))}
                                        />
                                        <div className="seller-inline-counter">{companyRegisteredName.length}/255</div>
                                        <p className="seller-hint seller-inline-hint">
                                            Company Registered Name is your business&apos;s official designation, recorded with
                                            government authorities for legal, tax, and formal transactions.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {sellerType !== 'corp' && (
                                <div className="seller-form-row">
                                    <label className="seller-label">Individual Registered Name</label>
                                    <div className="seller-name-grid-wrap">
                                        <div className="seller-name-grid">
                                            <div className="seller-input-wrap">
                                                <input
                                                    type="text"
                                                    className="seller-input"
                                                    placeholder="Last Name"
                                                    value={registeredLastName}
                                                    onChange={(event) => setRegisteredLastName(event.target.value.slice(0, 80))}
                                                />
                                                <div className="seller-inline-counter">{registeredLastName.length}/80</div>
                                            </div>
                                            <div className="seller-input-wrap">
                                                <input
                                                    type="text"
                                                    className="seller-input"
                                                    placeholder="First Name"
                                                    value={registeredFirstName}
                                                    onChange={(event) => setRegisteredFirstName(event.target.value.slice(0, 80))}
                                                />
                                                <div className="seller-inline-counter">{registeredFirstName.length}/80</div>
                                            </div>
                                            <div className="seller-input-wrap">
                                                <select
                                                    className="seller-input"
                                                    value={registeredSuffix}
                                                    onChange={(event) => setRegisteredSuffix(event.target.value)}
                                                >
                                                    <option value="">Suffix</option>
                                                    <option value="Jr">Jr</option>
                                                    <option value="Sr">Sr</option>
                                                    <option value="II">II</option>
                                                    <option value="III">III</option>
                                                </select>
                                            </div>
                                            <div className="seller-input-wrap">
                                                <input
                                                    type="text"
                                                    className="seller-input"
                                                    placeholder="Middle Name"
                                                    value={registeredMiddleName}
                                                    onChange={(event) => setRegisteredMiddleName(event.target.value.slice(0, 80))}
                                                />
                                                <div className="seller-inline-counter">{registeredMiddleName.length}/80</div>
                                            </div>
                                        </div>
                                        <p className="seller-hint seller-inline-hint">
                                            Individual Registered Name is your full legal name as written on your
                                            government-issued ID.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="seller-form-row">
                                <label className="seller-label">General Location</label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Region / Province / City / Barangay"
                                        value={generalLocation}
                                        onChange={(event) => setGeneralLocation(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Registered Address</label>
                                <div className="seller-input-wrap">
                                    <textarea
                                        className="seller-textarea"
                                        rows={3}
                                        placeholder="Registered business address"
                                        value={registeredAddress}
                                        onChange={(event) => setRegisteredAddress(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Zip Code</label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Input"
                                        value={zipCode}
                                        onChange={(event) => setZipCode(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Primary Business Document Type</label>
                                <div className="seller-input-wrap">
                                    <select
                                        className="seller-input"
                                        value={primaryDocumentType}
                                        onChange={(event) => setPrimaryDocumentType(event.target.value)}
                                    >
                                        <option>DTI Certificate</option>
                                        <option>SEC Registration</option>
                                        <option>CDA Registration</option>
                                    </select>
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Primary Business Document</label>
                                <div className="seller-upload-wrap">
                                    <input
                                        type="file"
                                        className="seller-file-input"
                                        onChange={(event) => setPrimaryDocumentName(event.target.files?.[0]?.name ?? '')}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Government ID</label>
                                <div className="seller-input-wrap">
                                    <select
                                        className="seller-input"
                                        value={governmentIdType}
                                        onChange={(event) => setGovernmentIdType(event.target.value)}
                                    >
                                        <option value="">Select an ID type</option>
                                        <option>Passport</option>
                                        <option>Driver&apos;s License</option>
                                        <option>National ID</option>
                                    </select>
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Government ID (Front)</label>
                                <div className="seller-upload-wrap">
                                    <input
                                        type="file"
                                        className="seller-file-input"
                                        onChange={(event) => setGovernmentIdFrontName(event.target.files?.[0]?.name ?? '')}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Business Email</label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="email"
                                        className="seller-input"
                                        placeholder="Input"
                                        value={businessEmail}
                                        onChange={(event) => setBusinessEmail(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row seller-otp-row">
                                <label className="seller-label">Business Email Verification</label>
                                <div className="seller-otp-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Enter OTP"
                                        value={businessEmailOtp}
                                        onChange={(event) => setBusinessEmailOtp(event.target.value)}
                                    />
                                    <button type="button" className="seller-secondary-btn">Send OTP</button>
                                    <button type="button" className="seller-primary-btn seller-otp-verify">Verify</button>
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">Business Phone Number</label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Input"
                                        value={businessPhoneNumber}
                                        onChange={(event) => setBusinessPhoneNumber(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row seller-otp-row">
                                <label className="seller-label">Business Phone Verification</label>
                                <div className="seller-otp-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Enter OTP"
                                        value={businessPhoneOtp}
                                        onChange={(event) => setBusinessPhoneOtp(event.target.value)}
                                    />
                                    <button type="button" className="seller-secondary-btn">Send OTP</button>
                                    <button type="button" className="seller-primary-btn seller-otp-verify">Verify</button>
                                </div>
                            </div>

                            <h4 className="seller-subsection-title">Tax Information</h4>

                            <div className="seller-form-row">
                                <label className="seller-label">Taxpayer Identification Number (TIN)</label>
                                <div className="seller-input-wrap">
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Input"
                                        value={taxTin}
                                        onChange={(event) => setTaxTin(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row seller-radio-row">
                                <label className="seller-label">VAT Registration Status</label>
                                <div className="seller-radio-group">
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="vat-status"
                                            checked={vatStatus === 'vat'}
                                            onChange={() => setVatStatus('vat')}
                                        />
                                        VAT Registered
                                    </label>
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="vat-status"
                                            checked={vatStatus === 'non-vat'}
                                            onChange={() => setVatStatus('non-vat')}
                                        />
                                        Non-VAT Registered
                                    </label>
                                </div>
                            </div>

                            <div className="seller-form-row">
                                <label className="seller-label">BIR Certificate of Registration</label>
                                <div className="seller-upload-wrap">
                                    <input
                                        type="file"
                                        className="seller-file-input"
                                        onChange={(event) => setBirCertificateName(event.target.files?.[0]?.name ?? '')}
                                    />
                                </div>
                            </div>

                            <div className="seller-form-row seller-radio-row">
                                <label className="seller-label">Submit Sworn Declaration</label>
                                <div className="seller-radio-group">
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="sworn-declaration"
                                            checked={submitSwornDeclaration === 'yes'}
                                            onChange={() => setSubmitSwornDeclaration('yes')}
                                        />
                                        Yes
                                    </label>
                                    <label className="seller-radio-item">
                                        <input
                                            type="radio"
                                            name="sworn-declaration"
                                            checked={submitSwornDeclaration === 'no'}
                                            onChange={() => setSubmitSwornDeclaration('no')}
                                        />
                                        No
                                    </label>
                                </div>
                            </div>

                            <div className="seller-terms-box">
                                <label className="seller-terms-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={agreeBusinessTerms}
                                        onChange={(event) => setAgreeBusinessTerms(event.target.checked)}
                                    />
                                    <span>I agree to the Terms and Conditions and Data Privacy Policy.</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="seller-form-section">
                            <h3 className="seller-form-title">Review &amp; Submit</h3>
                            <p className="seller-hint seller-review-intro">
                                Review all your seller details before final submission.
                            </p>

                            <div className="seller-review-cards">
                                <section className="seller-review-card">
                                    <h4 className="seller-review-card-title">Shop Information</h4>
                                    <ul className="seller-review-list">
                                        <li>
                                            <span className="seller-review-label">Shop name</span>
                                            <span className="seller-review-value">{shopName || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Contact email</span>
                                            <span className="seller-review-value">{email || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Contact phone</span>
                                            <span className="seller-review-value">{phoneNumber || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Pickup address</span>
                                            <span className="seller-review-value">{locationSummary || 'Not set'}</span>
                                        </li>
                                    </ul>
                                </section>

                                <section className="seller-review-card">
                                    <h4 className="seller-review-card-title">Entity Information</h4>
                                    <ul className="seller-review-list">
                                        <li>
                                            <span className="seller-review-label">Submit mode</span>
                                            <span className="seller-review-value">
                                                {submitBusinessMode === 'now' ? 'Submit Now' : 'Submit Later'}
                                            </span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Seller type</span>
                                            <span className="seller-review-value">{sellerTypeLabel}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Company registered name</span>
                                            <span className="seller-review-value">{companyRegisteredName || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Individual registered name</span>
                                            <span className="seller-review-value">
                                                {[registeredFirstName, registeredMiddleName, registeredLastName, registeredSuffix]
                                                    .filter(Boolean)
                                                    .join(' ') || 'Not set'}
                                            </span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">General location</span>
                                            <span className="seller-review-value">{generalLocation || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Registered address</span>
                                            <span className="seller-review-value">{registeredAddress || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Zip code</span>
                                            <span className="seller-review-value">{zipCode || 'Not set'}</span>
                                        </li>
                                    </ul>
                                </section>

                                <section className="seller-review-card">
                                    <h4 className="seller-review-card-title">Documents &amp; Verification</h4>
                                    <ul className="seller-review-list">
                                        <li>
                                            <span className="seller-review-label">Primary document type</span>
                                            <span className="seller-review-value">{selectedPrimaryDocLabel}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Primary document file</span>
                                            <span className="seller-review-value">{primaryDocumentName || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Government ID type</span>
                                            <span className="seller-review-value">{selectedGovernmentIdLabel}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Government ID (front)</span>
                                            <span className="seller-review-value">{governmentIdFrontName || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Business email</span>
                                            <span className="seller-review-value">{businessEmail || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Business email OTP</span>
                                            <span className="seller-review-value">{businessEmailOtp || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Business phone</span>
                                            <span className="seller-review-value">{businessPhoneNumber || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Business phone OTP</span>
                                            <span className="seller-review-value">{businessPhoneOtp || 'Not set'}</span>
                                        </li>
                                    </ul>
                                </section>

                                <section className="seller-review-card">
                                    <h4 className="seller-review-card-title">Tax Information</h4>
                                    <ul className="seller-review-list">
                                        <li>
                                            <span className="seller-review-label">TIN</span>
                                            <span className="seller-review-value">{taxTin || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">VAT status</span>
                                            <span className="seller-review-value">{selectedVatStatusLabel}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">BIR certificate file</span>
                                            <span className="seller-review-value">{birCertificateName || 'Not set'}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Sworn declaration</span>
                                            <span className="seller-review-value">{selectedSwornDeclarationLabel}</span>
                                        </li>
                                        <li>
                                            <span className="seller-review-label">Terms accepted</span>
                                            <span className="seller-review-value">{agreeBusinessTerms ? 'Yes' : 'No'}</span>
                                        </li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                <div className="seller-form-actions">
                    <button
                        type="button"
                        className="seller-secondary-btn"
                        onClick={() => {
                            if (step === 1) {
                                setStarted(false);
                            } else {
                                goBack();
                            }
                        }}
                    >
                        {step === 1 ? 'Back to overview' : 'Back'}
                    </button>
                    <div className="seller-form-actions-right">
                        <button type="button" className="seller-ghost-btn">
                            Save
                        </button>
                        <button
                            type="button"
                            className="seller-primary-btn"
                            onClick={handlePrimaryAction}
                            disabled={(step === 2 && !agreeBusinessTerms) || (step === 3 && isSubmittingSeller)}
                        >
                            {step === 3 ? (isSubmittingSeller ? 'Submitting...' : 'Submit') : 'Next'}
                        </button>
                    </div>
                </div>
                </>
                )}
            </div>

            {isPickupModalOpen && (
                <div
                    className="account-edit-overlay"
                    onClick={() => setIsPickupModalOpen(false)}
                >
                    <div
                        className="seller-address-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="seller-address-modal-header">
                            <h3 className="seller-address-modal-title">Add a new address</h3>
                            <button
                                type="button"
                                className="seller-address-modal-close"
                                onClick={() => setIsPickupModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="seller-address-modal-body">
                            <div className="seller-address-two-col">
                                <div className="field">
                                    <label className="seller-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="Full name"
                                        value={pickupFullName}
                                        onChange={(event) => setPickupFullName(event.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label className="seller-label">Phone Number</label>
                                    <input
                                        type="text"
                                        className="seller-input"
                                        placeholder="09XXXXXXXXX"
                                        value={pickupPhone}
                                        onChange={(event) => setPickupPhone(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label className="seller-label">
                                    Region / Province / City / Barangay / Postal Code
                                </label>

                                <div className="seller-location-tabs">
                                    <button
                                        type="button"
                                        className={
                                            'seller-location-tab' +
                                            (locationStep === 'region' ? ' active' : '') +
                                            (!regions.length ? ' disabled' : '')
                                        }
                                        onClick={() => regions.length && setLocationStep('region')}
                                    >
                                        Region
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            'seller-location-tab' +
                                            (locationStep === 'province' ? ' active' : '') +
                                            (!selectedRegion ? ' disabled' : '')
                                        }
                                        onClick={() => selectedRegion && setLocationStep('province')}
                                    >
                                        Province
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            'seller-location-tab' +
                                            (locationStep === 'city' ? ' active' : '') +
                                            (!selectedProvince ? ' disabled' : '')
                                        }
                                        onClick={() => selectedProvince && setLocationStep('city')}
                                    >
                                        City
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            'seller-location-tab' +
                                            (locationStep === 'barangay' ? ' active' : '') +
                                            (!selectedCity ? ' disabled' : '')
                                        }
                                        onClick={() => selectedCity && setLocationStep('barangay')}
                                    >
                                        Barangay
                                    </button>
                                    <button
                                        type="button"
                                        className={
                                            'seller-location-tab' +
                                            (locationStep === 'postal' ? ' active' : '') +
                                            (!selectedBarangay ? ' disabled' : '')
                                        }
                                        onClick={() => selectedBarangay && setLocationStep('postal')}
                                    >
                                        Postal Code
                                    </button>
                                </div>

                                <div className="seller-location-panel">
                                    {locationStep === 'region' && (
                                        <>
                                            <p className="seller-location-help">Choose your region.</p>
                                            <div className="seller-location-list">
                                                {regions.map((region) => (
                                                    <button
                                                        key={region.code}
                                                        type="button"
                                                        className={
                                                            'seller-location-item' +
                                                            (selectedRegion === region.code ? ' selected' : '')
                                                        }
                                                        onClick={() => handleRegionSelect(region.code)}
                                                    >
                                                        {region.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {locationStep === 'province' && (
                                        <>
                                            <p className="seller-location-help">Now pick your province.</p>
                                            <div className="seller-location-list">
                                                {provinces.map((province) => (
                                                    <button
                                                        key={province.code}
                                                        type="button"
                                                        className={
                                                            'seller-location-item' +
                                                            (selectedProvince === province.code ? ' selected' : '')
                                                        }
                                                        onClick={() => handleProvinceSelect(province.code)}
                                                    >
                                                        {province.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {locationStep === 'city' && (
                                        <>
                                            <p className="seller-location-help">Select the city for pickup.</p>
                                            <div className="seller-location-list">
                                                {cities.map((city) => (
                                                    <button
                                                        key={city.code}
                                                        type="button"
                                                        className={
                                                            'seller-location-item' +
                                                            (selectedCity === city.code ? ' selected' : '')
                                                        }
                                                        onClick={() => handleCitySelect(city.code)}
                                                    >
                                                        {city.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {locationStep === 'barangay' && (
                                        <>
                                            <p className="seller-location-help">Choose the barangay.</p>
                                            <div className="seller-location-list">
                                                {barangays.map((barangay) => (
                                                    <button
                                                        key={barangay.code}
                                                        type="button"
                                                        className={
                                                            'seller-location-item' +
                                                            (selectedBarangay === barangay.code ? ' selected' : '')
                                                        }
                                                        onClick={() => handleBarangaySelect(barangay.code)}
                                                    >
                                                        {barangay.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}

                                    {locationStep === 'postal' && (
                                        <div className="seller-location-postal">
                                            <input
                                                type="text"
                                                className="seller-input"
                                                placeholder="Enter postal code"
                                                value={selectedPostalCode}
                                                onChange={(event) => setSelectedPostalCode(event.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="field">
                                <label className="seller-label">Detail Address</label>
                                <textarea
                                    className="seller-input"
                                    rows={3}
                                    placeholder="Unit No., building, street and etc..."
                                    value={pickupDetailAddress}
                                    onChange={(event) => setPickupDetailAddress(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="seller-address-modal-footer">
                            <button
                                type="button"
                                className="seller-ghost-btn"
                                onClick={() => setIsPickupModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="seller-primary-btn"
                                onClick={handleSavePickupAddress}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
