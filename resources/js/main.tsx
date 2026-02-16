import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/app.css';
import { AppRoot } from './app-root';

const rootElement = document.getElementById('root');

if (rootElement) {
    const root = createRoot(rootElement);

    root.render(
        <StrictMode>
            <AppRoot />
        </StrictMode>,
    );
}
