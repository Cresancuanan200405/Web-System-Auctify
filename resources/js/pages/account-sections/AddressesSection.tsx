import type { FormEvent } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { addressService } from '../../services/api';
import { getRegions, getProvinces, getCities, getBarangays } from '../../services/psgc';
import type { Address, Region, Province, City, Barangay } from '../../types';

export const AddressesSection: React.FC = () => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    
    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [streetAddress, setStreetAddress] = useState('');
    const [buildingName, setBuildingName] = useState('');
    const [unitFloor, setUnitFloor] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [notes, setNotes] = useState('');
    
    // PSGC data
    const [regions, setRegions] = useState<Region[]>([]);
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [barangays, setBarangays] = useState<Barangay[]>([]);
    
    // Selected codes
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState('');

    // Lookup maps for displaying human-readable location names instead of numeric codes
    const [regionNames, setRegionNames] = useState<Record<string, string>>({});
    const [provinceNames, setProvinceNames] = useState<Record<string, string>>({});
    const [cityNames, setCityNames] = useState<Record<string, string>>({});
    const [barangayNames, setBarangayNames] = useState<Record<string, string>>({});

    // Read-only view state
    const [viewAddress, setViewAddress] = useState<Address | null>(null);

    const buildLocationNameMaps = useCallback(async (addressList: Address[]) => {
        try {
            const uniqueRegionCodes = Array.from(new Set(addressList.map((a) => a.region).filter(Boolean)));
            const uniqueProvinceCodes = Array.from(new Set(addressList.map((a) => a.province).filter(Boolean)));
            const uniqueCityCodes = Array.from(new Set(addressList.map((a) => a.city).filter(Boolean)));
            const uniqueBarangayCodes = Array.from(new Set(addressList.map((a) => a.barangay).filter(Boolean)));

            const provinceMap: Record<string, string> = {};
            const cityMap: Record<string, string> = {};
            const barangayMap: Record<string, string> = {};

            // Provinces: fetch by region, then keep only those we actually use
            for (const regionCode of uniqueRegionCodes) {
                if (!regionCode) continue;
                try {
                    const provincesData = await getProvinces(regionCode);
                    provincesData.forEach((p) => {
                        if (uniqueProvinceCodes.includes(p.code)) {
                            provinceMap[p.code] = p.name;
                        }
                    });
                } catch (error) {
                    console.error('Failed to load provinces for display:', error);
                }
            }

            // Cities: fetch by province
            for (const provinceCode of uniqueProvinceCodes) {
                if (!provinceCode) continue;
                try {
                    const citiesData = await getCities(provinceCode);
                    citiesData.forEach((c) => {
                        if (uniqueCityCodes.includes(c.code)) {
                            cityMap[c.code] = c.name;
                        }
                    });
                } catch (error) {
                    console.error('Failed to load cities for display:', error);
                }
            }

            // Barangays: fetch by city
            for (const cityCode of uniqueCityCodes) {
                if (!cityCode) continue;
                try {
                    const barangaysData = await getBarangays(cityCode);
                    barangaysData.forEach((b) => {
                        if (uniqueBarangayCodes.includes(b.code)) {
                            barangayMap[b.code] = b.name;
                        }
                    });
                } catch (error) {
                    console.error('Failed to load barangays for display:', error);
                }
            }

            setProvinceNames(provinceMap);
            setCityNames(cityMap);
            setBarangayNames(barangayMap);
        } catch (error) {
            console.error('Failed to build location name maps:', error);
        }
    }, []);

    const loadAddresses = useCallback(async () => {
        try {
            const data = await addressService.getAddresses();
            setAddresses(data);
            await buildLocationNameMaps(data);
        } catch (error) {
            console.error('Failed to load addresses:', error);
        }
    }, [buildLocationNameMaps]);

    useEffect(() => {
        loadAddresses();
        loadRegions();
    }, [loadAddresses]);

    const loadRegions = async () => {
        try {
            const data = await getRegions();
            setRegions(data);
            const map: Record<string, string> = {};
            data.forEach((r) => {
                map[r.code] = r.name;
            });
            setRegionNames(map);
        } catch (error) {
            console.error('Failed to load regions:', error);
        }
    };

    const handleRegionChange = async (regionCode: string) => {
        setSelectedRegion(regionCode);
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedBarangay('');
        setProvinces([]);
        setCities([]);
        setBarangays([]);

        if (regionCode) {
            try {
                const data = await getProvinces(regionCode);
                setProvinces(data);
            } catch (error) {
                console.error('Failed to load provinces:', error);
            }
        }
    };

    const handleProvinceChange = async (provinceCode: string) => {
        setSelectedProvince(provinceCode);
        setSelectedCity('');
        setSelectedBarangay('');
        setCities([]);
        setBarangays([]);

        if (provinceCode) {
            try {
                const data = await getCities(provinceCode);
                setCities(data);
            } catch (error) {
                console.error('Failed to load cities:', error);
            }
        }
    };

    const handleCityChange = async (cityCode: string) => {
        setSelectedCity(cityCode);
        setSelectedBarangay('');
        setBarangays([]);

        if (cityCode) {
            try {
                const data = await getBarangays(cityCode);
                setBarangays(data);
            } catch (error) {
                console.error('Failed to load barangays:', error);
            }
        }
    };

    const openAddModal = () => {
        resetForm();
        setEditingId(null);
        setIsModalOpen(true);
    };

    const openEditModal = async (address: Address) => {
        setEditingId(address.id);
        setFirstName(address.first_name);
        setLastName(address.last_name);
        setPhone(address.phone);
        setStreetAddress(address.street_address);
        setBuildingName(address.building_name || '');
        setUnitFloor(address.unit_floor || '');
        setPostalCode(address.postal_code || '');
        setNotes(address.notes || '');
        setSelectedRegion(address.region);
        setSelectedProvince(address.province);
        setSelectedCity(address.city);
        setSelectedBarangay(address.barangay);
        setIsModalOpen(true);

        // Preload province, city, and barangay options based on the saved codes
        try {
            if (address.region) {
                const provincesData = await getProvinces(address.region);
                setProvinces(provincesData);
            } else {
                setProvinces([]);
            }

            if (address.province) {
                const citiesData = await getCities(address.province);
                setCities(citiesData);
            } else {
                setCities([]);
            }

            if (address.city) {
                const barangaysData = await getBarangays(address.city);
                setBarangays(barangaysData);
            } else {
                setBarangays([]);
            }
        } catch (error) {
            console.error('Failed to preload location data for edit:', error);
        }
    };

    const resetForm = () => {
        setFirstName('');
        setLastName('');
        setPhone('');
        setStreetAddress('');
        setBuildingName('');
        setUnitFloor('');
        setPostalCode('');
        setNotes('');
        setSelectedRegion('');
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedBarangay('');
        setProvinces([]);
        setCities([]);
        setBarangays([]);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        const addressData = {
            first_name: firstName,
            last_name: lastName,
            phone,
            region: selectedRegion,
            province: selectedProvince,
            city: selectedCity,
            barangay: selectedBarangay,
            street_address: streetAddress,
            building_name: buildingName,
            unit_floor: unitFloor,
            postal_code: postalCode,
            notes
        };

        try {
            if (editingId) {
                await addressService.updateAddress(editingId, addressData);
                toast.success('Address updated successfully!');
            } else {
                await addressService.createAddress(addressData);
                toast.success('Address added successfully!');
            }
            
            loadAddresses();
            setIsModalOpen(false);
            resetForm();
        } catch (err: unknown) {
            const responseMessage =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            const errorMessage = responseMessage || 'Failed to save address';
            toast.error(errorMessage);
        }
    };

    const handleDelete = (id: string) => {
        setDeleteTargetId(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;

        setDeleteLoading(true);

        try {
            await addressService.deleteAddress(deleteTargetId);
            const updated = addresses.filter((a) => a.id !== deleteTargetId);
            setAddresses(updated);
            toast.success('Address deleted successfully!');
            setIsDeleteModalOpen(false);
            setDeleteTargetId(null);
        } catch (err: unknown) {
            const responseMessage =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            const errorMessage = responseMessage || 'Failed to delete address';
            toast.error(errorMessage);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="addresses-main">
            <div className="addresses-header">
                <div className="addresses-header-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>
                <h2 className="addresses-header-title">Saved Addresses ({addresses.length})</h2>
            </div>

            {addresses.length === 0 ? (
                <div className="addresses-empty-card">
                    <div className="addresses-empty-icon" aria-hidden="true">
                        <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                            <rect x="3" y="7" width="18" height="13" rx="2" />
                            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </div>
                    <div className="addresses-empty-text">You don't have any saved address</div>
                    <button type="button" className="addresses-empty-button" onClick={openAddModal}>
                        Add New Address
                    </button>
                </div>
            ) : (
                <>
                    <div className="addresses-list">
                        {addresses.map((address) => (
                            <div
                                key={address.id}
                                className="address-card"
                                onClick={() => setViewAddress(address)}
                            >
                                <div className="address-card-header">
                                    <div className="address-card-name">
                                        {address.first_name} {address.last_name}
                                    </div>
                                    <div className="address-card-actions">
                                        <button
                                            type="button"
                                            className="address-card-edit"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                openEditModal(address);
                                            }}
                                            aria-label="Edit address"
                                        >
                                            <img src="/icons/edit.png" alt="Edit" />
                                        </button>
                                        <button
                                            type="button"
                                            className="address-card-delete"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDelete(address.id);
                                            }}
                                            aria-label="Delete address"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                                <div className="address-card-phone">{address.phone}</div>
                                <div className="address-card-details">
                                    {address.street_address}
                                    {address.building_name && `, ${address.building_name}`}
                                    <br />
                                    {barangayNames[address.barangay] || address.barangay}, {cityNames[address.city] || address.city}
                                    <br />
                                    {provinceNames[address.province] || address.province}, {regionNames[address.region] || address.region}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="addresses-add-button" onClick={openAddModal}>
                        Add New Address
                    </button>
                </>
            )}

            {isModalOpen && (
                <div
                    className="account-edit-overlay"
                    onClick={() => setIsModalOpen(false)}
                >
                    <div
                        className="account-edit-panel"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="account-edit-header">
                            <h2 className="account-edit-title">
                                {editingId ? 'Edit Address' : 'Add New Address'}
                            </h2>
                            <button
                                type="button"
                                className="account-edit-close"
                                onClick={() => setIsModalOpen(false)}
                                aria-label={editingId ? 'Close edit address' : 'Close add address'}
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="account-edit-form">
                            <div className="account-edit-two-col">
                                <div className="field">
                                    <label htmlFor="addressFirstName">First Name *</label>
                                    <input
                                        id="addressFirstName"
                                        value={firstName}
                                        placeholder="First Name"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label htmlFor="addressLastName">Last Name *</label>
                                    <input
                                        id="addressLastName"
                                        value={lastName}
                                        placeholder="Last Name"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="field">
                                <label htmlFor="addressPhone">Phone Number *</label>
                                <input
                                    id="addressPhone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressRegion">Region *</label>
                                <select
                                    id="addressRegion"
                                    value={selectedRegion}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRegionChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select Region</option>
                                    {regions.map((r) => (
                                        <option key={r.code} value={r.code}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="addressProvince">Province *</label>
                                <select
                                    id="addressProvince"
                                    value={selectedProvince}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleProvinceChange(e.target.value)}
                                    required
                                    disabled={!selectedRegion}
                                >
                                    <option value="">Select Province</option>
                                    {provinces.map((p) => (
                                        <option key={p.code} value={p.code}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="addressCity">City *</label>
                                <select
                                    id="addressCity"
                                    value={selectedCity}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCityChange(e.target.value)}
                                    required
                                    disabled={!selectedProvince}
                                >
                                    <option value="">Select City</option>
                                    {cities.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="addressBarangay">Barangay *</label>
                                <select
                                    id="addressBarangay"
                                    value={selectedBarangay}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBarangay(e.target.value)}
                                    required
                                    disabled={!selectedCity}
                                >
                                    <option value="">Select Barangay</option>
                                    {barangays.map((b) => (
                                        <option key={b.code} value={b.code}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="addressStreet">Street Address *</label>
                                <input
                                    id="addressStreet"
                                    value={streetAddress}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStreetAddress(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressBuilding">Building Name (optional)</label>
                                <input
                                    id="addressBuilding"
                                    value={buildingName}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuildingName(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressUnitFloor">Unit/Floor (optional)</label>
                                <input
                                    id="addressUnitFloor"
                                    value={unitFloor}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitFloor(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressPostalCode">Postal Code (optional)</label>
                                <input
                                    id="addressPostalCode"
                                    value={postalCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostalCode(e.target.value)}
                                />
                            </div>

                            <div className="field">
                                <label htmlFor="addressNotes">Delivery Notes (optional)</label>
                                <input
                                    id="addressNotes"
                                    value={notes}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                                />
                            </div>

                            <div className="account-edit-footer">
                                <button
                                    type="button"
                                    className="account-edit-cancel"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="account-edit-save">
                                    {editingId ? 'Update Address' : 'Add Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="delete-modal-overlay" onClick={() => {
                    if (deleteLoading) return;
                    setIsDeleteModalOpen(false);
                    setDeleteTargetId(null);
                }}>
                    <div
                        className="delete-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="delete-modal-header">
                            <h2 className="delete-modal-title">Delete saved address?</h2>
                        </div>
                        <div className="delete-modal-body">
                            <p className="delete-modal-text">
                                Are you sure you want to delete this saved address? This action cannot be
                                undone.
                            </p>
                            <div className="delete-modal-actions">
                                <button
                                    type="button"
                                    className="delete-modal-cancel"
                                    onClick={() => {
                                        if (deleteLoading) return;
                                        setIsDeleteModalOpen(false);
                                        setDeleteTargetId(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="delete-modal-confirm"
                                    onClick={handleConfirmDelete}
                                    disabled={deleteLoading}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewAddress && (
                <div
                    className="delete-modal-overlay"
                    onClick={() => setViewAddress(null)}
                >
                    <div
                        className="address-detail-modal"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="address-detail-header">
                            <h2 className="address-detail-title">Address Details</h2>
                            <button
                                type="button"
                                className="address-detail-close"
                                onClick={() => setViewAddress(null)}
                                aria-label="Close address details"
                            >
                                ×
                            </button>
                        </div>

                        <div className="account-edit-form address-view-details">
                            <div className="field">
                                <label>Full Name</label>
                                <div>{viewAddress.first_name} {viewAddress.last_name}</div>
                            </div>

                            <div className="field">
                                <label>Phone Number</label>
                                <div>{viewAddress.phone}</div>
                            </div>

                            <div className="field">
                                <label>Region</label>
                                <div>{regionNames[viewAddress.region] || viewAddress.region}</div>
                            </div>

                            <div className="field">
                                <label>Province</label>
                                <div>{provinceNames[viewAddress.province] || viewAddress.province}</div>
                            </div>

                            <div className="field">
                                <label>City</label>
                                <div>{cityNames[viewAddress.city] || viewAddress.city}</div>
                            </div>

                            <div className="field">
                                <label>Barangay</label>
                                <div>{barangayNames[viewAddress.barangay] || viewAddress.barangay}</div>
                            </div>

                            <div className="field address-detail-span">
                                <label>Street Address</label>
                                <div>{viewAddress.street_address}</div>
                            </div>

                            {viewAddress.building_name && (
                                <div className="field">
                                    <label>Building Name</label>
                                    <div>{viewAddress.building_name}</div>
                                </div>
                            )}

                            {viewAddress.unit_floor && (
                                <div className="field">
                                    <label>Unit/Floor</label>
                                    <div>{viewAddress.unit_floor}</div>
                                </div>
                            )}

                            {viewAddress.postal_code && (
                                <div className="field">
                                    <label>Postal Code</label>
                                    <div>{viewAddress.postal_code}</div>
                                </div>
                            )}

                            {viewAddress.notes && (
                                <div className="field address-detail-span">
                                    <label>Delivery Notes</label>
                                    <div>{viewAddress.notes}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
