
import axios from 'axios';

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
        // Handle common errors (e.g., 401 Unauthorized)
        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized access, redirecting to login...');
            // window.location.href = '/login'; // Uncomment if needed
        }
        return Promise.reject(error);
    }
);
