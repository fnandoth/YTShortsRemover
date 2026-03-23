// ============================================
// YouTube Sin Shorts – Modo Enfoque
// content.js – Eliminación dinámica de Shorts
// ============================================

'use strict';

// Si el usuario navega directamente a /shorts, redirigir a home
function redirectIfShorts() {
  if (window.location.pathname.startsWith('/shorts')) {
    window.location.replace('https://www.youtube.com/');
  }
}

// Selectores de elementos que contienen Shorts
const SHORTS_SELECTORS = [
  // Shelf / secciones completas de shorts
  'ytd-reel-shelf-renderer',
  'ytd-rich-shelf-renderer[is-shorts]',
  'ytm-shorts-lockup-view-model',
  'ytm-shorts-lockup-view-model-v2',

  // Items individuales de shorts
  'ytd-reel-item-renderer',
  'ytd-reel-video-renderer',
  'ytd-shorts-video-renderer',
  'ytd-shorts',

  // Pestaña Shorts en sidebar
  'ytd-guide-entry-renderer:has(a[href="/shorts"])',
  'ytd-mini-guide-entry-renderer:has(a[href="/shorts"])',

  // Chip/filtro Shorts en búsquedas
  'yt-chip-cloud-chip-renderer:has([title="Shorts"])',
];

// Detectar si un elemento es de tipo Shorts
function isShortsElement(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  const tag = el.tagName ? el.tagName.toLowerCase() : '';

  // Tags directos de Shorts
  if ([
    'ytd-reel-shelf-renderer',
    'ytd-reel-item-renderer',
    'ytd-reel-video-renderer',
    'ytd-shorts-video-renderer',
    'ytd-shorts',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
  ].includes(tag)) return true;

  // Shelf que tiene el atributo is-shorts
  if (el.hasAttribute && el.hasAttribute('is-shorts')) return true;

  // Rich section que contiene un shelf de shorts
  if (tag === 'ytd-rich-section-renderer') {
    if (el.querySelector('ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer')) return true;
  }

  // Videos con badge SHORTS
  if (tag === 'ytd-video-renderer' || tag === 'ytd-compact-video-renderer' || tag === 'ytd-grid-video-renderer') {
    if (el.querySelector('[overlay-style="SHORTS"]')) return true;
  }

  // Item section de búsqueda que tiene reels
  if (tag === 'ytd-item-section-renderer') {
    if (el.querySelector('ytd-reel-shelf-renderer')) return true;
  }

  // Sidebar entry con link a /shorts
  if (tag === 'ytd-guide-entry-renderer' || tag === 'ytd-mini-guide-entry-renderer') {
    if (el.querySelector('a[href="/shorts"]')) return true;
  }

  // Chip de filtro "Shorts"
  if (tag === 'yt-chip-cloud-chip-renderer') {
    const title = el.getAttribute('title') || '';
    const text = el.textContent || '';
    if (title === 'Shorts' || text.trim() === 'Shorts') return true;
  }

  return false;
}

// Eliminar un elemento con animación suave
function removeElement(el) {
  if (el._shortsRemoved) return;
  el._shortsRemoved = true;
  el.style.transition = 'opacity 0.2s ease';
  el.style.opacity = '0';
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 200);
}

// Escanear y limpiar el DOM actual
function cleanShorts() {
  // Usar selectores CSS directos donde sea posible
  const directSelectors = [
    'ytd-reel-shelf-renderer',
    'ytd-reel-item-renderer',
    'ytd-reel-video-renderer',
    'ytd-shorts-video-renderer',
    'ytd-shorts',
    'ytm-shorts-lockup-view-model',
    'ytm-shorts-lockup-view-model-v2',
    '[is-shorts]',
  ];

  directSelectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(el => {
        // Subir al contenedor padre si es necesario
        let target = el;
        const parent = el.parentElement;
        if (parent) {
          const parentTag = parent.tagName ? parent.tagName.toLowerCase() : '';
          if (['ytd-rich-section-renderer', 'ytd-item-section-renderer'].includes(parentTag)) {
            target = parent;
          }
        }
        removeElement(target);
      });
    } catch (e) {
      // :has() no soportado en algunos entornos – ignorar
    }
  });

  // Limpiar thumbnails con badge SHORTS
  document.querySelectorAll('[overlay-style="SHORTS"]').forEach(badge => {
    let target = badge;
    // Subir hasta ytd-video-renderer o ytd-compact-video-renderer
    for (let i = 0; i < 8; i++) {
      if (!target.parentElement) break;
      target = target.parentElement;
      const t = target.tagName ? target.tagName.toLowerCase() : '';
      if (['ytd-video-renderer', 'ytd-compact-video-renderer', 'ytd-grid-video-renderer', 'ytd-rich-item-renderer'].includes(t)) {
        removeElement(target);
        break;
      }
    }
  });

  // Pestaña Shorts en sidebar
  document.querySelectorAll('a[href="/shorts"]').forEach(link => {
    let target = link;
    for (let i = 0; i < 4; i++) {
      if (!target.parentElement) break;
      target = target.parentElement;
      const t = target.tagName ? target.tagName.toLowerCase() : '';
      if (['ytd-guide-entry-renderer', 'ytd-mini-guide-entry-renderer'].includes(t)) {
        removeElement(target);
        break;
      }
    }
  });

  // Chip "Shorts" en filtros
  document.querySelectorAll('yt-chip-cloud-chip-renderer').forEach(chip => {
    const text = (chip.textContent || '').trim();
    if (text === 'Shorts') removeElement(chip);
  });
}

// Observer para detectar nuevos elementos añadidos dinámicamente
const observer = new MutationObserver((mutations) => {
  redirectIfShorts();

  let shouldClean = false;
  for (const mutation of mutations) {
    if (mutation.addedNodes.length > 0) {
      shouldClean = true;
      break;
    }
  }

  if (shouldClean) {
    // Debounce para no ejecutar demasiado seguido
    if (observer._timer) clearTimeout(observer._timer);
    observer._timer = setTimeout(cleanShorts, 100);
  }
});

// Iniciar
function init() {
  redirectIfShorts();
  cleanShorts();

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// YouTube usa History API para navegación SPA
const originalPushState = history.pushState;
history.pushState = function (...args) {
  originalPushState.apply(this, args);
  redirectIfShorts();
  setTimeout(cleanShorts, 300);
};

window.addEventListener('popstate', () => {
  redirectIfShorts();
  setTimeout(cleanShorts, 300);
});
