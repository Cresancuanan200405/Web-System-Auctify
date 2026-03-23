# CSS Structure Guide

This project keeps a single CSS entry file and splits actual rules into section files.

## Entry Point

- `app.css`
    - Imports Google Fonts.
    - Imports section files in fixed order.

## Section Files

- `sections/shell.css`
    - Global tokens and shared shell layout.
    - Header, nav, top-level wrappers.

- `sections/marketplace.css`
    - Home, bag, auction detail, seller store/profile marketplace pages.

- `sections/auth.css`
    - Login, register, auth card and auth form UI.

- `sections/account.css`
    - Account area and sections: wallet, cards, addresses, orders, reviews, seller dashboard/add-product flows.

- `sections/admin.css`
    - Admin login and admin dashboard styles.

## Rules For Future CSS Changes

1. Keep `app.css` import-only. Do not place style blocks there.
2. Add new selectors to the section that matches the feature owner page.
3. If a selector is reused across major areas, place it in `shell.css`.
4. Preserve import order in `app.css` to avoid cascade regressions.
5. Prefer feature prefixes for new selectors (for example `seller-`, `orders-`, `admin-`).

## Quick Checklist Before Commit

1. Check the edited section file for syntax issues.
2. Verify `app.css` imports still point to existing files.
3. Run build/test validation to catch regressions.
