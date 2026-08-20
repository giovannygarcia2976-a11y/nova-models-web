import { addApplication, getPublicPortfolioPage } from './store.js';
import { API_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
  // Mobile drawer menu toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // ----------------------------------------------------
  // PUBLIC PORTFOLIO GALLERY PAGINATION & MIXED MEDIA
  // ----------------------------------------------------
  const publicGrid = document.getElementById('public-gallery-grid');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const loadMoreContainer = document.getElementById('load-more-container');
  let currentPortfolioPage = 1;

  if (publicGrid) {
    initPublicGallery();
  }

  function initPublicGallery() {
    currentPortfolioPage = 1;
    renderPublicGalleryPage(currentPortfolioPage);

    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        currentPortfolioPage++;
        renderPublicGalleryPage(currentPortfolioPage);
      });
    }
  }

  async function renderPublicGalleryPage(page) {
    let items = [];
    let hasMore = false;

    try {
      const res = await fetch(`${API_URL}/api/galeria`);
      if (res.ok) {
        const data = await res.json();
        items = data.map(item => ({
          id: item._id || item.id,
          titulo: item.titulo || 'Sin título',
          tipo: item.tipo || 'foto',
          url: item.url || item.secure_url || item.fotoUrl || item.mediaUrl || ''
        }));
      }
    } catch (err) {
      console.warn('Cargando galería local fallback:', err);
    }

    if (!items || items.length === 0) {
      const localResult = getPublicPortfolioPage({ page, limit: 6 });
      items = localResult.items;
      hasMore = localResult.hasMore;
    }

    publicGrid.innerHTML = '';
    if (!items || items.length === 0) {
      publicGrid.innerHTML = `
        <div class="col-span-full py-16 px-6 text-center bg-white/80 rounded-xl border border-[#d1c5b4] flex flex-col items-center justify-center gap-3 shadow-xs">
          <span class="material-symbols-outlined text-4xl text-[#775a19]/70">collections</span>
          <p class="text-sm font-semibold text-[#775a19]">No hay fotos ni videos publicados en la galería.</p>
          <p class="text-xs text-[#645d5b]">Vuelve pronto para ver nuestras últimas producciones y books.</p>
        </div>
      `;
      if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
      return;
    }

    items.forEach(item => {
      const itemUrl = item.url || item.secure_url || item.fotoUrl || item.mediaUrl || '';
      const isVideo = item.tipo === 'video' || (itemUrl && (itemUrl.match(/\.(mp4|webm|mov|avi|mkv)($|\?|#)/i) || itemUrl.includes('/video/upload/')));

      const card = document.createElement('div');

      if (isVideo) {
        const posterUrl = itemUrl.replace(/\.(mp4|mov|avi|webm|mkv|ogv)($|\?|#)/i, '.jpg$2');

        card.className = 'relative group overflow-hidden rounded-xl bg-black shadow-xs border border-[#d1c5b4] cursor-pointer aspect-[3/4] flex items-center justify-center video-item';
        card.dataset.mediaType = 'video';
        card.dataset.videoUrl = itemUrl;
        card.dataset.title = item.titulo;

        card.innerHTML = `
          <video src="${itemUrl}" poster="${posterUrl}" controls preload="metadata" playsinline class="w-full h-full object-cover"></video>
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-85 group-hover:opacity-95 transition-opacity pointer-events-none"></div>
          
          <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white pointer-events-none z-10">
            <h3 class="font-headline-md text-base sm:text-lg font-bold text-white truncate drop-shadow-sm">${item.titulo}</h3>
          </div>
        `;
      } else {
        card.className = 'relative group overflow-hidden rounded-xl bg-white shadow-xs border border-[#d1c5b4] cursor-pointer aspect-[3/4] image-item';
        card.dataset.mediaType = 'image';
        card.dataset.imageUrl = itemUrl;
        card.dataset.title = item.titulo;

        card.innerHTML = `
          <img src="${itemUrl}" alt="${item.titulo}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-85 group-hover:opacity-95 transition-opacity pointer-events-none"></div>
          
          <div class="absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white pointer-events-none z-10">
            <h3 class="font-headline-md text-base sm:text-lg font-bold text-white truncate drop-shadow-sm">${item.titulo}</h3>
          </div>
        `;
      }

      publicGrid.appendChild(card);
    });

    if (loadMoreContainer) {
      loadMoreContainer.style.display = hasMore ? 'flex' : 'none';
      if (!hasMore) loadMoreContainer.classList.add('hidden');
      else loadMoreContainer.classList.remove('hidden');
    }
  }

  // ----------------------------------------------------
  // FILE UPLOAD PREVIEW & REMOVAL FOR REGISTRATION FORM
  // ----------------------------------------------------
  const fotoFileInput = document.getElementById('fotoFile');
  const dropZonePrompt = document.getElementById('drop-zone-prompt');
  const dropZonePreview = document.getElementById('drop-zone-preview');
  const fotoPreviewImg = document.getElementById('foto-preview-img');
  const removeFotoBtn = document.getElementById('remove-foto-btn');
  let selectedFileBase64 = null;
  let selectedFileObjectUrl = null;

  function resetFotoUploadState() {
    if (selectedFileObjectUrl) {
      URL.revokeObjectURL(selectedFileObjectUrl);
      selectedFileObjectUrl = null;
    }
    selectedFileBase64 = null;
    if (fotoFileInput) {
      fotoFileInput.value = '';
      fotoFileInput.style.pointerEvents = 'auto';
    }
    if (fotoPreviewImg) {
      fotoPreviewImg.src = '';
    }
    if (dropZonePreview) {
      dropZonePreview.classList.add('hidden');
      dropZonePreview.style.display = 'none';
    }
    if (dropZonePrompt) {
      dropZonePrompt.classList.remove('hidden');
      dropZonePrompt.style.display = 'flex';
    }
  }

  if (fotoFileInput) {
    fotoFileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];

        // Garantizar estrictamente que sea una imagen
        if (!file.type.startsWith('image/')) {
          alert('Por favor selecciona únicamente un archivo de imagen (JPG, PNG o WEBP).');
          resetFotoUploadState();
          return;
        }

        if (selectedFileObjectUrl) {
          URL.revokeObjectURL(selectedFileObjectUrl);
        }

        selectedFileObjectUrl = URL.createObjectURL(file);

        if (fotoPreviewImg) {
          fotoPreviewImg.src = selectedFileObjectUrl;
          fotoPreviewImg.style.maxHeight = '250px';
          fotoPreviewImg.style.width = 'auto';
          fotoPreviewImg.style.objectFit = 'contain';
          fotoPreviewImg.style.marginBottom = '15px';
        }

        // Ocultar icono y textos iniciales de la zona de carga
        if (dropZonePrompt) {
          dropZonePrompt.classList.add('hidden');
          dropZonePrompt.style.display = 'none';
        }

        // Mostrar únicamente la miniatura centrada con el botón eliminar
        if (dropZonePreview) {
          dropZonePreview.classList.remove('hidden');
          dropZonePreview.style.display = 'flex';
          dropZonePreview.style.flexDirection = 'column';
          dropZonePreview.style.alignItems = 'center';
          dropZonePreview.style.justifyContent = 'center';
        }

        // Desactivar temporalmente pointer-events del input flotante para permitir hacer clic en el botón de eliminar
        fotoFileInput.style.pointerEvents = 'none';

        // Cargar Base64 de respaldo
        const reader = new FileReader();
        reader.onload = (event) => {
          selectedFileBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        resetFotoUploadState();
      }
    });
  }

  if (removeFotoBtn) {
    removeFotoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetFotoUploadState();
    });
  }

  // Dynamic Age Form Visibility Logic
  const edadInput = document.getElementById('edad');
  const containerEmail = document.getElementById('container-email');
  const emailInput = document.getElementById('email');
  const containerTelefono = document.getElementById('container-telefono');
  const telefonoInput = document.getElementById('telefono');
  const containerCedula = document.getElementById('container-cedula');
  const cedulaInput = document.getElementById('cedula');
  const seccionRepresentante = document.getElementById('seccion-representante');

  const repInputs = [
    document.getElementById('nombreRepresentante'),
    document.getElementById('emailRepresentante'),
    document.getElementById('telefonoRepresentante'),
    document.getElementById('cedulaRepresentante')
  ];

  function setVisible(element, inputElement, show) {
    if (!element) return;
    if (show) {
      element.classList.remove('hidden');
      if (inputElement) inputElement.setAttribute('required', 'true');
    } else {
      element.classList.add('hidden');
      if (inputElement) inputElement.removeAttribute('required');
    }
  }

  function setSectionVisible(section, show) {
    if (!section) return;
    if (show) {
      section.classList.remove('hidden');
      repInputs.forEach(input => {
        if (input) input.setAttribute('required', 'true');
      });
    } else {
      section.classList.add('hidden');
      repInputs.forEach(input => {
        if (input) input.removeAttribute('required');
      });
    }
  }

  function updateDynamicForm() {
    if (!edadInput) return;
    const val = edadInput.value.trim();
    if (val === '') {
      setVisible(containerEmail, emailInput, true);
      setVisible(containerTelefono, telefonoInput, true);
      setVisible(containerCedula, cedulaInput, true);
      setSectionVisible(seccionRepresentante, false);
      return;
    }

    const edad = parseInt(val, 10);
    if (isNaN(edad)) return;

    if (edad >= 18) {
      setVisible(containerEmail, emailInput, true);
      setVisible(containerTelefono, telefonoInput, true);
      setVisible(containerCedula, cedulaInput, true);
      setSectionVisible(seccionRepresentante, false);
    } else if (edad >= 9 && edad < 18) {
      setVisible(containerEmail, emailInput, false);
      setVisible(containerTelefono, telefonoInput, false);
      setVisible(containerCedula, cedulaInput, true);
      setSectionVisible(seccionRepresentante, true);
    } else {
      setVisible(containerEmail, emailInput, false);
      setVisible(containerTelefono, telefonoInput, false);
      setVisible(containerCedula, cedulaInput, false);
      setSectionVisible(seccionRepresentante, true);
    }
  }

  if (edadInput) {
    edadInput.addEventListener('input', updateDynamicForm);
    edadInput.addEventListener('change', updateDynamicForm);
    updateDynamicForm();
  }

  // ----------------------------------------------------
  // DUAL ACTION REGISTRATION FORM SUBMISSION
  // 1. Save photo & data to backend database
  // 2. Build WhatsApp message & redirect to +58 424 7337242
  // ----------------------------------------------------
  const regForm = document.getElementById('registration-form');
  const toast = document.getElementById('toast');

  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(regForm);

      const nombre = formData.get('nombre') ? formData.get('nombre').toString().trim() : '';
      const edad = parseInt(formData.get('edad'), 10) || 0;
      const altura = formData.get('altura') ? formData.get('altura').toString().trim() : '';
      const email = formData.get('email') ? formData.get('email').toString().trim() : 'N/A';
      const telefono = formData.get('telefono') ? formData.get('telefono').toString().trim() : 'N/A';
      const cedula = formData.get('cedula') ? formData.get('cedula').toString().trim() : 'N/A';

      const nombreRep = formData.get('nombreRepresentante') ? formData.get('nombreRepresentante').toString().trim() : '';
      const emailRep = formData.get('emailRepresentante') ? formData.get('emailRepresentante').toString().trim() : '';
      const telefonoRep = formData.get('telefonoRepresentante') ? formData.get('telefonoRepresentante').toString().trim() : '';
      const cedulaRep = formData.get('cedulaRepresentante') ? formData.get('cedulaRepresentante').toString().trim() : '';

      const genericErrorMessage = 'Ocurrió un error al procesar tu inscripción. Por favor, verifica tu conexión a internet e intenta de nuevo.';

      const fileInput = document.getElementById('fotoFile');
      const file = fileInput && fileInput.files ? fileInput.files[0] : null;

      let cloudSecureUrl = '';

      // 1. Subida silenciosa de archivo en segundo plano
      if (file) {
        try {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          const uploadResponse = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: uploadFormData
          });

          if (!uploadResponse.ok) {
            alert(genericErrorMessage);
            return;
          }

          const uploadData = await uploadResponse.json();
          if (uploadData && (uploadData.secure_url || uploadData.url)) {
            cloudSecureUrl = uploadData.secure_url || uploadData.url;
          } else {
            alert(genericErrorMessage);
            return;
          }
        } catch {
          alert(genericErrorMessage);
          return;
        }
      }

      // 2. Guardar datos + URL silenciosamente en segundo plano
      const postulationPayload = {
        nombre,
        edad,
        telefono,
        email,
        cedula,
        altura,
        ciudad: 'San Cristóbal, Táchira',
        categoria: 'Nuevos Talentos',
        nombreRepresentante: nombreRep || undefined,
        emailRepresentante: emailRep || undefined,
        telefonoRepresentante: telefonoRep || undefined,
        cedulaRepresentante: cedulaRep || undefined,
        fotoUrl: cloudSecureUrl || selectedFileBase64 || '',
        videoUrl: ''
      };

      let isSavedSuccessfully = false;
      try {
        const dbResponse = await fetch(`${API_URL}/api/postulaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(postulationPayload)
        });

        if (dbResponse.ok) {
          isSavedSuccessfully = true;
        } else {
          alert(genericErrorMessage);
          return;
        }
      } catch {
        alert(genericErrorMessage);
        return;
      }

      // 3. Texto familiar de bienvenida para WhatsApp (Sin URLs de fotos, estrictamente privado)
      if (isSavedSuccessfully) {
        let waMessage = `✨ ¡Hola, equipo de Nova Models! ✨\n\n`;
        waMessage += `Acabo de completar mi inscripción oficial en la página web. ¡Qué emoción formar parte de esta hermosa familia! 💖👠\n\n`;
        waMessage += `Aquí les dejo un resumen de mi registro:\n`;
        waMessage += `👤 Alumna: ${nombre}\n`;
        waMessage += `📆 Edad: ${edad} años\n`;
        waMessage += `📏 Estatura: ${altura}\n`;
        waMessage += `🪪 Cédula: ${cedula || 'N/A'}\n`;

        if (edad < 18) {
          waMessage += `\n👥 DATOS DEL REPRESENTANTE:\n`;
          if (nombreRep) waMessage += `▫️ Nombre: ${nombreRep}\n`;
          if (emailRep) waMessage += `▫️ Correo: ${emailRep}\n`;
          if (telefonoRep) waMessage += `▫️ Teléfono: ${telefonoRep}\n`;
          if (cedulaRep) waMessage += `▫️ Cédula: ${cedulaRep}\n`;
        }

        waMessage += `\n¡Ya estoy lista para comenzar esta hermosa experiencia y dar lo mejor de mí! Quedamos atentos a los siguientes pasos. 🌟`;

        const encodedMessage = encodeURIComponent(waMessage);
        const waUrl = `https://wa.me/584247337242?text=${encodedMessage}`;

        window.open(waUrl, '_blank');
      }

      // Reset form & state de forma silenciosa
      regForm.reset();
      updateDynamicForm();
      resetFotoUploadState();

      if (toast) {
        toast.classList.remove('hidden');
        setTimeout(() => {
          toast.classList.add('hidden');
        }, 4000);
      }
    });
  }

  // ----------------------------------------------------
  // LIGHTBOX / VISTA AMPLIADA GALLERY MODAL
  // ----------------------------------------------------
  initLightbox();
});

function initLightbox() {
  const overlay = document.getElementById('lightbox-overlay');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxVideo = document.getElementById('lightbox-video');
  const caption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');

  if (!overlay) return;

  function openImageLightbox(src, title = '') {
    if (lightboxVideo) {
      lightboxVideo.pause();
      lightboxVideo.src = '';
      lightboxVideo.classList.add('hidden');
    }
    if (lightboxImg) {
      lightboxImg.src = src;
      lightboxImg.alt = title || 'Vista Ampliada';
      lightboxImg.classList.remove('hidden');
    }
    if (caption) caption.textContent = title;

    overlay.classList.remove('hidden');
    // Force reflow for smooth opening transition
    void overlay.offsetWidth;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function openVideoLightbox(src, title = '') {
    if (lightboxImg) {
      lightboxImg.src = '';
      lightboxImg.classList.add('hidden');
    }
    if (lightboxVideo) {
      const posterUrl = src.replace(/\.(mp4|mov|avi|webm|mkv|ogv)($|\?|#)/i, '.jpg$2');
      lightboxVideo.src = src;
      lightboxVideo.poster = posterUrl;
      lightboxVideo.preload = 'metadata';
      lightboxVideo.setAttribute('playsinline', 'true');
      lightboxVideo.setAttribute('controls', 'true');
      lightboxVideo.classList.remove('hidden');
    }
    if (caption) caption.textContent = title;

    overlay.classList.remove('hidden');
    // Force reflow for smooth opening transition
    void overlay.offsetWidth;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.classList.remove('active');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';

    if (lightboxVideo) {
      lightboxVideo.pause();
      setTimeout(() => {
        lightboxVideo.src = '';
      }, 300);
    }
    if (lightboxImg) {
      setTimeout(() => {
        lightboxImg.src = '';
      }, 300);
    }
    if (caption) caption.textContent = '';
  }

  // 1. Close via 'X' button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeLightbox();
    });
  }

  // 2. Close by clicking outside content (on dark backdrop overlay)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === closeBtn || e.target.classList.contains('lightbox-content')) {
      closeLightbox();
    }
  });

  // 3. Close via 'Esc' key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeLightbox();
    }
  });

  // Delegated click handler for media cards (photos & videos)
  document.addEventListener('click', (e) => {
    // Ignore clicks inside open lightbox content itself (so video controls work)
    if (e.target.closest('#lightbox-overlay')) return;

    // Check if clicked element is inside a video card
    const videoCard = e.target.closest('.video-item') || e.target.closest('[data-media-type="video"]');
    if (videoCard) {
      const videoUrl = videoCard.dataset.videoUrl || videoCard.querySelector('video')?.src;
      const title = videoCard.dataset.title || videoCard.querySelector('h3')?.textContent || '';
      if (videoUrl) {
        openVideoLightbox(videoUrl, title);
        return;
      }
    }

    // Check if clicked element is inside a photo card
    const photoCard = e.target.closest('.image-item') || e.target.closest('[data-media-type="image"]') || e.target.closest('#public-gallery-grid img');
    if (photoCard) {
      let imgEl = photoCard.tagName === 'IMG' ? photoCard : photoCard.querySelector('img');
      if (imgEl && imgEl.src) {
        const title = photoCard.dataset.title || photoCard.querySelector('h3')?.textContent || imgEl.alt || '';
        openImageLightbox(imgEl.src, title);
        return;
      }
    }
  });
}
