/**
 * API configuration from environment variables.
 * In development, Vite proxy forwards /api to the backend.
 */
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
