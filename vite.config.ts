import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    root: 'resources',
    publicDir: '../public',
    base: command === 'serve' ? '/' : '/build/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/js',
        },
    },
    build: {
        outDir: '../public/build',
        emptyOutDir: true,
        copyPublicDir: false,
        chunkSizeWarningLimit: 800,
    },
    server: {
        port: 5173,
        strictPort: false,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            },
        },
    },
}));
