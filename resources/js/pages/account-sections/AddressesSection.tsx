import React, { useState, useEffect, FormEvent } from 'react';
import { addressService } from '../../services/api';
import { getRegions, getProvinces, getCities, getBarangays } from '../../services/psgc';
import { Address, Region, Province, City, Barangay } from '../../types';
import { InputField, SelectField, Button, Modal } from '../../components/UI';
import { toast } from 'react-toastify';

export const AddressesSection: React.FC = () => {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
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

    useEffect(() => {
        loadAddresses();
        loadRegions();
    }, []);

    const persistAddresses = (list: Address[]) => {
        const mapped = list.map((address) => ({
            id: address.id,
            firstName: address.first_name,
            lastName: address.last_name,
            phone: address.phone,
            region: address.region,
            province: address.province,
            city: address.city,
            barangay: address.barangay,
            street: address.street_address,
            houseNo: address.building_name || ''
        }));
        localStorage.setItem('saved_addresses', JSON.stringify(mapped));
    };

    const loadAddresses = async () => {
        try {
            const data = await addressService.getAddresses();
            setAddresses(data);
            persistAddresses(data);
        } catch (error) {
            console.error('Failed to load addresses:', error);
        }
    };

    const loadRegions = async () => {
        try {
            const data = await getRegions();
            setRegions(data);
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

    const openEditModal = (address: Address) => {
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
        setLoading(true);

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
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to save address';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this address?')) return;

        try {
            await addressService.deleteAddress(id);
            const updated = addresses.filter(a => a.id !== id);
            setAddresses(updated);
            persistAddresses(updated);
            toast.success('Address deleted successfully!');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Failed to delete address';
            toast.error(errorMessage);
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
                            <div key={address.id} className="address-card">
                                <div className="address-card-header">
                                    <div className="address-card-name">
                                        {address.first_name} {address.last_name}
                                    </div>
                                    <div className="address-card-actions">
                                        <button
                                            type="button"
                                            className="address-card-edit"
                                            onClick={() => openEditModal(address)}
                                            aria-label="Edit address"
                                        >
                                            <img src="/icons/edit.png" alt="Edit" />
                                        </button>
                                        <button
                                            type="button"
                                            className="address-card-delete"
                                            onClick={() => handleDelete(address.id)}
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
                                    {address.barangay}, {address.city}
                                    <br />
                                    {address.province}, {address.region}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="addresses-add-button" onClick={openAddModal}>
                        Add New Address
                    </button>
                </>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Edit Address' : 'Add New Address'}
            >
                <form onSubmit={handleSubmit} className="address-form">
                    <InputField
                        label="First Name *"
                        value={firstName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                        required
                    />
                    <InputField
                        label="Last Name *"
                        value={lastName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                        required
                    />
                    <InputField
                        label="Phone Number *"
                        value={phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                        required
                    />
                    
                    <SelectField
                        label="Region *"
                        value={selectedRegion}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRegionChange(e.target.value)}
                        required
                    >
                        <option value="">Select Region</option>
                        {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                    </SelectField>

                    <SelectField
                        label="Province *"
                        value={selectedProvince}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleProvinceChange(e.target.value)}
                        required
                        disabled={!selectedRegion}
                    >
                        <option value="">Select Province</option>
                        {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                    </SelectField>

                    <SelectField
                        label="City *"
                        value={selectedCity}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleCityChange(e.target.value)}
                        required
                        disabled={!selectedProvince}
                    >
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </SelectField>

                    <SelectField
                        label="Barangay *"
                        value={selectedBarangay}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedBarangay(e.target.value)}
                        required
                        disabled={!selectedCity}
                    >
                        <option value="">Select Barangay</option>
                        {barangays.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </SelectField>

                    <InputField
                        label="Street Address *"
                        value={streetAddress}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStreetAddress(e.target.value)}
                        required
                    />
                    <InputField
                        label="Building Name (optional)"
                        value={buildingName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBuildingName(e.target.value)}
                    />
                    <InputField
                        label="Unit/Floor (optional)"
                        value={unitFloor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUnitFloor(e.target.value)}
                    />
                    <InputField
                        label="Postal Code (optional)"
                        value={postalCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPostalCode(e.target.value)}
                    />
                    <InputField
                        label="Delivery Notes (optional)"
                        value={notes}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                    />

                    <div className="modal-actions">
                        <Button type="submit" variant="primary" isLoading={loading}>
                            {editingId ? 'Update Address' : 'Add Address'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
