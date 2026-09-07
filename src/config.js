export const API_URL = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '')
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3000';

export function optimizeCloudinaryUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('/upload/') && !url.includes('/upload/q_auto,f_auto,w_800/')) {
    return url.replace('/upload/', '/upload/q_auto,f_auto,w_800/');
  }
  return url;
}

