// Configuration for the backend API base URL
// Uses VITE_API_BASE_URL when set. In development the backend is at localhost:8000/api,
// and in production the backend is served under the same Vercel deployment via /api.
let baseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:8000/api' : '/api');
if (baseUrl && !baseUrl.endsWith('/api') && baseUrl !== '/api') {
  baseUrl = baseUrl.replace(/\/$/, '') + '/api';
}
export const API_BASE_URL = baseUrl;

