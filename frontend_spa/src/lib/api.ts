import axios from 'axios';
import toast from 'react-hot-toast';

// Create a configured axios instance
export const api = axios.create({
    baseURL: '', // Empty base URL since we're proxying or same-origin
    headers: {
        'Content-Type': 'application/json',
    },
});

// Optional: Add interceptors for error handling or auth tokens if needed
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            const status = error.response.status;

            // Handle common errors (e.g., 401 Unauthorized)
            if (status === 401) {
                console.warn('Unauthorized access, redirecting to login...');
                // window.location.href = '/login'; // Uncomment if needed
            }
            // Handle Rate Limits (Flask-Limiter)
            else if (status === 429) {
                toast.error('Limit AI tercapai (13 req/min). Mohon tunggu beberapa saat.', {
                    duration: 5000,
                    style: {
                        background: '#1F2937', // Tailwind gray-800
                        color: '#F9FAFB', // Tailwind gray-50
                        borderRadius: '8px',
                        border: '1px solid #374151' // Tailwind gray-700
                    },
                    icon: '⏳',
                });
            }
            // Handle Timeouts and Server Errors from AI provider
            else if (status >= 500) {
                toast.error('Service sedang sibuk/timeout. Silakan coba sebentar lagi.', {
                    duration: 5000,
                    style: {
                        background: '#7F1D1D', // Tailwind red-900
                        color: '#FEF2F2', // Tailwind red-50
                        borderRadius: '8px',
                        border: '1px solid #991B1B' // Tailwind red-800
                    },
                    icon: '🚨',
                });
            }
        } else if (error.request) {
            // No response received (Network timeout/CORS)
            toast.error('Koneksi terputus. Gagal terhubung ke server.', {
                duration: 5000,
                style: {
                    background: '#FEF3C7', // Tailwind amber-100
                    color: '#92400E', // Tailwind amber-900
                    borderRadius: '8px',
                },
                icon: '🔌',
            });
        }

        return Promise.reject(error);
    }
);
