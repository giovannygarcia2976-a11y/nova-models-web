const APPLICATIONS_KEY = 'nova_models_applications';
const PAYMENTS_KEY = 'nova_models_payments';
const GALLERY_KEY = 'nova_models_gallery';

// Purge legacy mock test data if present in localStorage
try {
  const storedApps = localStorage.getItem(APPLICATIONS_KEY);
  if (!storedApps || storedApps.includes('Elena Rostova')) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([]));
  }

  const storedGal = localStorage.getItem(GALLERY_KEY);
  if (!storedGal || storedGal.includes('GAL-110') || storedGal.includes('Retrato Editorial Nova Models')) {
    localStorage.setItem(GALLERY_KEY, JSON.stringify([]));
  }
} catch (e) {
  console.warn('[Store] LocalStorage access error:', e);
}

const DEFAULT_GALLERY = [];

// Applications API
export function getApplications() {
  const data = localStorage.getItem(APPLICATIONS_KEY);
  if (!data) {
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function addApplication(appData) {
  const current = getApplications();
  const newApp = {
    id: `NM-${new Date().getFullYear()}-${String(current.length + 1).padStart(3, '0')}`,
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Pendiente',
    fotoUrl: appData.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    notas: 'Postulación en línea desde la Landing Page.',
    ...appData
  };
  const updated = [newApp, ...current];
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
  return newApp;
}

export function updateApplicationStatus(id, newStatus) {
  const current = getApplications();
  const updated = current.map(app => app.id === id ? { ...app, estado: newStatus } : app);
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteApplication(id) {
  const current = getApplications();
  const updated = current.filter(app => app.id !== id);
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(updated));
  return updated;
}

// Payments API
export function getPayments() {
  const data = localStorage.getItem(PAYMENTS_KEY);
  if (!data) {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([]));
    return [];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function addPayment(paymentData) {
  const current = getPayments();
  const newPay = {
    id: `PAY-2026-${String(current.length + 101).padStart(3, '0')}`,
    fecha: new Date().toISOString().split('T')[0],
    estado: paymentData.estado || 'Pagado',
    ...paymentData
  };
  const updated = [newPay, ...current];
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(updated));
  return newPay;
}

export function deletePayment(id) {
  const current = getPayments();
  const updated = current.filter(pay => pay.id !== id);
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(updated));
  return updated;
}

let inMemoryGallery = null;

// Gallery / Portfolio API
export function getGallery() {
  if (inMemoryGallery !== null) return inMemoryGallery;

  const data = localStorage.getItem(GALLERY_KEY);
  if (!data) {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify([]));
    } catch (e) {}
    inMemoryGallery = [];
    return inMemoryGallery;
  }
  try {
    inMemoryGallery = JSON.parse(data);
    return inMemoryGallery;
  } catch (e) {
    inMemoryGallery = [];
    return inMemoryGallery;
  }
}

export function getPublicPortfolioPage({ page = 1, limit = 6 } = {}) {
  const allMedia = getGallery();
  const sorted = [...allMedia].sort((a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id.localeCompare(a.id));
  
  const start = 0;
  const end = page * limit;
  const items = sorted.slice(start, end);
  const hasMore = end < sorted.length;
  
  return {
    items,
    hasMore,
    total: sorted.length,
    currentPage: page
  };
}

export function addPortfolioMedia(mediaData) {
  const current = getGallery();
  const newId = `GAL-${String(current.length + 101).padStart(3, '0')}`;
  const newItem = {
    id: newId,
    tipo: mediaData.tipo || 'foto',
    titulo: mediaData.titulo || 'Sin título',
    categoria: mediaData.categoria || 'General',
    url: mediaData.url,
    fecha: new Date().toISOString().split('T')[0]
  };
  inMemoryGallery = [newItem, ...current];
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(inMemoryGallery));
  } catch (e) {
    console.warn('[Store] LocalStorage quota limit reached, media saved in memory session:', e);
  }
  return newItem;
}

export function deletePortfolioMedia(id) {
  const current = getGallery();
  inMemoryGallery = current.filter(item => item.id !== id);
  try {
    localStorage.setItem(GALLERY_KEY, JSON.stringify(inMemoryGallery));
  } catch (e) {}
  return inMemoryGallery;
}
