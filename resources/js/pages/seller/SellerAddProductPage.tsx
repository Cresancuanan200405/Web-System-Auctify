import React, { useState } from 'react';

interface SellerAddProductPageProps {
    onNavigateDashboard: () => void;
}

export const SellerAddProductPage: React.FC<SellerAddProductPageProps> = ({ onNavigateDashboard }) => {
    const [productName, setProductName] = useState('');
    const [category, setCategory] = useState('');
    const [startingPrice, setStartingPrice] = useState('');
    const [description, setDescription] = useState('');

    return (
        <section className="seller-add-page">
            <div className="seller-add-header">
                <h2>Add New Product</h2>
                <button type="button" className="seller-secondary-btn" onClick={onNavigateDashboard}>
                    Back to Dashboard
                </button>
            </div>

            <div className="seller-add-card">
                <div className="seller-add-grid">
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Product Name</label>
                        <input
                            type="text"
                            className="seller-input"
                            placeholder="Enter product name"
                            value={productName}
                            onChange={(event) => setProductName(event.target.value)}
                        />
                    </div>
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Category</label>
                        <input
                            type="text"
                            className="seller-input"
                            placeholder="Enter category"
                            value={category}
                            onChange={(event) => setCategory(event.target.value)}
                        />
                    </div>
                    <div className="seller-input-wrap">
                        <label className="seller-add-label">Starting Price</label>
                        <input
                            type="number"
                            className="seller-input"
                            placeholder="0.00"
                            value={startingPrice}
                            onChange={(event) => setStartingPrice(event.target.value)}
                        />
                    </div>
                    <div className="seller-input-wrap seller-add-grid-full">
                        <label className="seller-add-label">Description</label>
                        <textarea
                            className="seller-textarea"
                            rows={5}
                            placeholder="Describe your item"
                            value={description}
                            onChange={(event) => setDescription(event.target.value)}
                        />
                    </div>
                </div>
                <div className="seller-add-actions">
                    <button type="button" className="seller-ghost-btn" onClick={onNavigateDashboard}>
                        Cancel
                    </button>
                    <button type="button" className="seller-primary-btn">
                        Save Product
                    </button>
                </div>
            </div>
        </section>
    );
};
