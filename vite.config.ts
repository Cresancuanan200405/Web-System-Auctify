import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'resources',
    publicDir: '../public',
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/js',
        },
    },
    build: {
        outDir: '../public/build',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        strictPort: false,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
});
