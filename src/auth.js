const AUTH_TOKEN_KEY = 'nova_admin_token';
const AUTH_USER_KEY = 'nova_admin_user';

// Valid administrator credentials
const VALID_USER = 'Omaris0507';
const VALID_PASS = 'Oma05072007';

export function checkAuth() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token expired (mock 24h expiration)
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      logout();
      return false;
    }
    return true;
  } catch (e) {
    logout();
    return false;
  }
}

export function getCurrentUser() {
  const userData = localStorage.getItem(AUTH_USER_KEY);
  if (!userData) return null;
  try {
    return JSON.parse(userData);
  } catch (e) {
    return null;
  }
}

export function login(usernameInput, password) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const inputTrimmed = usernameInput ? usernameInput.trim().toLowerCase() : '';
      const validUserTrimmed = VALID_USER.toLowerCase();

      if ((inputTrimmed === validUserTrimmed || inputTrimmed === 'admin@novamodels.com') && password === VALID_PASS) {
        // Generate mock JWT token
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
          sub: 'admin_1',
          name: 'Omaris Sanabria',
          username: VALID_USER,
          role: 'Administrator',
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }));
        const signature = btoa('nova_signature_hash_2026');
        const token = `${header}.${payload}.${signature}`;

        const user = {
          id: 'admin_1',
          name: 'Omaris Sanabria',
          username: VALID_USER,
          role: 'Directora General'
        };

        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        resolve({ success: true, user, token });
      } else {
        reject(new Error('Usuario o contraseña incorrectos.'));
      }
    }, 400);
  });
}

export function logout() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
