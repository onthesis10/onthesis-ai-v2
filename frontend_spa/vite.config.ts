import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    base: '/static/js/dist/',
    build: {
        outDir: '../app/static/js/dist',
        emptyOutDir: true,
        cssCodeSplit: false,
        rollupOptions: {
            output: {
                entryFileNames: 'spa-bundle.js',
                chunkFileNames: 'spa-[name].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'spa-style.css';
                    }
                    return 'spa-[name].[ext]';
                }
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
