import { checkAuth, login, logout, getCurrentUser } from './auth.js';
import { API_URL } from './config.js';
import {
  getApplications,
  deleteApplication,
  getPayments,
  addPayment,
  deletePayment,
  getGallery,
  addPortfolioMedia,
  deletePortfolioMedia
} from './store.js';

let currentSearch = '';
let selectedAppId = null;
let deferredPrompt = null;
let currentTab = 'dashboard';
let gallerySelectedFileBase64 = null;
let gallerySelectedFileType = 'foto';

// Custom Delete Modal State
let pendingDeleteId = null;
let pendingDeleteType = 'gallery';

document.addEventListener('DOMContentLoaded', () => {
  // 1. PWA Service Worker Registration
  registerServiceWorker();

  // 2. Security Guard / Auth Initialization
  initAuthGuard();

  // 3. Setup Navigation Controller
  initNavigation();

  // 4. Setup Event Listeners for Modals and Forms
  initFormsAndModals();
});

/* ====================================================
   1. PWA SERVICE WORKER & INSTALL PROMPT
   ==================================================== */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('[PWA] Service Worker registrado con éxito:', reg.scope))
        .catch((err) => console.warn('[PWA] Error al registrar Service Worker:', err));
    });
  }

  const pwaInstallBtn = document.getElementById('pwa-install-btn');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.classList.remove('hidden');
      pwaInstallBtn.classList.add('flex');
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Install prompt outcome: ${outcome}`);
      deferredPrompt = null;
      pwaInstallBtn.classList.add('hidden');
    });
  }
}

/* ====================================================
   2. AUTHENTICATION & SECURITY GATEKEEPER
   ==================================================== */
function initAuthGuard() {
  const loginScreen = document.getElementById('login-screen');
  const adminApp = document.getElementById('admin-app');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  if (checkAuth()) {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (adminApp) adminApp.classList.remove('hidden');
    renderCurrentTab();
  } else {
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (adminApp) adminApp.classList.add('hidden');
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      if (loginError) loginError.classList.add('hidden');

      try {
        await login(email, password);
        if (loginScreen) loginScreen.classList.add('hidden');
        if (adminApp) adminApp.classList.remove('hidden');
        renderCurrentTab();
      } catch (err) {
        if (loginError) {
          loginError.textContent = err.message || 'Error de autenticación.';
          loginError.classList.remove('hidden');
        }
      }
    });
  }

  // Logout Handlers
  const logoutBtnDesktop = document.getElementById('logout-btn-desktop');
  const logoutBtnMobile = document.getElementById('logout-btn-mobile');
  const logoutBtnDrawer = document.getElementById('drawer-logout-btn');

  const handleLogout = () => {
    logout();
    closeMobileDrawer();
    if (adminApp) adminApp.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
  };

  if (logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', handleLogout);
  if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', handleLogout);
  if (logoutBtnDrawer) logoutBtnDrawer.addEventListener('click', handleLogout);
}

/* ====================================================
   3. NAVIGATION CONTROLLER (BOTTOM NAV, SIDEBAR & DRAWER)
   ==================================================== */
function initNavigation() {
  const tabs = ['dashboard', 'inscripciones', 'pagos', 'galeria'];

  tabs.forEach(tab => {
    // Desktop Nav
    const dBtn = document.getElementById(`nav-${tab}`);
    if (dBtn) {
      dBtn.addEventListener('click', () => switchTab(tab));
    }

    // Mobile Bottom Nav
    const mBtn = document.getElementById(`mnav-${tab}`);
    if (mBtn) {
      mBtn.addEventListener('click', () => switchTab(tab));
    }

    // Drawer Nav
    const drawerBtn = document.getElementById(`drawer-nav-${tab}`);
    if (drawerBtn) {
      drawerBtn.addEventListener('click', () => {
        closeMobileDrawer();
        switchTab(tab);
      });
    }
  });

  // Mobile Drawer Toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const drawer = document.getElementById('mobile-nav-drawer');

  if (mobileToggle && drawer) {
    mobileToggle.addEventListener('click', () => {
      drawer.classList.remove('hidden');
    });
  }

  if (closeDrawerBtn && drawer) {
    closeDrawerBtn.addEventListener('click', closeMobileDrawer);
  }

  if (drawer) {
    drawer.addEventListener('click', (e) => {
      if (e.target === drawer) closeMobileDrawer();
    });
  }

  const seeAllApps = document.getElementById('dash-see-all-apps');
  if (seeAllApps) {
    seeAllApps.addEventListener('click', () => switchTab('inscripciones'));
  }
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobile-nav-drawer');
  if (drawer) drawer.classList.add('hidden');
}

function switchTab(tabName) {
  currentTab = tabName;

  // Hide all sections
  ['dashboard', 'inscripciones', 'pagos', 'galeria'].forEach(t => {
    const section = document.getElementById(`section-${t}`);
    if (section) section.classList.add('hidden');

    // Desktop classes
    const dBtn = document.getElementById(`nav-${t}`);
    if (dBtn) dBtn.classList.remove('tab-active-desktop');

    // Mobile classes
    const mBtn = document.getElementById(`mnav-${t}`);
    if (mBtn) mBtn.classList.remove('tab-active-mobile');
  });

  // Show active section
  const activeSection = document.getElementById(`section-${tabName}`);
  if (activeSection) activeSection.classList.remove('hidden');

  const activeDBtn = document.getElementById(`nav-${tabName}`);
  if (activeDBtn) activeDBtn.classList.add('tab-active-desktop');

  const activeMBtn = document.getElementById(`mnav-${tabName}`);
  if (activeMBtn) activeMBtn.classList.add('tab-active-mobile');

  renderCurrentTab();
}

let dbApplicationsCache = [];

async function loadApplicationsFromAPI() {
  try {
    const res = await fetch(`${API_URL}/api/postulaciones`);
    if (res.ok) {
      const data = await res.json();
      dbApplicationsCache = data.map(item => ({
        id: item._id || item.id,
        _id: item._id || item.id,
        nombre: item.nombre || '',
        edad: item.edad || 0,
        telefono: item.telefono || 'N/A',
        email: item.email || 'N/A',
        cedula: item.cedula || 'N/A',
        altura: item.altura || 'N/A',
        ciudad: item.ciudad || 'San Cristóbal, Táchira',
        categoria: item.categoria || 'Nuevos Talentos',
        nombreRepresentante: item.nombreRepresentante,
        emailRepresentante: item.emailRepresentante,
        telefonoRepresentante: item.telefonoRepresentante,
        cedulaRepresentante: item.cedulaRepresentante,
        fotoUrl: item.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
        videoUrl: item.videoUrl || '',
        fecha: item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : 'N/A'
      }));
    }
  } catch (err) {
    console.error('Error al cargar postulaciones desde MongoDB:', err);
  }
  return dbApplicationsCache;
}

async function renderCurrentTab() {
  if (currentTab === 'dashboard') await renderDashboardView();
  if (currentTab === 'inscripciones') await renderApplicationsView();
  if (currentTab === 'pagos') renderPaymentsView();
  if (currentTab === 'galeria') await renderGalleryView();
}

/* ====================================================
   4. DASHBOARD VIEW RENDERER & DYNAMIC METRICS
   ==================================================== */
function formatCurrencyTotal(amount, currency) {
  const val = Number(amount) || 0;
  if (currency === 'VES') {
    return `Bs. ${val.toFixed(2)}`;
  } else if (currency === 'COP') {
    return `${Math.round(val)} COP`;
  } else {
    // Default USD
    return `$${val.toFixed(2)}`;
  }
}

function updateDashboardTotalPayments() {
  const totalPaymentsEl = document.getElementById('dash-total-payments');
  const currencySelect = document.getElementById('dash-currency-select');
  if (!totalPaymentsEl) return;

  const selectedCurrency = currencySelect ? currencySelect.value : 'USD';
  const payments = getPayments();

  const filteredTotal = payments
    .filter(p => {
      const m = p.moneda || 'USD';
      if (selectedCurrency === 'USD') return m === 'USD' || m === 'Dólares';
      if (selectedCurrency === 'VES') return m === 'VES' || m === 'Bolívares';
      if (selectedCurrency === 'COP') return m === 'COP' || m === 'Pesos';
      return false;
    })
    .reduce((sum, p) => sum + Number(p.monto || 0), 0);

  totalPaymentsEl.textContent = formatCurrencyTotal(filteredTotal, selectedCurrency);
}

async function renderDashboardView() {
  const apps = await loadApplicationsFromAPI();

  const totalAppsEl = document.getElementById('dash-total-apps');
  if (totalAppsEl) totalAppsEl.textContent = apps.length;

  updateDashboardTotalPayments();

  const recentList = document.getElementById('dash-recent-list');
  if (recentList) {
    recentList.innerHTML = '';
    const recent = apps.slice(0, 3);
    if (recent.length === 0) {
      recentList.innerHTML = '<div class="text-xs text-[#645d5b] py-2">No hay solicitudes recientes.</div>';
      return;
    }

    recent.forEach(app => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between p-3 bg-[#f9f9f9] rounded-lg border border-[#d1c5b4]';
      div.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${app.fotoUrl}" alt="${app.nombre}" class="w-9 h-9 rounded-full object-cover border border-[#c5a059]" />
          <div>
            <div class="text-xs font-bold text-[#1a1c1c]">${app.nombre}</div>
            <div class="text-[10px] text-[#4e4639]">${app.ciudad} • ${app.categoria || 'Modelos'}</div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-[#645d5b]">${app.fecha}</div>
        </div>
      `;
      recentList.appendChild(div);
    });
  }
}

/* ====================================================
   5. INSCRIPCIONES (POSTULANTES) VIEW RENDERER
   ==================================================== */
async function renderApplicationsView() {
  const cardsContainer = document.getElementById('applications-cards-container');
  const tbody = document.getElementById('applications-table-body');
  const searchInput = document.getElementById('search-input');

  if (searchInput && !searchInput.dataset.initialized) {
    searchInput.dataset.initialized = 'true';
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderApplicationsView();
    });
  }

  const applications = await loadApplicationsFromAPI();
  const filtered = applications.filter(app => {
    return !currentSearch ||
      app.nombre.toLowerCase().includes(currentSearch) ||
      (app.email && app.email.toLowerCase().includes(currentSearch)) ||
      (app.ciudad && app.ciudad.toLowerCase().includes(currentSearch));
  });

  // Render Mobile Cards (< 768px)
  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    if (filtered.length === 0) {
      cardsContainer.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border border-[#d1c5b4] text-[#645d5b] text-xs">No se encontraron postulaciones en MongoDB.</div>`;
    } else {
      filtered.forEach(app => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-[#d1c5b4] space-y-3 shadow-xs';
        card.innerHTML = `
          <div class="flex items-center gap-3">
            <img src="${app.fotoUrl}" alt="${app.nombre}" class="w-12 h-12 rounded-full object-cover border border-[#775a19]" />
            <div class="flex-grow">
              <div class="text-sm font-bold text-[#1a1c1c]">${app.nombre}</div>
              <div class="text-[11px] text-[#4e4639]">${app.ciudad} • ${app.edad} años</div>
            </div>
          </div>
          <div class="text-xs text-[#4e4639] bg-[#f9f9f9] p-2.5 rounded-lg border border-[#d1c5b4] flex justify-between">
            <span>Cat: <strong class="text-[#1a1c1c]">${app.categoria || 'Modelos'}</strong></span>
            <span>Alt: <strong class="text-[#1a1c1c]">${app.altura}</strong></span>
          </div>
          <div class="flex gap-2">
            <button data-id="${app.id}" class="view-detail-btn flex-1 py-3 min-h-[48px] bg-[#f9f9f9] hover:bg-[#fdf2f0] border border-[#d1c5b4] text-xs font-bold uppercase rounded-lg text-[#775a19] transition-all flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-sm">visibility</span> Ver Expediente
            </button>
            <button data-id="${app.id}" class="delete-app-btn px-4 min-h-[48px] bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center justify-center shrink-0" title="Eliminar de MongoDB y Cloudinary">
              <span class="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }
  }

  // Render Desktop Table (>= 768px)
  if (tbody) {
    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-[#645d5b] text-xs">No se encontraron postulaciones en MongoDB.</td></tr>`;
    } else {
      filtered.forEach(app => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-[#f9f9f9] transition-colors border-b border-[#d1c5b4]/60';
        tr.innerHTML = `
          <td class="px-6 py-4 flex items-center gap-3">
            <img src="${app.fotoUrl}" alt="${app.nombre}" class="w-10 h-10 rounded-full object-cover border border-[#c5a059]" />
            <div>
              <div class="font-bold text-[#1a1c1c] text-sm">${app.nombre}</div>
              <div class="text-[10px] text-[#645d5b] font-mono">${app.id}</div>
            </div>
          </td>
          <td class="px-6 py-4">
            <div class="text-[#1a1c1c]">${app.email !== 'N/A' ? app.email : (app.emailRepresentante || 'N/A')}</div>
            <div class="text-[#645d5b] text-[11px]">${app.telefono !== 'N/A' ? app.telefono : (app.telefonoRepresentante || 'N/A')}</div>
          </td>
          <td class="px-6 py-4">
            <div class="text-[#1a1c1c]">${app.altura} • ${app.edad} años</div>
            <div class="text-[#645d5b] text-[11px]">${app.ciudad}</div>
          </td>
          <td class="px-6 py-4 text-[#645d5b] text-[11px]">${app.fecha}</td>
          <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
            <button data-id="${app.id}" class="view-detail-btn px-3 py-1.5 bg-[#f9f9f9] border border-[#d1c5b4] hover:border-[#775a19] text-[#775a19] text-[11px] font-bold uppercase rounded-lg transition-all">
              Detalles
            </button>
            <button data-id="${app.id}" class="delete-app-btn p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all inline-flex items-center justify-center shrink-0 min-h-[34px] min-w-[34px]" title="Eliminar de MongoDB y Cloudinary">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Attach Event Handlers
  document.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDetailModal(id);
    });
  });

  document.querySelectorAll('.delete-app-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      openDeleteConfirmModal(id, 'application');
    });
  });
}


/* ====================================================
   6. CONTROL DE PAGOS VIEW RENDERER (MULTI-CURRENCY & DELETE)
   ==================================================== */
function formatPaymentAmount(monto, moneda) {
  const val = Number(monto) || 0;

  if (moneda === 'Bolívares' || moneda === 'VES') {
    return `Bs. ${val.toFixed(2)}`;
  } else if (moneda === 'Pesos' || moneda === 'COP') {
    return `${Math.round(val)} COP`;
  } else {
    // Default Dólares / USD
    return `$${val.toFixed(2)}`;
  }
}

function renderPaymentsView() {
  const cardsContainer = document.getElementById('payments-cards-container');
  const tbody = document.getElementById('payments-table-body');
  const payments = getPayments();

  // Mobile Cards
  if (cardsContainer) {
    cardsContainer.innerHTML = '';
    if (payments.length === 0) {
      cardsContainer.innerHTML = `<div class="p-8 text-center bg-white rounded-xl border border-[#d1c5b4] text-[#645d5b] text-xs">No hay pagos registrados.</div>`;
    } else {
      payments.forEach(pay => {
        const formattedAmount = formatPaymentAmount(pay.monto, pay.moneda);
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-xl border border-[#d1c5b4] flex justify-between items-center shadow-xs';
        card.innerHTML = `
          <div>
            <div class="text-sm font-bold text-[#1a1c1c]">${pay.modelo}</div>
            <div class="text-xs text-[#775a19] font-semibold mt-0.5">${pay.concepto}</div>
            <div class="text-[10px] text-[#645d5b] mt-1">${pay.metodo} • ${pay.fecha}</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-base font-bold text-[#775a19]">${formattedAmount}</div>
            </div>
            <!-- Red Trash Delete Button -->
            <button data-id="${pay.id}" class="delete-payment-btn p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center justify-center shrink-0 min-h-[38px] min-w-[38px]" title="Eliminar registro de pago">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }
  }

  // Desktop Table
  if (tbody) {
    tbody.innerHTML = '';
    if (payments.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-[#645d5b] text-xs">No hay pagos registrados.</td></tr>`;
    } else {
      payments.forEach(pay => {
        const formattedAmount = formatPaymentAmount(pay.monto, pay.moneda);
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-[#f9f9f9] transition-colors border-b border-[#d1c5b4]/60';
        tr.innerHTML = `
          <td class="px-6 py-4 font-bold text-[#1a1c1c]">${pay.modelo} <span class="block text-[10px] font-mono text-[#645d5b] font-normal">${pay.id}</span></td>
          <td class="px-6 py-4 text-[#775a19] font-semibold">${pay.concepto}</td>
          <td class="px-6 py-4 font-bold text-[#775a19] text-sm">${formattedAmount}</td>
          <td class="px-6 py-4 text-[#1a1c1c] font-semibold">${pay.metodo}</td>
          <td class="px-6 py-4 text-[#645d5b] text-[11px]">${pay.fecha}</td>
          <td class="px-6 py-4 text-right">
            <button data-id="${pay.id}" class="delete-payment-btn p-2 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all inline-flex items-center justify-center min-h-[36px] min-w-[36px]" title="Eliminar registro de pago">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Attach Payment Delete Event Handlers
  document.querySelectorAll('.delete-payment-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openDeleteConfirmModal(id, 'payment');
    });
  });
}

let dbGalleryCache = [];

async function loadGalleryFromAPI() {
  try {
    const res = await fetch(`${API_URL}/api/galeria`);
    if (res.ok) {
      const data = await res.json();
      dbGalleryCache = data.map(item => ({
        id: item._id || item.id,
        _id: item._id || item.id,
        titulo: item.titulo || 'Sin título',
        categoria: item.categoria || 'General',
        tipo: item.tipo || 'foto',
        url: item.url || item.secure_url || item.fotoUrl || item.mediaUrl || '',
        fecha: item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : (item.fecha || 'N/A')
      }));
      return dbGalleryCache;
    }
  } catch (err) {
    console.error('Error al cargar la galería desde MongoDB:', err);
  }
  dbGalleryCache = getGallery();
  return dbGalleryCache;
}

/* ====================================================
   7. GALERÍA Y BOOKS VIEW RENDERER (PHOTOS & VIDEOS)
   ==================================================== */
async function renderGalleryView() {
  const grid = document.getElementById('gallery-grid');
  const items = await loadGalleryFromAPI();

  if (grid) {
    grid.innerHTML = '';
    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 px-6 text-center bg-white rounded-xl border border-[#d1c5b4] flex flex-col items-center justify-center gap-3 shadow-xs">
          <span class="material-symbols-outlined text-4xl text-[#775a19]/70">collections</span>
          <p class="text-sm font-semibold text-[#775a19]">No hay fotos ni videos publicados en la galería.</p>
          <p class="text-xs text-[#645d5b]">Utiliza el botón "Subir Foto / Video" para publicar nuevo contenido al portafolio.</p>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const itemUrl = item.url || item.secure_url || item.fotoUrl || item.mediaUrl || '';
      const isVideo = item.tipo === 'video' || (itemUrl && (itemUrl.match(/\.(mp4|webm|mov|avi|mkv)($|\?|#)/i) || itemUrl.includes('/video/upload/')));
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl overflow-hidden border border-[#d1c5b4] group hover:border-[#775a19] transition-all shadow-xs flex flex-col justify-between';

      let mediaHtml = '';
      if (isVideo) {
        const posterUrl = itemUrl.replace(/\.(mp4|mov|avi|webm|mkv|ogv)($|\?|#)/i, '.jpg$2');
        mediaHtml = `
          <div class="relative h-60 sm:h-64 overflow-hidden bg-black flex items-center justify-center">
            <video src="${itemUrl}" poster="${posterUrl}" controls playsinline preload="metadata" class="w-full h-full object-cover"></video>
            <span class="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-[#c5a059] text-[#e9c176] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider z-10 pointer-events-none">
              🎬 VIDEO
            </span>
          </div>
        `;
      } else {
        mediaHtml = `
          <div class="relative h-60 sm:h-64 overflow-hidden bg-[#f9f9f9] flex items-center justify-center">
            <img src="${itemUrl}" alt="${item.titulo}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-md border border-[#c5a059] text-[#775a19] px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider z-10 pointer-events-none">
              📷 FOTO
            </span>
          </div>
        `;
      }

      card.innerHTML = `
        ${mediaHtml}
        <div class="p-4 flex items-center justify-between gap-3">
          <div class="overflow-hidden">
            <h4 class="text-sm font-bold text-[#1a1c1c] truncate">${item.titulo}</h4>
            <div class="text-[10px] text-[#645d5b] mt-0.5">Fecha: ${item.fecha} • ID: ${item.id}</div>
          </div>
          <!-- Red Trash Delete Button (Custom Modal Trigger) -->
          <button data-id="${item.id}" class="delete-gallery-btn p-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex items-center justify-center shrink-0 min-h-[40px] min-w-[40px]" title="Eliminar publicación">
            <span class="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Attach Custom Delete Modal Handlers
    document.querySelectorAll('.delete-gallery-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openDeleteConfirmModal(id, 'gallery');
      });
    });
  }
}

/* ====================================================
   8. DYNAMIC PAYMENT METHODS SELECTOR
   ==================================================== */
function updatePaymentMethods() {
  const payMonedaSelect = document.getElementById('pay-moneda');
  const payMetodoSelect = document.getElementById('pay-metodo');
  const payMontoInput = document.getElementById('pay-monto');
  const payMontoPrefix = document.getElementById('pay-monto-prefix');
  if (!payMonedaSelect || !payMetodoSelect) return;

  const moneda = payMonedaSelect.value;
  payMetodoSelect.innerHTML = '';

  if (moneda === 'Bolívares') {
    const opt = document.createElement('option');
    opt.value = 'Pago Móvil';
    opt.textContent = 'Pago Móvil';
    payMetodoSelect.appendChild(opt);

    if (payMontoInput) {
      payMontoInput.placeholder = 'Ej: 1500.00';
      payMontoInput.step = '0.01';
    }
    if (payMontoPrefix) payMontoPrefix.textContent = 'Bs.';
  } else if (moneda === 'Pesos') {
    ['Transferencia', 'Efectivo'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      payMetodoSelect.appendChild(opt);
    });

    if (payMontoInput) {
      payMontoInput.placeholder = 'Ej: 100000';
      payMontoInput.step = '1';
    }
    if (payMontoPrefix) payMontoPrefix.textContent = 'COP$';
  } else {
    // Dólares / USD
    ['Zelle', 'Efectivo'].forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      payMetodoSelect.appendChild(opt);
    });

    if (payMontoInput) {
      payMontoInput.placeholder = 'Ej: 25.00';
      payMontoInput.step = '0.01';
    }
    if (payMontoPrefix) payMontoPrefix.textContent = '$';
  }
}

/* ====================================================
   9. MODALS & FORMS HANDLERS
   ==================================================== */
function initFormsAndModals() {
  // Detail Modal
  const detailModal = document.getElementById('detail-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const deleteBtn = document.getElementById('modal-delete-btn');

  if (closeModalBtn && detailModal) {
    closeModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.add('hidden');
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (selectedAppId) {
        openDeleteConfirmModal(selectedAppId, 'application');
      }
    });
  }

  // Dashboard Currency Selector Event Listener
  const dashCurrencySelect = document.getElementById('dash-currency-select');
  if (dashCurrencySelect) {
    dashCurrencySelect.addEventListener('change', updateDashboardTotalPayments);
  }

  // Payment Modal
  const openPayBtn = document.getElementById('open-payment-modal-btn');
  const payModal = document.getElementById('payment-modal');
  const closePayBtn = document.getElementById('close-payment-modal-btn');
  const payForm = document.getElementById('payment-form');
  const payMonedaSelect = document.getElementById('pay-moneda');

  if (payMonedaSelect) {
    payMonedaSelect.addEventListener('change', updatePaymentMethods);
  }

  if (openPayBtn) openPayBtn.addEventListener('click', openPaymentModal);
  if (closePayBtn && payModal) {
    closePayBtn.addEventListener('click', () => payModal.classList.add('hidden'));
    payModal.addEventListener('click', (e) => {
      if (e.target === payModal) payModal.classList.add('hidden');
    });
  }

  if (payForm) {
    payForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const modelo = document.getElementById('pay-modelo').value;
      const concepto = document.getElementById('pay-concepto').value;
      const monto = document.getElementById('pay-monto').value;
      const moneda = document.getElementById('pay-moneda').value;
      const metodo = document.getElementById('pay-metodo').value;

      addPayment({
        modelo,
        concepto,
        monto: Number(monto),
        moneda,
        estado: 'Pagado',
        referencia: '',
        metodo
      });

      payForm.reset();
      updatePaymentMethods();
      if (payModal) payModal.classList.add('hidden');
      renderCurrentTab();
      showAdminToast('Pago registrado correctamente.');
    });
  }

  // Gallery Native File Selector & Form Handling
  const openGalBtn = document.getElementById('open-gallery-modal-btn');
  const galModal = document.getElementById('gallery-modal');
  const closeGalBtn = document.getElementById('close-gallery-modal-btn');
  const galForm = document.getElementById('gallery-form');
  const galFileInput = document.getElementById('gal-file-input');
  const galFilePreviewName = document.getElementById('gal-file-preview-name');
  const galFileNameSpan = document.getElementById('gal-file-name-span');

  if (galFileInput && galFilePreviewName && galFileNameSpan) {
    galFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const isVideo = file.type.startsWith('video') || file.name.toLowerCase().endsWith('.mp4');
        gallerySelectedFileType = isVideo ? 'video' : 'foto';

        const sizeFormatted = file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(0)} KB`;

        galFileNameSpan.textContent = `${isVideo ? '🎬 Video' : '📷 Foto'}: ${file.name} (${sizeFormatted})`;
        galFilePreviewName.classList.remove('hidden');

        // Create Object URL instantly to avoid Base64 5MB localStorage limits for videos
        if (gallerySelectedFileBase64 && gallerySelectedFileBase64.startsWith('blob:')) {
          URL.revokeObjectURL(gallerySelectedFileBase64);
        }
        gallerySelectedFileBase64 = URL.createObjectURL(file);
      } else {
        galFilePreviewName.classList.add('hidden');
        gallerySelectedFileBase64 = null;
        gallerySelectedFileType = 'foto';
      }
    });
  }

  if (openGalBtn) openGalBtn.addEventListener('click', openGalleryModal);
  if (closeGalBtn && galModal) {
    closeGalBtn.addEventListener('click', () => galModal.classList.add('hidden'));
    galModal.addEventListener('click', (e) => {
      if (e.target === galModal) galModal.classList.add('hidden');
    });
  }

  if (galForm) {
    galForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const titulo = document.getElementById('gal-titulo').value.trim();
      const fileInput = document.getElementById('gal-file-input');
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;

      if (!file && !gallerySelectedFileBase64) {
        alert('Por favor selecciona una fotografía o video desde tu dispositivo.');
        return;
      }

      let uploadedUrl = '';
      if (file) {
        try {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: uploadData
          });
          const resJson = await uploadRes.json();
          if (uploadRes.ok && (resJson.secure_url || resJson.url)) {
            uploadedUrl = resJson.secure_url || resJson.url;
          }
        } catch (err) {
          console.error('Error al subir archivo a Cloudinary:', err);
        }
      }

      const finalUrl = uploadedUrl || gallerySelectedFileBase64;
      if (!finalUrl) {
        alert('Ocurrió un error al procesar el archivo.');
        return;
      }

      const mediaPayload = {
        titulo: titulo || 'Sin título',
        categoria: 'General',
        tipo: gallerySelectedFileType,
        url: finalUrl
      };

      try {
        await fetch(`${API_URL}/api/galeria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaPayload)
        });
      } catch (err) {
        console.error('Error al guardar en MongoDB:', err);
      }

      addPortfolioMedia(mediaPayload);

      galForm.reset();
      gallerySelectedFileBase64 = null;
      gallerySelectedFileType = 'foto';
      if (galFilePreviewName) galFilePreviewName.classList.add('hidden');
      if (galModal) galModal.classList.add('hidden');
      await renderGalleryView();
      showAdminToast('Publicación agregada al portafolio.');
    });
  }

  // ----------------------------------------------------
  // CUSTOM DELETE CONFIRMATION MODAL LOGIC
  // ----------------------------------------------------
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

  if (cancelDeleteBtn && deleteConfirmModal) {
    cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
    deleteConfirmModal.addEventListener('click', (e) => {
      if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;

      if (pendingDeleteType === 'gallery') {
        try {
          await fetch(`${API_URL}/api/galeria/${pendingDeleteId}`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.error('Error al eliminar de la API:', err);
        }
        deletePortfolioMedia(pendingDeleteId);
        closeDeleteConfirmModal();
        await renderGalleryView();
        showAdminToast('Publicación eliminada correctamente.');
      } else if (pendingDeleteType === 'payment') {
        deletePayment(pendingDeleteId);
        closeDeleteConfirmModal();
        renderPaymentsView();
        renderDashboardView();
        showAdminToast('Registro de pago eliminado correctamente.');
      } else if (pendingDeleteType === 'application') {
        try {
          const res = await fetch(`${API_URL}/api/postulaciones/${pendingDeleteId}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            closeDeleteConfirmModal();
            const detailModal = document.getElementById('detail-modal');
            if (detailModal) detailModal.classList.add('hidden');
            await renderApplicationsView();
            await renderDashboardView();
            showAdminToast('Inscripción y foto eliminadas de MongoDB y Cloudinary.');
          } else {
            const errData = await res.json();
            alert('Error al eliminar: ' + (errData.error || 'Ocurrió un error'));
          }
        } catch (err) {
          console.error('Error al conectar con la API de eliminación:', err);
          alert('Error de conexión con el servidor al eliminar.');
        }
      }
    });
  }
}

function openDeleteConfirmModal(id, type = 'gallery') {
  pendingDeleteId = id;
  pendingDeleteType = type;

  const modal = document.getElementById('delete-confirm-modal');
  const textEl = document.getElementById('delete-modal-text');

  if (textEl) {
    if (type === 'payment') {
      textEl.textContent = '¿Estás seguro de eliminar este registro de pago?';
    } else if (type === 'gallery') {
      textEl.textContent = '¿Estás seguro de eliminar este elemento?';
    } else {
      textEl.textContent = '¿Estás seguro de eliminar este expediente de MongoDB y Cloudinary?';
    }
  }

  if (modal) modal.classList.remove('hidden');
}

function closeDeleteConfirmModal() {
  pendingDeleteId = null;
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) modal.classList.add('hidden');
}

function showAdminToast(msg) {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('admin-toast-message');
  if (toast && msgEl) {
    msgEl.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3500);
  }
}

function openDetailModal(id) {
  const app = dbApplicationsCache.find(a => a.id === id || a._id === id);
  if (!app) return;

  selectedAppId = app.id || app._id;

  const photo = document.getElementById('modal-photo');
  const name = document.getElementById('modal-name');
  const category = document.getElementById('modal-category');
  const idEl = document.getElementById('modal-id');
  const dateEl = document.getElementById('modal-date');
  const emailEl = document.getElementById('modal-email');
  const phoneEl = document.getElementById('modal-phone');
  const ageEl = document.getElementById('modal-age');
  const heightEl = document.getElementById('modal-height');
  const cityEl = document.getElementById('modal-city');
  const expEl = document.getElementById('modal-exp');

  if (photo) photo.src = app.fotoUrl;
  if (name) name.textContent = app.nombre;
  if (category) category.textContent = app.categoria || 'Modelos';
  if (idEl) idEl.textContent = app.id;
  if (dateEl) dateEl.textContent = app.fecha;
  if (emailEl) emailEl.textContent = app.email !== 'N/A' ? app.email : `Rep: ${app.emailRepresentante || 'N/A'}`;
  if (phoneEl) phoneEl.textContent = app.telefono !== 'N/A' ? app.telefono : `Rep: ${app.telefonoRepresentante || 'N/A'}`;
  if (ageEl) ageEl.textContent = `${app.edad} años`;
  if (heightEl) heightEl.textContent = app.altura;
  if (cityEl) cityEl.textContent = app.ciudad;

  const repContainer = document.getElementById('modal-rep-container');

  if (app.edad >= 18) {
    // Mayor de edad: Ocultar bloque por completo
    if (repContainer) {
      repContainer.classList.add('hidden');
      repContainer.style.display = 'none';
    }
  } else {
    // Menor de edad: Mostrar bloque con datos reales del representante
    if (repContainer) {
      repContainer.classList.remove('hidden');
      repContainer.style.display = 'block';
    }

    if (expEl) {
      let repText = `👤 Nombre: ${app.nombreRepresentante || 'No registrado'}\n🪪 Cédula: ${app.cedulaRepresentante || 'No registrada'}\n📧 Correo: ${app.emailRepresentante || 'No registrado'}\n📱 Teléfono: ${app.telefonoRepresentante || 'No registrado'}`;
      if (app.experiencia) {
        repText += `\n\n📌 Experiencia: ${app.experiencia}`;
      }
      expEl.textContent = repText;
    }
  }

  const modal = document.getElementById('detail-modal');
  if (modal) modal.classList.remove('hidden');
}

function openPaymentModal() {
  updatePaymentMethods();
  const modal = document.getElementById('payment-modal');
  if (modal) modal.classList.remove('hidden');
}

function openGalleryModal() {
  const modal = document.getElementById('gallery-modal');
  if (modal) modal.classList.remove('hidden');
}
