import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'resources',
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
        strictPort: true,
    },
});
