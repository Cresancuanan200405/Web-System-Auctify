import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { verificationService } from '../../services/api';

const isValidFile = (file: File | null, allowPdf: boolean): boolean => {
    if (!file) return false;
    const maxBytes = 5 * 1024 * 1024;
    const allowed = allowPdf
        ? ['application/pdf', 'image/jpeg', 'image/png']
        : ['image/jpeg', 'image/png'];

    return file.size <= maxBytes && allowed.includes(file.type);
};

const isImageFile = (file: File | null): boolean => Boolean(file && file.type.startsWith('image/'));

export const AccountVerificationSection: React.FC = () => {
    const { authUser, updateUser } = useAuth();
    const [step, setStep] = useState(1);
    const [hasStarted, setHasStarted] = useState(false);
    const [policyScrolled, setPolicyScrolled] = useState(false);

    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [fullName, setFullName] = useState(authUser?.name ?? '');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [otp, setOtp] = useState('');
    const [otpSent, setOtpSent] = useState(false);
    const [otpVerified, setOtpVerified] = useState(false);
    const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

    const [governmentIdFile, setGovernmentIdFile] = useState<File | null>(null);
    const [selfieFile, setSelfieFile] = useState<File | null>(null);
    const [utilityBillFile, setUtilityBillFile] = useState<File | null>(null);
    const [bankStatementFile, setBankStatementFile] = useState<File | null>(null);
    const [documentsSubmitted, setDocumentsSubmitted] = useState(false);

    const [loading, setLoading] = useState(false);

    const verified = Boolean(authUser?.is_verified);
    const todayLabel = useMemo(() => new Date().toLocaleDateString('en-US'), []);
    const governmentIdPreviewUrl = useMemo(
        () => (isImageFile(governmentIdFile) ? URL.createObjectURL(governmentIdFile as File) : null),
        [governmentIdFile]
    );
    const selfiePreviewUrl = useMemo(
        () => (isImageFile(selfieFile) ? URL.createObjectURL(selfieFile as File) : null),
        [selfieFile]
    );
    const utilityBillPreviewUrl = useMemo(
        () => (isImageFile(utilityBillFile) ? URL.createObjectURL(utilityBillFile as File) : null),
        [utilityBillFile]
    );
    const bankStatementPreviewUrl = useMemo(
        () => (isImageFile(bankStatementFile) ? URL.createObjectURL(bankStatementFile as File) : null),
        [bankStatementFile]
    );

    useEffect(() => {
        return () => {
            if (governmentIdPreviewUrl) URL.revokeObjectURL(governmentIdPreviewUrl);
            if (selfiePreviewUrl) URL.revokeObjectURL(selfiePreviewUrl);
            if (utilityBillPreviewUrl) URL.revokeObjectURL(utilityBillPreviewUrl);
            if (bankStatementPreviewUrl) URL.revokeObjectURL(bankStatementPreviewUrl);
        };
    }, [governmentIdPreviewUrl, selfiePreviewUrl, utilityBillPreviewUrl, bankStatementPreviewUrl]);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await verificationService.getStatus();
                if (response.verification) {
                    setFullName(response.verification.full_name || authUser?.name || '');
                    setDateOfBirth(response.verification.date_of_birth || '');
                    setPhone(response.verification.phone || '');
                    setAddress(response.verification.address || '');
                    setOtpVerified(Boolean(response.verification.phone_verified_at));
                    setDocumentsSubmitted(
                        Boolean(response.verification.government_id_uploaded && response.verification.selfie_uploaded)
                    );
                }
            } catch {
                // Non-blocking load failure
            }
        };

        load();
    }, [authUser?.name]);

    const stepProgress = useMemo(() => {
        if (step === 2) return 25;
        if (step === 3) return 50;
        if (step === 4) return 75;
        return 0;
    }, [step]);

    const basicInfoValid =
        fullName.trim().length >= 3 &&
        dateOfBirth.trim().length > 0 &&
        phone.trim().length >= 8 &&
        address.trim().length >= 10;

    const canGoStep2 = privacyAccepted;
    const canGoStep3 = basicInfoValid && otpVerified;

    const docsValid =
        isValidFile(governmentIdFile, true) &&
        isValidFile(selfieFile, false) &&
        (utilityBillFile ? isValidFile(utilityBillFile, true) : true) &&
        (bankStatementFile ? isValidFile(bankStatementFile, true) : true);

    const sendOtp = async () => {
        if (!basicInfoValid) {
            toast.error('Please complete all required personal information first.');
            return;
        }

        setLoading(true);
        try {
            const response = await verificationService.sendOtp({
                full_name: fullName,
                date_of_birth: dateOfBirth,
                phone,
                address,
                privacy_accepted: privacyAccepted,
            });

            setOtpSent(true);
            setOtpVerified(false);
            setDevOtpHint(response.dev_otp || null);
            toast.success(response.message);
        } catch (error: unknown) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to send OTP.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const confirmOtp = async () => {
        if (!otpSent) {
            toast.error('Please request OTP first.');
            return;
        }

        if (otp.trim().length !== 6) {
            toast.error('OTP must be 6 digits.');
            return;
        }

        setLoading(true);
        try {
            const response = await verificationService.confirmOtp({ phone, otp });
            setOtpVerified(true);
            toast.success(response.message);
        } catch (error: unknown) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'OTP verification failed.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const submitDocuments = async () => {
        if (!docsValid) {
            toast.error('Please upload valid files (PDF/JPG/PNG, under 5MB).');
            return;
        }

        if (!governmentIdFile || !selfieFile) {
            toast.error('Government ID and selfie are required.');
            return;
        }

        const formData = new FormData();
        formData.append('government_id', governmentIdFile);
        formData.append('selfie', selfieFile);
        if (utilityBillFile) formData.append('utility_bill', utilityBillFile);
        if (bankStatementFile) formData.append('bank_statement', bankStatementFile);

        setLoading(true);
        try {
            const response = await verificationService.uploadDocuments(formData);
            setDocumentsSubmitted(true);
            setStep(4);
            toast.success(response.message);
        } catch (error: unknown) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to upload verification documents.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const finalizeVerification = async () => {
        setLoading(true);
        try {
            const response = await verificationService.finalize(true);
            updateUser(response.user);
            toast.success(response.message);
        } catch (error: unknown) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to finalize verification.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const revokeVerification = async () => {
        const confirmed = window.confirm(
            'Revoke verification? You may lose auctioneer trust status and verified badge visibility.'
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            const response = await verificationService.revoke();
            updateUser(response.user);
            toast.success(response.message);
        } catch (error: unknown) {
            const message =
                typeof error === 'object' &&
                error !== null &&
                'message' in error &&
                typeof (error as { message?: unknown }).message === 'string'
                    ? (error as { message: string }).message
                    : 'Failed to revoke verification.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="account-section">
            <div className="account-card verification-card">
                <div className="account-card-header">
                    <div className="account-card-title">
                        <span className="account-card-icon" aria-hidden="true">
                            <img src="/icons/user.png" alt="Verification" />
                        </span>
                        <span>Account Verification</span>
                        {verified && <span className="verified-badge">Verified</span>}
                    </div>
                </div>

                {verified ? (
                    <div className="verification-success">
                        <div className="verification-success-content">
                            <p>
                                Your account has been successfully verified. Your Auctify Trust Badge will now be displayed on your
                                profile and alongside your participation in auctions. This badge serves as a visible symbol of
                                authenticity and credibility within the marketplace, allowing other users to confidently engage with you.
                            </p>
                            <p>
                                As a verified member of Auctify, you gain enhanced trust visibility across the platform. Buyers are more
                                likely to place bids on listings created by verified sellers, and sellers are more confident accepting bids
                                from verified bidders. The verification status reduces hesitation in transactions and helps establish a
                                more secure auction environment.
                            </p>
                            <p>
                                Verified users may also receive prioritized visibility in certain auction listings, improved profile
                                reputation indicators, and eligibility for higher-value transactions depending on platform policies. In
                                cases of disputes, verified accounts benefit from streamlined review processes, as identity confirmation
                                has already been completed.
                            </p>
                            <p>
                                Your verified status demonstrates that your identity has been authenticated through secure documentation
                                and validation procedures. This significantly lowers the risk of fraud, impersonation, and non-legitimate
                                activity, strengthening the integrity of the Auctify marketplace as a whole.
                            </p>
                            <p>
                                Maintaining your verified status requires compliance with Auctify’s Terms of Service and community
                                standards. Any misuse of the platform, submission of false information, or violation of policies may
                                result in revocation of verification privileges.
                            </p>
                            <p>
                                Thank you for contributing to a safer, more transparent auction community. As a verified user of
                                Auctify, you are recognized as a trusted participant within the marketplace.
                            </p>
                        </div>
                        <button type="button" className="delete-button" onClick={revokeVerification} disabled={loading}>
                            Revoke Verification
                        </button>
                    </div>
                ) : (
                    <>
                        {hasStarted && (
                            <div className="verification-progress-wrap">
                                <div className="verification-progress-text">Progress: {stepProgress}% complete</div>
                                <div className="verification-progress-track">
                                    <div className="verification-progress-fill" style={{ width: `${stepProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {!hasStarted && (
                            <div className="verification-step">
                                <h3>Verify Account</h3>
                                <p>
                                    Account verification is designed to strengthen trust, transparency, and accountability within the
                                    Auctify auction marketplace. By completing verification, your profile demonstrates credibility to
                                    other users, particularly when participating as a seller. Verified accounts may receive increased
                                    buyer confidence, higher engagement in auctions, and improved visibility within the platform.
                                </p>
                                <p>
                                    The verification process begins with confirmation of your personal information through a secure
                                    phone-based One-Time Password (OTP). This step ensures that the contact number linked to your
                                    account is active and under your control. OTP verification also serves as an added layer of security
                                    to prevent unauthorized access or identity misuse.
                                </p>
                                <p>
                                    You will then be required to upload a valid government-issued identification document. Accepted
                                    documents may include a national ID card, passport, or driver’s license. The document must be clear,
                                    unedited, and show all required details. Alongside the ID submission, you will be asked to provide a
                                    live selfie to complete a facial recognition match. This process verifies that the person submitting the
                                    ID is the legitimate owner of the document and helps prevent impersonation or fraudulent registrations.
                                </p>
                                <p>
                                    For users who wish to enhance their trust level within the platform, optional supporting documents
                                    such as a recent utility bill or bank statement may be submitted. These documents help confirm your
                                    residential address and further strengthen your verification status. While optional, providing additional
                                    documentation may increase buyer confidence and reduce disputes in high-value transactions.
                                </p>
                                <p>
                                    Before final submission, you will be given an opportunity to carefully review all entered information and
                                    uploaded documents. It is your responsibility to ensure that all details are accurate, current, and truthful.
                                    Submitting incomplete, altered, or false documentation may result in verification rejection, temporary
                                    suspension, or permanent account restriction.
                                </p>
                                <div className="account-form-actions">
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        onClick={() => {
                                            setHasStarted(true);
                                            setStep(1);
                                            setPrivacyAccepted(false);
                                            setPolicyScrolled(false);
                                        }}
                                    >
                                        Start Verification
                                    </button>
                                </div>
                            </div>
                        )}

                        {hasStarted && step === 1 && (
                            <div className="verification-step">
                                <h3>Step 1: Agreement & Privacy Policy</h3>
                                <div
                                    className="verification-policy"
                                    onScroll={(event) => {
                                        const target = event.currentTarget;
                                        const atBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 4;
                                        if (atBottom && !policyScrolled) {
                                            setPolicyScrolled(true);
                                        }
                                    }}
                                >
                                    <h4 className="verification-policy-title">AUCTIFY VERIFICATION AGREEMENT</h4>
                                    <div className="verification-policy-meta">
                                        Effective Date: {todayLabel}
                                    </div>
                                    <div className="verification-policy-meta">
                                        Platform: Auctify - A Web-Based Auction System for Second-Hand Products
                                    </div>

                                    <h5 className="verification-policy-section">1. Overview</h5>
                                    <p>
                                        This Verification Agreement ("Agreement") governs the process by which users of Auctify apply for and
                                        obtain verified status to participate as Auctioneers (sellers) on the platform. By submitting a verification
                                        request, you acknowledge that you have read, understood, and agree to be bound by this Agreement.
                                    </p>

                                    <h5 className="verification-policy-section">2. Purpose of Verification</h5>
                                    <p>Auctify requires identity verification to:</p>
                                    <ul className="verification-policy-list">
                                        <li>Promote a safe and trustworthy marketplace</li>
                                        <li>Prevent fraud, impersonation, and abuse</li>
                                        <li>Ensure compliance with applicable laws and regulations</li>
                                        <li>Protect buyers and sellers participating in auctions</li>
                                    </ul>
                                    <p>Verification allows eligible users to create and manage auction listings.</p>

                                    <h5 className="verification-policy-section">3. Eligibility Requirements</h5>
                                    <ul className="verification-policy-list">
                                        <li>Be at least eighteen (18) years old or the age of majority in your jurisdiction</li>
                                        <li>Maintain an active Auctify account in good standing</li>
                                        <li>Provide accurate and complete personal information</li>
                                        <li>Submit valid, government-issued identification</li>
                                    </ul>
                                    <p>Auctify reserves the right to deny verification at its sole discretion.</p>

                                    <h5 className="verification-policy-section">4. Information and Documentation</h5>
                                    <p>During the verification process, you may be required to submit:</p>
                                    <ul className="verification-policy-list">
                                        <li>Full legal name</li>
                                        <li>Date of birth</li>
                                        <li>Residential address</li>
                                        <li>Contact information</li>
                                        <li>Government-issued ID (front and back images)</li>
                                        <li>Additional documentation if requested</li>
                                    </ul>
                                    <p>You represent and warrant that all information provided is true, accurate, and not misleading.</p>

                                    <h5 className="verification-policy-section">5. Review and Approval Process</h5>
                                    <p>All verification requests are subject to manual or automated review. Auctify may:</p>
                                    <ul className="verification-policy-list">
                                        <li>Approve your verification</li>
                                        <li>Reject your verification</li>
                                        <li>Request additional information</li>
                                        <li>Suspend review pending clarification</li>
                                    </ul>
                                    <p>Approval timelines may vary. Verification is not guaranteed.</p>

                                    <h5 className="verification-policy-section">6. Responsibilities of Verified Auctioneers</h5>
                                    <p>If approved as a Verified Auctioneer, you agree to:</p>
                                    <ul className="verification-policy-list">
                                        <li>List items accurately and truthfully</li>
                                        <li>Deliver items in the condition described</li>
                                        <li>Avoid deceptive, fraudulent, or unlawful practices</li>
                                        <li>Comply with all Auctify policies and auction rules</li>
                                        <li>Cooperate with dispute resolution processes</li>
                                    </ul>
                                    <p>Auctify may revoke verification status at any time if violations occur.</p>

                                    <h5 className="verification-policy-section">7. Fraud, Misrepresentation, and Enforcement</h5>
                                    <p>Submitting falsified documents, impersonating another individual, or attempting to circumvent verification controls may result in:</p>
                                    <ul className="verification-policy-list">
                                        <li>Immediate account suspension or termination</li>
                                        <li>Permanent removal of auction privileges</li>
                                        <li>Reporting to appropriate authorities where required</li>
                                    </ul>

                                    <h5 className="verification-policy-section">8. No Guarantee of Transaction Outcome</h5>
                                    <p>Verification status confirms identity validation only. Auctify does not guarantee the quality, authenticity, or legality of items listed by verified users. Users transact at their own risk.</p>

                                    <h5 className="verification-policy-section">9. Agreement Acknowledgment</h5>
                                    <p>By proceeding with verification, you confirm the accuracy of your submitted information, consent to identity verification procedures, and agree to comply with Auctify's Terms and Policies.</p>

                                    <h4 className="verification-policy-title">AUCTIFY PRIVACY POLICY</h4>
                                    <div className="verification-policy-meta">Effective Date: {todayLabel}</div>
                                    <p>Auctify respects your privacy and is committed to protecting your personal information.</p>

                                    <h5 className="verification-policy-section">1. Information We Collect</h5>
                                    <ul className="verification-policy-list">
                                        <li>Account Information: name, email, password (securely encrypted), contact information, address details</li>
                                        <li>Verification Information: government-issued identification documents, identity confirmation images, date of birth</li>
                                        <li>Transaction Information: bidding activity, auction listings, payment records, account activity logs</li>
                                        <li>Technical Information: IP address, device type, browser information, usage data and session logs</li>
                                    </ul>

                                    <h5 className="verification-policy-section">2. How We Use Your Information</h5>
                                    <ul className="verification-policy-list">
                                        <li>Verify user identity</li>
                                        <li>Facilitate auctions and transactions</li>
                                        <li>Prevent fraud and abuse</li>
                                        <li>Provide customer support</li>
                                        <li>Improve platform performance and security</li>
                                        <li>Comply with legal obligations</li>
                                    </ul>
                                    <p>Verification documents are used solely for identity authentication purposes.</p>

                                    <h5 className="verification-policy-section">3. Data Protection and Security</h5>
                                    <p>Auctify implements appropriate technical and organizational safeguards, including encrypted password storage, secure server infrastructure, role-based access controls, restricted access to verification documents, and activity monitoring.</p>

                                    <h5 className="verification-policy-section">4. Data Retention</h5>
                                    <p>We retain personal information only as long as necessary to provide platform services, fulfill legal requirements, resolve disputes, and enforce agreements.</p>

                                    <h5 className="verification-policy-section">5. Information Sharing</h5>
                                    <p>Auctify does not sell or rent personal information. We may disclose information only when required by law, to comply with legal processes, to prevent fraud or security threats, or to enforce platform policies.</p>

                                    <h5 className="verification-policy-section">6. User Rights</h5>
                                    <p>Subject to applicable law, you may access your personal data, correct inaccurate information, request deletion, and withdraw consent where permitted.</p>

                                    <h5 className="verification-policy-section">7. Cookies and Tracking Technologies</h5>
                                    <p>Auctify may use cookies and similar technologies to maintain login sessions, enhance user experience, and analyze platform usage.</p>

                                    <h5 className="verification-policy-section">8. Updates to This Policy</h5>
                                    <p>Auctify reserves the right to update this Privacy Policy. Material changes will be communicated through the platform.</p>

                                    <h5 className="verification-policy-section">9. Contact Information</h5>
                                    <p>For questions regarding this Privacy Policy or the Verification Agreement, please contact Auctify Support at support@auctify.com or visit www.auctify.com.</p>

                                    <div className="verification-policy-divider" />
                                    <label className="verification-check verification-policy-check">
                                        <input
                                            type="checkbox"
                                            checked={privacyAccepted}
                                            onChange={(event) => setPrivacyAccepted(event.target.checked)}
                                            disabled={!policyScrolled}
                                        />
                                        <span>
                                            I have read and agree to the Auctify Verification Agreement and Privacy Policy.
                                        </span>
                                    </label>
                                    {!policyScrolled && (
                                        <div className="verification-note">
                                            Scroll to the bottom of the policy to enable agreement.
                                        </div>
                                    )}
                                </div>
                                <div className="account-form-actions">
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        disabled={!canGoStep2}
                                        onClick={() => setStep(2)}
                                    >
                                        Continue to Verification
                                    </button>
                                </div>
                            </div>
                        )}

                        {hasStarted && step === 2 && (
                            <div className="verification-step">
                                <h3>Step 2: Confirm Basic Information</h3>
                                <p>
                                    Make sure these details match your valid government ID. Your phone number will be confirmed using a
                                    one-time password (OTP) before you can continue.
                                </p>

                                <div className="verification-step-grid">
                                    <div className="verification-panel">
                                        <div className="verification-panel-header">
                                            <div>
                                                <h4>Personal details</h4>
                                                <p className="verification-panel-sub">
                                                    Used to confirm your identity and show on auction profiles.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="verification-grid">
                                            <div className="field floating-field has-value">
                                                <label htmlFor="verifyFullName">Full name</label>
                                                <input
                                                    id="verifyFullName"
                                                    value={fullName}
                                                    onChange={(event) => setFullName(event.target.value)}
                                                />
                                            </div>
                                            <div className="field floating-field has-value">
                                                <label htmlFor="verifyDob">Date of birth</label>
                                                <input
                                                    id="verifyDob"
                                                    type="date"
                                                    value={dateOfBirth}
                                                    onChange={(event) => setDateOfBirth(event.target.value)}
                                                />
                                            </div>
                                            <div className="field floating-field has-value">
                                                <label htmlFor="verifyPhone">Phone number</label>
                                                <input
                                                    id="verifyPhone"
                                                    value={phone}
                                                    onChange={(event) => setPhone(event.target.value)}
                                                />
                                            </div>
                                            <div className="field floating-field has-value">
                                                <label htmlFor="verifyAddress">Address</label>
                                                <input
                                                    id="verifyAddress"
                                                    value={address}
                                                    onChange={(event) => setAddress(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="verification-panel verification-panel-otp">
                                        <div className="verification-panel-header">
                                            <div>
                                                <h4>Phone verification</h4>
                                                <p className="verification-panel-sub">
                                                    We send a 6-digit code to confirm this number belongs to you.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="verification-otp-row">
                                            <button
                                                type="button"
                                                className="secondary-btn"
                                                onClick={sendOtp}
                                                disabled={loading || !basicInfoValid}
                                            >
                                                Send OTP
                                            </button>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="Enter 6-digit code"
                                                value={otp}
                                                onChange={(event) => setOtp(event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="secondary-btn"
                                                onClick={confirmOtp}
                                                disabled={loading || !otpSent}
                                            >
                                                Confirm OTP
                                            </button>
                                        </div>
                                        {devOtpHint && <div className="verification-note">Dev OTP: {devOtpHint}</div>}
                                        <div className="verification-note">Progress bar: 25% complete.</div>
                                    </div>
                                </div>

                                <div className="account-form-actions">
                                    <button type="button" className="secondary-btn" onClick={() => setStep(1)}>
                                        Back
                                    </button>
                                    <button type="button" className="primary-btn" onClick={() => setStep(3)} disabled={!canGoStep3}>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {hasStarted && step === 3 && (
                            <div className="verification-step">
                                <h3>Step 3: Upload Verification Documents</h3>
                                <p>
                                    Upload government-issued ID and selfie for facial match. Utility bill or bank statement is optional but recommended for auctioneers.
                                </p>
                                <div className="verification-docs-grid">
                                    <div className="verification-upload-card">
                                        <div className="verification-upload-head">
                                            <label>Government ID (required)</label>
                                            <span className="verification-upload-tag">PDF/JPG/PNG</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setGovernmentIdFile(e.target.files?.[0] ?? null)}
                                        />
                                        {governmentIdFile && (
                                            <div className="verification-upload-preview">
                                                {governmentIdPreviewUrl ? (
                                                    <img src={governmentIdPreviewUrl} alt="Government ID preview" />
                                                ) : (
                                                    <div className="verification-file-placeholder">PDF selected</div>
                                                )}
                                            </div>
                                        )}
                                        <div className="verification-upload-file">
                                            {governmentIdFile ? governmentIdFile.name : 'No file chosen'}
                                        </div>
                                    </div>

                                    <div className="verification-upload-card">
                                        <div className="verification-upload-head">
                                            <label>Selfie (required)</label>
                                            <span className="verification-upload-tag">JPG/PNG</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                                        />
                                        {selfiePreviewUrl && (
                                            <div className="verification-upload-preview">
                                                <img src={selfiePreviewUrl} alt="Selfie preview" />
                                            </div>
                                        )}
                                        <div className="verification-upload-file">
                                            {selfieFile ? selfieFile.name : 'No file chosen'}
                                        </div>
                                    </div>

                                    <div className="verification-upload-card">
                                        <div className="verification-upload-head">
                                            <label>Utility bill (optional)</label>
                                            <span className="verification-upload-tag">PDF/JPG/PNG</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setUtilityBillFile(e.target.files?.[0] ?? null)}
                                        />
                                        {utilityBillFile && (
                                            <div className="verification-upload-preview">
                                                {utilityBillPreviewUrl ? (
                                                    <img src={utilityBillPreviewUrl} alt="Utility bill preview" />
                                                ) : (
                                                    <div className="verification-file-placeholder">PDF selected</div>
                                                )}
                                            </div>
                                        )}
                                        <div className="verification-upload-file">
                                            {utilityBillFile ? utilityBillFile.name : 'Optional / not provided'}
                                        </div>
                                    </div>

                                    <div className="verification-upload-card">
                                        <div className="verification-upload-head">
                                            <label>Bank statement (optional)</label>
                                            <span className="verification-upload-tag">PDF/JPG/PNG</span>
                                        </div>
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setBankStatementFile(e.target.files?.[0] ?? null)}
                                        />
                                        {bankStatementFile && (
                                            <div className="verification-upload-preview">
                                                {bankStatementPreviewUrl ? (
                                                    <img src={bankStatementPreviewUrl} alt="Bank statement preview" />
                                                ) : (
                                                    <div className="verification-file-placeholder">PDF selected</div>
                                                )}
                                            </div>
                                        )}
                                        <div className="verification-upload-file">
                                            {bankStatementFile ? bankStatementFile.name : 'Optional / not provided'}
                                        </div>
                                    </div>
                                </div>

                                <div className="verification-note">
                                    Your documents are encrypted and deleted after verification.
                                </div>
                                <div className="verification-note">
                                    File limits: PDF/JPG/PNG, under 5MB per file. Progress bar: 50% complete.
                                </div>

                                <div className="account-form-actions">
                                    <button type="button" className="secondary-btn" onClick={() => setStep(2)}>
                                        Back
                                    </button>
                                    <button type="button" className="primary-btn" disabled={!docsValid || loading} onClick={submitDocuments}>
                                        Submit for Review
                                    </button>
                                </div>
                            </div>
                        )}

                        {hasStarted && step === 4 && (
                            <div className="verification-step">
                                <h3>Step 4: Review & Confirm</h3>
                                <div className="verification-review-grid">
                                    <div className="verification-summary verification-summary-profile">
                                        <div className="verification-summary-item">
                                            <span>Full name</span>
                                            <strong>{fullName}</strong>
                                        </div>
                                        <div className="verification-summary-item">
                                            <span>Date of birth</span>
                                            <strong>{dateOfBirth}</strong>
                                        </div>
                                        <div className="verification-summary-item">
                                            <span>Phone</span>
                                            <strong>{phone}</strong>
                                        </div>
                                        <div className="verification-summary-item verification-summary-item-full">
                                            <span>Address</span>
                                            <strong>{address}</strong>
                                        </div>
                                    </div>

                                    <div className="verification-summary verification-summary-docs">
                                        <div className="verification-doc-preview-card">
                                            <div className="verification-doc-preview-head">
                                                <span>Government ID</span>
                                                <strong>{governmentIdFile?.name || (documentsSubmitted ? 'Uploaded' : 'Not uploaded')}</strong>
                                            </div>
                                            {governmentIdPreviewUrl ? (
                                                <img src={governmentIdPreviewUrl} alt="Government ID review preview" />
                                            ) : (
                                                <div className="verification-file-placeholder">No image preview available</div>
                                            )}
                                        </div>

                                        <div className="verification-doc-preview-card">
                                            <div className="verification-doc-preview-head">
                                                <span>Selfie</span>
                                                <strong>{selfieFile?.name || (documentsSubmitted ? 'Uploaded' : 'Not uploaded')}</strong>
                                            </div>
                                            {selfiePreviewUrl ? (
                                                <img src={selfiePreviewUrl} alt="Selfie review preview" />
                                            ) : (
                                                <div className="verification-file-placeholder">No image preview available</div>
                                            )}
                                        </div>

                                        <div className="verification-doc-preview-card">
                                            <div className="verification-doc-preview-head">
                                                <span>Utility bill</span>
                                                <strong>{utilityBillFile?.name || 'Optional / not provided'}</strong>
                                            </div>
                                            {utilityBillPreviewUrl ? (
                                                <img src={utilityBillPreviewUrl} alt="Utility bill review preview" />
                                            ) : (
                                                <div className="verification-file-placeholder">No image preview available</div>
                                            )}
                                        </div>

                                        <div className="verification-doc-preview-card">
                                            <div className="verification-doc-preview-head">
                                                <span>Bank statement</span>
                                                <strong>{bankStatementFile?.name || 'Optional / not provided'}</strong>
                                            </div>
                                            {bankStatementPreviewUrl ? (
                                                <img src={bankStatementPreviewUrl} alt="Bank statement review preview" />
                                            ) : (
                                                <div className="verification-file-placeholder">No image preview available</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="account-form-actions">
                                    <button type="button" className="secondary-btn" onClick={() => setStep(3)}>
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        className="primary-btn"
                                        disabled={!documentsSubmitted || loading}
                                        onClick={finalizeVerification}
                                    >
                                        Submit Verification
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
