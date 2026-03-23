import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

window.Pusher = Pusher;

export function createEchoConnection() {
    const token = window.localStorage.getItem('auth_token');
    const apiBase =
        import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ||
        window.location.origin;
    const scheme =
        import.meta.env.VITE_REVERB_SCHEME === 'https' ? 'https' : 'http';
    const host =
        import.meta.env.VITE_REVERB_HOST?.trim() || window.location.hostname;
    const port = Number(
        import.meta.env.VITE_REVERB_PORT || (scheme === 'https' ? 443 : 80),
    );

    return new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: host,
        wsPort: port,
        wssPort: port,
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: `${apiBase}/api/broadcasting/auth`,
        auth: {
            headers: {
                Accept: 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        },
    });
}
