# Auctify - Restructured Project Documentation

## 📁 Project Structure

The project has been completely reorganized into a modular, maintainable architecture. Here's the new structure:

```
resources/js/
├── App.tsx                          # Main application component
├── main.tsx                         # Entry point
│
├── types/
│   └── index.ts                     # TypeScript type definitions
│
├── contexts/
│   └── AuthContext.tsx              # Authentication context provider
│
├── hooks/
│   ├── useLocalStorage.ts           # LocalStorage management hooks
│   └── useCards.ts                  # Card management hooks
│
├── services/
│   ├── api.ts                       # Backend API services
│   └── psgc.ts                      # PSGC location API services
│
├── utils/
│   └── helpers.ts                   # Utility functions
│
├── components/
│   ├── Header.tsx                   # Top navigation header
│   ├── AccountSidebar.tsx           # Account section sidebar
│   ├── CardDisplay.tsx              # Card display components
│   └── UI.tsx                       # Reusable UI components
│
├── pages/
│   ├── HomePage.tsx                 # Landing/home page
│   ├── LoginPage.tsx                # Login page
│   ├── RegisterPage.tsx             # Registration page
│   ├── AccountPage.tsx              # Account container
│   │
│   └── account/                     # Account section components
│       ├── DetailsSection.tsx       # Profile details
│       ├── PasswordSection.tsx      # Password management
│       ├── AddressesSection.tsx     # Address management
│       ├── PreferencesSection.tsx   # User preferences
│       ├── WalletSection.tsx        # Wallet display
│       ├── MyCardsSection.tsx       # Card management
│       └── ZVIPSection.tsx          # ZVIP membership
│
└── api/
    └── client.ts                    # Axios API client
```

---

## 🎯 Key Features of the New Structure

### **1. Separation of Concerns**
- **Types**: All TypeScript interfaces centralized in `types/index.ts`
- **Context**: Global state management (Auth) in `contexts/`
- **Hooks**: Reusable logic extracted to custom hooks
- **Services**: API calls separated from components
- **Utils**: Helper functions for formatting, validation, etc.
- **Components**: Reusable UI components
- **Pages**: Complete page views

### **2. Component Organization**

#### **Layout Components**
- `Header.tsx` - Top navigation with dropdowns, search, bag
- `AccountSidebar.tsx` - Account navigation sidebar

#### **Feature Components**
- `CardDisplay.tsx` - Card display with gradients and logos
- `UI.tsx` - Button, Input, Select, Modal, Spinner components

#### **Page Components**
- `HomePage.tsx` - Landing page with hero, features
- `LoginPage.tsx` - Login form with validation
- `RegisterPage.tsx` - Registration form
- `AccountPage.tsx` - Account container routing sections

#### **Account Section Components**
- `DetailsSection.tsx` - Edit profile name/email
- `PasswordSection.tsx` - Change password
- `AddressesSection.tsx` - CRUD address management (placeholder)
- `PreferencesSection.tsx` - Notification preferences
- `WalletSection.tsx` - Balance display, card selection
- `MyCardsSection.tsx` - Add/delete cards
- `ZVIPSection.tsx` - Membership benefits

---

## 🔧 Custom Hooks

### **useLocalStorage**
Manages localStorage with React state synchronization:
```typescript
const [value, setValue] = useLocalStorage<T>('key', defaultValue);
```

### **usePreference**
Manages individual boolean preferences:
```typescript
const [enabled, setEnabled] = usePreference('notify_email', false);
```

### **useCards**
Complete card management:
```typescript
const {
    savedCards,
    mainCardId,
    addCard,
    deleteCard,
    setMainCardId,
    getMainCard,
    getCardDisplayName,
    getCardLogoPath
} = useCards();
```

---

## 🌐 Services Layer

### **authService**
```typescript
authService.login(credentials)
authService.register(data)
authService.logout()
```

### **userService**
```typescript
userService.updateProfile(data)
userService.changePassword(data)
```

### **addressService**
```typescript
addressService.getAddresses()
addressService.createAddress(address)
addressService.updateAddress(id, address)
addressService.deleteAddress(id)
```

### **psgcService**
```typescript
psgcService.getRegions()
psgcService.getProvinces(regionCode)
psgcService.getCities(provinceCode)
psgcService.getBarangays(cityCode)
```

---

## 🎨 Utility Functions

Located in `utils/helpers.ts`:

- `formatCurrency(amount)` - Format as ₱10,000.00
- `formatDate(dateString)` - Format dates
- `isValidEmail(email)` - Email validation
- `generateId()` - Generate unique IDs
- `maskCardNumber(cardNumber)` - •••• •••• •••• 1234
- `getInitials(name)` - Get user initials

---

## 📦 Context Providers

### **AuthContext**
Provides authentication state and methods:
```typescript
const { authUser, authToken, login, logout, updateUser } = useAuth();
```

---

## 🚀 How to Use the New Structure

### **Adding a New Page**
1. Create component in `pages/YourPage.tsx`
2. Add route case in `App.tsx` `renderContent()`
3. Add ViewMode type in `types/index.ts` if needed

### **Adding a New Account Section**
1. Create component in `pages/account/YourSection.tsx`
2. Add to `AccountPage.tsx` switch statement
3. Add to `AccountSidebar.tsx` menu items
4. Add AccountSection type in `types/index.ts`

### **Creating Reusable Components**
Place in `components/` directory:
```typescript
import React from 'react';

export const YourComponent: React.FC<Props> = ({ prop1, prop2 }) => {
    return <div>...</div>;
};
```

### **Adding API Endpoints**
Add to appropriate service in `services/api.ts`:
```typescript
export const yourService = {
    yourMethod: async () => {
        const response = await apiClient.get('/your-endpoint');
        return response.data;
    }
};
```

---

## 🎯 Benefits of This Structure

1. **Maintainability**: Easy to find and modify specific features
2. **Reusability**: Components and hooks can be reused
3. **Testability**: Isolated units are easier to test
4. **Scalability**: Add new features without touching existing code
5. **Type Safety**: TypeScript interfaces in one place
6. **Performance**: Can implement code-splitting easily
7. **Collaboration**: Multiple developers can work simultaneously

---

## 🔄 Migration Notes

### **From app-root.tsx to New Structure**

The monolithic `app-root.tsx` (~3,630 lines) has been split into:

- **28 new files** organized by function
- **Context providers** for global state
- **Custom hooks** for logic reuse
- **Service layers** for API calls
- **Component library** for UI elements
- **Page components** for views

### **What Stays in app.css**

The CSS file will remain as-is for now, but can be split into:
- `css/layout.css` - Layout and grid
- `css/components/` - Component-specific styles
- `css/pages/` - Page-specific styles
- `css/variables.css` - CSS variables

---

## 📝 Next Steps

1. **Test the new structure** - Verify all features work
2. **Split CSS files** - Modularize styles (optional)
3. **Implement AddressesSection** - Complete CRUD logic
4. **Add error boundaries** - Better error handling
5. **Implement lazy loading** - Code-splitting for pages
6. **Add unit tests** - Test hooks and utilities
7. **Documentation** - Add JSDoc comments

---

## 🛠 Development Commands

```bash
# Start development server
npm run dev

# Start Laravel backend
php artisan serve

# Run migrations
php artisan migrate

# Build for production
npm run build
```

---

## 📚 File Import Examples

```typescript
// Import types
import type { User, Card, Address } from './types';

// Import context
import { useAuth } from './contexts/AuthContext';

// Import hooks
import { useCards } from './hooks/useCards';
import { useLocalStorage } from './hooks/useLocalStorage';

// Import services
import { authService, userService } from './services/api';

// Import utilities
import { formatCurrency, generateId } from './utils/helpers';

// Import components
import { Button, InputField, Modal } from './components/UI';
import { CardDisplay } from './components/CardDisplay';

// Import pages
import { HomePage } from './pages/HomePage';
import { AccountPage } from './pages/AccountPage';
```

---

## 🎉 Summary

The Auctify project has been restructured from a single monolithic file into a professional, modular architecture following React best practices. This structure provides:

- Clear separation of concerns
- Improved code reusability
- Better type safety with TypeScript
- Easier maintenance and debugging
- Foundation for future scaling

The original `app-root.tsx` can be kept as reference or removed once you've verified that all functionality works correctly in the new structure.
