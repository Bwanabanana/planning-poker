// Configuration for API endpoints
// Use relative URLs in development to leverage Vite proxy
export const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : '';
// WebSocket connects through Nginx proxy in production, direct in development
export const WEBSOCKET_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};