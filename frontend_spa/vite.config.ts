import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isFastBuild = process.env.FAST_BUILD === '1'

export default defineConfig({
    plugins: [react()],
    define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    },
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
        reportCompressedSize: false,
        chunkSizeWarningLimit: 1400,
        minify: isFastBuild ? false : 'esbuild',
        cssMinify: isFastBuild ? false : true,
        rollupOptions: {
            output: {
                entryFileNames: 'spa-bundle.js',
                chunkFileNames: 'spa-[name]-[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                        return 'spa-style.css';
                    }
                    return 'spa-[name]-[hash].[ext]';
                }
            }
        }
    },
    server: {
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                secure: false,
            }
        }
    }
})
