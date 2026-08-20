// Configuración dinámica de la URL del API Backend para Nova Models
export const API_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3000';
