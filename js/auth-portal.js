/**
 * Auth Portal - Firebase auth for Ecoexist Monitoring
 * - Email PIN login (same as PWA)
 * - Roles: admin, funder (page-scoped), viewer/user
 *
 * Portal page lists live here only. awt-data.js and road-crossings-process.js allow Firebase Bearer for Firestore roles admin, funder, and user only (not viewer).
 * PORTAL_NAV_ITEMS drives sidebars/ribbons; applySidebarNavForUser / applyRibbonNavForUser show only pages the role may access (admin: all; funder: allowedPages; user/viewer: defaults).
 */

/** Same host as login.html — do not use ecoexist-pwa-backend.vercel.app here (CORS). */
const API_BASE = 'https://ecoexist-pwa-backend.vercel.app';

/** Pages funders may be granted (admin excluded). Labels for admin UI — matches portal sidebar order. */
const FUNDER_PAGE_OPTIONS = [
  { value: 'ngo_metrics.html', label: 'NGO impact dashboard' },
  { value: 'dashboard_all_data.html', label: 'Elephant Movement' },
  { value: 'corridor_monitoring.html', label: 'Corridor monitoring' },
  { value: 'hec.html', label: 'HEC' },
  { value: 'lightmap_100m.html', label: 'Light map (100 m)' },
  { value: 'meeting-reports.html', label: 'Meeting reports' },
  { value: 'vehicle-tracker.html', label: 'Vehicle tracker' },
  { value: 'ngamiland-lucis.html', label: 'Ngamiland LUCIS' }
];

const ALLOWED_RETURN_PAGES = FUNDER_PAGE_OPTIONS.map((o) => o.value);

/** Default tool pages for role `user` (Firestore role). */
const USER_ROLE_DEFAULT_PAGES = ['ngo_metrics.html', 'hec.html', 'corridor_monitoring.html', 'ngamiland-lucis.html'];

/**
 * Default tools for role `viewer`. Cumulative wildlife map (dashboard_all_data) is not included:
 * /api/awt-data allows only admin, funder, user — same rule here.
 */
const VIEWER_ROLE_DEFAULT_PAGES = ['lightmap_100m.html'];

function pageFilename(page) {
  if (typeof page !== 'string') return '';
  return page.split('/').pop().split('?')[0].split('#')[0];
}

function portalRole(role) {
  return String(role || '').trim().toLowerCase();
}

function portalHrefForPageKey(pageKey) {
  if (pageKey === 'land_use_conflict.html') return 'kaza/land_use_conflict.html';
  return pageKey;
}

/** Full portal sidebar: seven tools + Admin (Admin link only for admin role; see canAccessPortalPage). */
const PORTAL_NAV_ITEMS = [
  ...FUNDER_PAGE_OPTIONS.map((o) => ({
    href: portalHrefForPageKey(o.value),
    label: o.label,
    pageKey: o.value,
    htmlLabel: o.value === 'lightmap_100m.html'
  })),
  { href: 'admin.html', label: 'Admin', pageKey: 'admin.html', htmlLabel: false }
];

/** @deprecated alias */
const SIDEBAR_NAV_ITEMS = PORTAL_NAV_ITEMS;

/**
 * Public marketing entry is index (no auth). Never use it in role-based redirects or ?return= after login.
 * Legacy `dashboard_public*` pages are not valid post-login targets (bookmarks / referrers ignored).
 */
function sanitizeRoleRedirectTarget(raw) {
  if (raw == null || raw === '') return null;
  const name = pageFilename(String(raw).trim());
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower === 'index' || lower === 'index.html') return null;
  if (lower.startsWith('dashboard_public')) return null;
  return name;
}

/** Map stored Firestore paths (e.g. kaza/foo.html) to canonical FUNDER_PAGE_OPTIONS values. */
function normalizeFunderPagePath(stored) {
  if (typeof stored !== 'string' || !stored) return null;
  const trimmed = stored.trim();
  if (ALLOWED_RETURN_PAGES.includes(trimmed)) return trimmed;
  const base = trimmed.split('/').pop().split('?')[0].split('#')[0];
  if (ALLOWED_RETURN_PAGES.includes(base)) return base;
  return null;
}

function normalizeAllowedPagesList(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const p of raw) {
    const n = normalizeFunderPagePath(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function canonicalPortalPageName(page) {
  if (!page || typeof page !== 'string') return '';
  const n = normalizeFunderPagePath(page);
  if (n) return n;
  return pageFilename(page);
}

function getAccessiblePortalPages(role, allowedPages) {
  const r = portalRole(role);
  const norm = normalizeAllowedPagesList(Array.isArray(allowedPages) ? allowedPages : []);
  if (r === 'admin') {
    return PORTAL_NAV_ITEMS.map((i) => i.pageKey);
  }
  if (r === 'funder') {
    return [...norm];
  }
  if (r === 'user') {
    return [...USER_ROLE_DEFAULT_PAGES];
  }
  if (r === 'viewer') {
    const norm = normalizeAllowedPagesList(Array.isArray(allowedPages) ? allowedPages : []);
    const merged = [...new Set([...VIEWER_ROLE_DEFAULT_PAGES, ...norm])];
    return merged.filter((p) => p !== 'dashboard_all_data.html');
  }
  return [...VIEWER_ROLE_DEFAULT_PAGES];
}

function canAccessPortalPage(role, allowedPages, page) {
  if (portalRole(role) === 'admin') return true;
  const canon = canonicalPortalPageName(page);
  if (canon === 'admin.html') return false;
  const allowedSet = new Set(
    getAccessiblePortalPages(role, allowedPages).map((p) => canonicalPortalPageName(p))
  );
  return allowedSet.has(canon);
}

async function waitForNavContainer(selector, timeoutMs) {
  const max = timeoutMs != null ? timeoutMs : 8000;
  const start = Date.now();
  while (Date.now() - start < max) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 40));
  }
  return null;
}

function ribbonButtonStyle(pageKey) {
  const base = 'padding: 8px 16px; text-decoration: none; border-radius: 4px; color: #fff;';
  if (pageKey === 'dashboard_all_data.html' || pageKey === 'firebasemap.html') {
    return 'background: #2c5530; ' + base;
  }
  if (pageKey === 'vehicle-tracker.html') {
    return 'background: #8e44ad; ' + base;
  }
  if (pageKey === 'firebasemap_1.html' || pageKey === 'road_crossings_firebase.html') {
    return 'background: #555; ' + base;
  }
  if (pageKey === 'map.html') {
    return 'background: #3498db; ' + base;
  }
  if (pageKey === 'user-submissions.html') {
    return 'background: #27ae60; ' + base;
  }
  return 'background: #666; ' + base;
}

function canAccessAdminToolPage(role, allowedPages, page) {
  return canAccessPortalPage(role, allowedPages, page);
}

async function applySidebarNavForUser(options = {}) {
  try {
    await waitForFirebase();
    const u = window.firebasePortal?.auth?.currentUser;
    if (!u) return;
    const access = await getUserAccess(u.uid);
    if (!access) return;
    const { role, allowedPages } = access;
    const currentPage = options.currentPage || pageFilename(window.location.pathname || '');
    const navSelector = options.navSelector || '.app-sidebar-nav';
    const nav = (await waitForNavContainer(navSelector, options.waitMs)) || document.querySelector(navSelector);
    if (!nav) {
      console.warn('applySidebarNavForUser: nav not found', navSelector);
      return;
    }
    nav.innerHTML = '';
    for (const item of PORTAL_NAV_ITEMS) {
      if (!canAccessPortalPage(role, allowedPages, item.pageKey)) continue;
      const a = document.createElement('a');
      a.href = item.href;
      if (item.htmlLabel) a.innerHTML = 'Light map (100&nbsp;m)';
      else a.textContent = item.label;
      if (canonicalPortalPageName(currentPage) === canonicalPortalPageName(item.pageKey)) {
        a.classList.add('app-nav-current');
      }
      nav.appendChild(a);
    }
    const logo = document.querySelector(options.logoSelector || '.app-sidebar-logo');
    if (logo) {
      if (portalRole(role) === 'admin') {
        logo.href = 'dashboard_all_data.html';
      } else if (canAccessPortalPage(role, allowedPages, 'dashboard_all_data.html')) {
        logo.href = 'dashboard_all_data.html';
      } else {
        const first = PORTAL_NAV_ITEMS.find((item) => canAccessPortalPage(role, allowedPages, item.pageKey));
        logo.href = first ? first.href : '#';
      }
    }
  } catch (e) {
    console.warn('applySidebarNavForUser:', e);
  }
}

/** Top ribbon pages (HEC, Ngamiland LUCIS, etc.): `#portal-ribbon-nav` */
async function applyRibbonNavForUser(options = {}) {
  try {
    await waitForFirebase();
    const u = window.firebasePortal?.auth?.currentUser;
    if (!u) return;
    const access = await getUserAccess(u.uid);
    if (!access) return;
    const { role, allowedPages } = access;
    const currentPage = options.currentPage || pageFilename(window.location.pathname || '');
    const ribbonSelector = options.ribbonSelector || '#portal-ribbon-nav';
    const host = (await waitForNavContainer(ribbonSelector, options.waitMs)) || document.querySelector(ribbonSelector);
    if (!host) {
      console.warn('applyRibbonNavForUser: container not found', ribbonSelector);
      return;
    }
    host.innerHTML = '';
    for (const item of PORTAL_NAV_ITEMS) {
      if (!canAccessPortalPage(role, allowedPages, item.pageKey)) continue;
      const a = document.createElement('a');
      a.href = item.href;
      a.className = 'submit-data-btn';
      a.style.cssText = ribbonButtonStyle(item.pageKey);
      if (item.htmlLabel) a.innerHTML = 'Light map (100&nbsp;m)';
      else a.textContent = item.label;
      if (canonicalPortalPageName(currentPage) === canonicalPortalPageName(item.pageKey)) {
        a.style.boxShadow = 'inset 0 0 0 2px #fff';
      }
      host.appendChild(a);
    }
    const so = document.createElement('a');
    so.href = '#';
    so.className = 'submit-data-btn';
    so.style.cssText = ribbonButtonStyle('signout');
    so.textContent = 'Sign Out';
    so.onclick = function () {
      window.firebasePortal?.signOut?.(window.firebasePortal.auth).then(() => {
        location.href = 'login.html';
      });
      return false;
    };
    host.appendChild(so);
  } catch (e) {
    console.warn('applyRibbonNavForUser:', e);
  }
}

async function applyPortalNavigation(options = {}) {
  await applySidebarNavForUser(options);
  await applyRibbonNavForUser(options);
}

async function waitForFirebase(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.firebasePortal?.auth && window.firebasePortal?.db) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Authentication service unavailable. Ensure you\'re using a proper web URL (not file://).'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

/** After waitForFirebase: ensures js/firebase-config.js finished (ES modules) exposing query helpers. */
async function waitForFirestoreQueryHelpers(timeoutMs = 8000) {
  const need = ['getDocs', 'query', 'limit', 'orderBy', 'collection'];
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const fp = window.firebasePortal;
      const ok =
        fp &&
        fp.db &&
        need.every(function (k) {
          return typeof fp[k] === 'function';
        });
      if (ok) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(
          new Error(
            'Firestore query API not loaded. Hard-refresh (cache) or confirm ecoexist-main/js/firebase-config.js exposes getDocs, query, limit, orderBy on window.firebasePortal.'
          )
        );
        return;
      }
      setTimeout(check, 40);
    };
    check();
  });
}

/**
 * @returns {Promise<{ role: string, allowedPages: string[] }|null>} null if revoked
 */
async function getUserAccess(uid) {
  const { db, doc, getDoc } = window.firebasePortal;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return { role: 'viewer', allowedPages: [] };
    }
    const data = userDoc.data();
    if (data.status === 'revoked') return null;
    const raw = data.allowedPages;
    const allowedPages = Array.isArray(raw) ? raw.filter((p) => typeof p === 'string' && p) : [];
    return {
      role: data.role || 'viewer',
      allowedPages
    };
  } catch (e) {
    console.error('Failed to get user access:', e);
    return { role: 'viewer', allowedPages: [] };
  }
}

async function getUserRole(uid) {
  const access = await getUserAccess(uid);
  return access ? access.role : null;
}

async function loginWithPassword(name, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  const { auth, signInWithCustomToken } = window.firebasePortal;
  await signInWithCustomToken(auth, data.customToken);
  return data;
}

async function requestPin(email, name) {
  const res = await fetch(`${API_BASE}/api/auth/request-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to send PIN');
  return data;
}

async function verifyPin(email, pin) {
  const res = await fetch(`${API_BASE}/api/auth/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Invalid PIN');
  return data;
}

async function signInWithPin(email, pin) {
  const data = await verifyPin(email, pin);
  const { auth, signInWithCustomToken, db, doc, getDoc, setDoc, serverTimestamp } = window.firebasePortal;
  await signInWithCustomToken(auth, data.customToken);
  const user = auth.currentUser;
  if (user) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const base = {
        uid: user.uid,
        name: data.name || '',
        email: email.toLowerCase(),
        lastLogin: serverTimestamp()
      };
      await setDoc(userRef, snap.exists() ? base : { ...base, role: 'viewer', status: 'active' }, { merge: true });
    } catch (e) {
      console.warn('Could not update user doc:', e);
    }
  }
  return data;
}

function redirectByRole(role, returnUrl, allowedPages = []) {
  const pages = Array.isArray(allowedPages) ? allowedPages : [];
  const r = portalRole(role);
  const isAdmin = r === 'admin';
  const isFunder = r === 'funder';

  const safeFunderReturn = (u) => {
    const t = sanitizeRoleRedirectTarget(u);
    return !!(
      t &&
      ALLOWED_RETURN_PAGES.includes(t) &&
      t !== 'admin.html' &&
      pages.includes(t)
    );
  };

  const firstFunderTarget = () => {
    for (const p of pages) {
      const t = sanitizeRoleRedirectTarget(p);
      if (t && ALLOWED_RETURN_PAGES.includes(t) && t !== 'admin.html') return t;
    }
    return null;
  };

  if (isAdmin) {
    if (returnUrl === 'firebasemap.html' || returnUrl === 'dashboard.html') {
      window.location.href = 'dashboard.html';
      return;
    }
    const returnTo = (() => {
      const t = sanitizeRoleRedirectTarget(returnUrl);
      return t && ALLOWED_RETURN_PAGES.includes(t) ? t : null;
    })();
    if (returnTo) {
      window.location.href = returnTo;
      return;
    }
    window.location.href = 'admin.html';
    return;
  }

  if (isFunder) {
    const raw = sanitizeRoleRedirectTarget(returnUrl);
    const target = raw && safeFunderReturn(raw) ? raw : firstFunderTarget();
    if (target) {
      window.location.href = target;
      return;
    }
    const auth = window.firebasePortal?.auth;
    const so = window.firebasePortal?.signOut;
    const goLogin = () => {
      window.location.replace('login.html?no_tool_access=1');
    };
    if (auth && so) {
      Promise.resolve(so(auth)).then(goLogin).catch(goLogin);
    } else {
      goLogin();
    }
    return;
  }

  if (r === 'viewer') {
    const name = sanitizeRoleRedirectTarget(returnUrl);
    if (name && canAccessPortalPage(r, pages, name)) {
      window.location.href = name;
    } else {
      window.location.href = 'he.html';
    }
    return;
  }

  if (r === 'user') {
    const name = sanitizeRoleRedirectTarget(returnUrl);
    if (name && canAccessPortalPage(r, pages, name)) {
      window.location.href = name;
    } else {
      window.location.href = 'corridor_monitoring.html';
    }
    return;
  }

  window.location.href = 'admin.html';
}

function getCurrentPageForReturn() {
  const name = (window.location.pathname || '').split('/').pop() || '';
  const t = sanitizeRoleRedirectTarget(name);
  if (!t) return '';
  return ALLOWED_RETURN_PAGES.includes(t) ? t : '';
}

async function checkAuthAndRedirect(isLoginPage = false, returnPage = null) {
  await waitForFirebase();
  const { auth, onAuthStateChanged } = window.firebasePortal;

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        await new Promise((r) => setTimeout(r, 600));
        const userAgain = auth.currentUser;
        if (userAgain) {
          const access = await getUserAccess(userAgain.uid);
          if (access) {
            if (isLoginPage) {
              const q = new URLSearchParams(window.location.search).get('return');
              const returnTo = sanitizeRoleRedirectTarget(q) || sanitizeRoleRedirectTarget(document.referrer);
              redirectByRole(access.role, returnTo, access.allowedPages);
            } else {
              resolve({ user: userAgain, role: access.role, allowedPages: access.allowedPages });
            }
            return;
          }
        }
        if (isLoginPage) resolve(null);
        else {
          const ret = sanitizeRoleRedirectTarget(returnPage) || getCurrentPageForReturn();
          window.location.replace(ret ? 'login.html?return=' + encodeURIComponent(ret) : 'login.html');
        }
        return;
      }
      const access = await getUserAccess(user.uid);
      if (!access) {
        await auth.signOut();
        if (isLoginPage) resolve(null);
        else {
          const ret = sanitizeRoleRedirectTarget(returnPage) || getCurrentPageForReturn();
          window.location.replace(ret ? 'login.html?return=' + encodeURIComponent(ret) : 'login.html');
        }
        return;
      }
      if (isLoginPage) {
        const q = new URLSearchParams(window.location.search).get('return');
        const returnTo = sanitizeRoleRedirectTarget(q) || sanitizeRoleRedirectTarget(document.referrer);
        redirectByRole(access.role, returnTo, access.allowedPages);
      } else {
        resolve({ user, role: access.role, allowedPages: access.allowedPages });
      }
    });
  });
}

function canAccessPage(role, page) {
  if (page === 'admin.html') return role === 'admin';
  return true;
}

/** If auth UI removed auth-overlay before listeners ran, still unblock the page after full load. */
window.addEventListener('load', () => {
  const authEl = document.getElementById('auth-overlay');
  if (authEl) {
    authEl.remove();
    window.dispatchEvent(new CustomEvent('authReady'));
  }
  const lm = document.getElementById('lightmapLoading');
  if (lm && !lm.classList.contains('hidden')) {
    lm.classList.add('hidden');
  }
});

window.AuthPortal = {
  waitForFirebase,
  waitForFirestoreQueryHelpers,
  getUserRole,
  getUserAccess,
  loginWithPassword,
  requestPin,
  verifyPin,
  signInWithPin,
  redirectByRole,
  checkAuthAndRedirect,
  canAccessPage,
  canAccessAdminToolPage,
  canAccessPortalPage,
  getAccessiblePortalPages,
  applySidebarNavForUser,
  applyRibbonNavForUser,
  applyPortalNavigation,
  canonicalPortalPageName,
  normalizeFunderPagePath,
  normalizeAllowedPagesList,
  sanitizeRoleRedirectTarget,
  portalRole,
  PORTAL_NAV_ITEMS,
  SIDEBAR_NAV_ITEMS,
  FUNDER_PAGE_OPTIONS,
  ALLOWED_RETURN_PAGES,
  USER_ROLE_DEFAULT_PAGES,
  VIEWER_ROLE_DEFAULT_PAGES
};
