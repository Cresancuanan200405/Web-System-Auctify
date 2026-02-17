import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
    children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    isLoading = false,
    children,
    className = '',
    disabled,
    ...props
}) => {
    const variantClasses = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        danger: 'btn-danger'
    };
    
    return (
        <button
            className={`btn ${variantClasses[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <span className="spinner" />}
            {children}
        </button>
    );
};

export const Spinner: React.FC<{ size?: 'small' | 'medium' | 'large' }> = ({ size = 'medium' }) => {
    return <div className={`spinner spinner-${size}`} />;
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
    label,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className="input-group">
            {label && <label className="input-label">{label}</label>}
            <input
                className={`input-field ${error ? 'input-error' : ''} ${className}`}
                {...props}
            />
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    children: React.ReactNode;
}

export const SelectField: React.FC<SelectFieldProps> = ({
    label,
    error,
    className = '',
    children,
    ...props
}) => {
    return (
        <div className="input-group">
            {label && <label className="input-label">{label}</label>}
            <select
                className={`select-field ${error ? 'input-error' : ''} ${className}`}
                {...props}
            >
                {children}
            </select>
            {error && <span className="error-message">{error}</span>}
        </div>
    );
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};
