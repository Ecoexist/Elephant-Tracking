/**
 * Auth Portal - Firebase auth for Ecoexist Monitoring
 * - Email PIN login (same as PWA)
 * - Roles: admin, funder (page-scoped), viewer/user
 */

const API_BASE = 'https://ecoexist-pwa-backend.vercel.app';

/** Pages funders may be granted (admin excluded). Labels for admin UI. */
const FUNDER_PAGE_OPTIONS = [
  // { value: 'dashboard_public_firebase.html', label: 'Public wildlife dashboard' },
  // { value: 'map-users.html', label: 'Wildlife map (viewer)' },
  { value: 'dashboard_all_data.html', label: 'Wildlife map — all data' },
  { value: 'dashboard.html', label: 'Dashboard (shell)' },
  // { value: 'firebasemap.html', label: 'Firebase map' },
  // { value: 'firebasemap_1.html', label: 'Firebase map (alt)' },
  { value: 'vehicle-tracker.html', label: 'Vehicle tracker' },
  { value: 'ngamiland-lucis.html', label: 'Ngamiland LUCIS' },
  { value: 'hec.html', label: 'HEC' },
  { value: 'land_use_conflict.html', label: 'Land use conflict' },
  { value: 'lightmap_100m.html', label: 'Light map (100 m)' },
  { value: 'corridor_monitoring.html', label: 'Corridor monitoring' },
  { value: 'corridor_monitoring_agol.html', label: 'Corridor monitoring (GCS + AGOL)' },
  { value: 'road_crossings_firebase.html', label: 'Road crossings (Firebase)' },
  { value: 'map.html', label: 'Map (legacy)' },
  { value: 'meeting-reports.html', label: 'Meeting reports' },
  { value: 'user-submissions.html', label: 'User submissions' }
];

const ALLOWED_RETURN_PAGES = FUNDER_PAGE_OPTIONS.map((o) => o.value);

const PORTAL_PUBLIC_HOME = 'dashboard_public_firebase.html';

/** Default tool pages for role `user` (Firestore role). */
const USER_ROLE_DEFAULT_PAGES = ['hec.html', 'corridor_monitoring.html', 'ngamiland-lucis.html'];

/** Default tool pages for role `viewer`. */
const VIEWER_ROLE_DEFAULT_PAGES = ['lightmap_100m.html', 'dashboard_all_data.html'];

function pageFilename(page) {
  if (typeof page !== 'string') return '';
  return page.split('/').pop().split('?')[0].split('#')[0];
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

/** Sidebar links for app shell pages (corridor / lightmap layout). Order = display order. */
const SIDEBAR_NAV_ITEMS = [
  { href: 'dashboard_public_firebase.html', label: 'Overview', pageKey: 'dashboard_public_firebase.html', htmlLabel: false },
  { href: 'admin.html', label: 'Admin', pageKey: 'admin.html', htmlLabel: false },
  { href: 'vehicle-tracker.html', label: 'Vehicle Tracker', pageKey: 'vehicle-tracker.html', htmlLabel: false },
  { href: 'dashboard_all_data.html', label: 'Wildlife Map', pageKey: 'dashboard_all_data.html', htmlLabel: false },
  { href: 'corridor_monitoring.html', label: 'Corridor monitoring', pageKey: 'corridor_monitoring.html', htmlLabel: false },
  { href: 'corridor_monitoring_agol.html', label: 'Corridor (AGOL)', pageKey: 'corridor_monitoring_agol.html', htmlLabel: false },
  { href: 'lightmap_100m.html', label: 'Light map (100 m)', pageKey: 'lightmap_100m.html', htmlLabel: true },
  { href: 'ngamiland-lucis.html', label: 'Ngamiland LUCIS', pageKey: 'ngamiland-lucis.html', htmlLabel: false },
  { href: 'hec.html', label: 'HEC', pageKey: 'hec.html', htmlLabel: false },
  { href: 'kaza/land_use_conflict.html', label: 'Land Use Conflict', pageKey: 'land_use_conflict.html', htmlLabel: false }
];

function getAccessiblePortalPages(role, allowedPages) {
  const norm = normalizeAllowedPagesList(Array.isArray(allowedPages) ? allowedPages : []);
  if (role === 'admin') {
    const keys = new Set([PORTAL_PUBLIC_HOME, ...SIDEBAR_NAV_ITEMS.map((i) => i.pageKey)]);
    return [...keys];
  }
  if (role === 'funder') {
    return [PORTAL_PUBLIC_HOME, ...norm];
  }
  if (role === 'user') {
    return [PORTAL_PUBLIC_HOME, ...USER_ROLE_DEFAULT_PAGES];
  }
  if (role === 'viewer') {
    return [PORTAL_PUBLIC_HOME, ...VIEWER_ROLE_DEFAULT_PAGES];
  }
  return [PORTAL_PUBLIC_HOME];
}

function canAccessPortalPage(role, allowedPages, page) {
  if (role === 'admin') return true;
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
  if (pageKey === 'dashboard_all_data.html') {
    return 'background: #2c5530; padding: 8px 16px; text-decoration: none; border-radius: 4px; color: #fff;';
  }
  if (pageKey === 'vehicle-tracker.html') {
    return 'background: #8e44ad; padding: 8px 16px; text-decoration: none; border-radius: 4px; color: #fff;';
  }
  return 'background: #666; padding: 8px 16px; text-decoration: none; border-radius: 4px; color: #fff;';
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
    for (const item of SIDEBAR_NAV_ITEMS) {
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
      if (role === 'admin') {
        logo.href = 'dashboard_all_data.html';
      } else if (canAccessPortalPage(role, allowedPages, 'dashboard_all_data.html')) {
        logo.href = 'dashboard_all_data.html';
      } else {
        const first = SIDEBAR_NAV_ITEMS.find((item) => canAccessPortalPage(role, allowedPages, item.pageKey));
        logo.href = first ? first.href : PORTAL_PUBLIC_HOME;
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
    for (const item of SIDEBAR_NAV_ITEMS) {
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
  const isAdmin = role === 'admin';
  const isFunder = role === 'funder';

  const safeFunderReturn = (u) =>
    u &&
    ALLOWED_RETURN_PAGES.includes(u) &&
    u !== 'admin.html' &&
    pages.includes(u);

  if (isAdmin) {
    if (returnUrl === 'firebasemap.html' || returnUrl === 'dashboard.html') {
      window.location.href = 'dashboard.html';
      return;
    }
    const returnTo = returnUrl && ALLOWED_RETURN_PAGES.includes(returnUrl) ? returnUrl : null;
    if (returnTo && returnTo !== 'dashboard_public_firebase.html') {
      window.location.href = returnTo;
      return;
    }
    window.location.href = 'admin.html';
    return;
  }

  if (isFunder) {
    const target =
      returnUrl && safeFunderReturn(returnUrl)
        ? returnUrl
        : pages.find((p) => ALLOWED_RETURN_PAGES.includes(p) && p !== 'admin.html') || null;
    if (target) {
      window.location.href = target;
      return;
    }
    window.location.href = 'dashboard_public_firebase.html';
    return;
  }

  if (role === 'viewer') {
    const raw = returnUrl ? String(returnUrl).trim() : '';
    const name = raw ? pageFilename(raw) : '';
    if (name && canAccessPortalPage(role, pages, name)) {
      window.location.href = name;
    } else {
      window.location.href = 'dashboard_all_data.html';
    }
    return;
  }

  if (role === 'user') {
    const raw = returnUrl ? String(returnUrl).trim() : '';
    const name = raw ? pageFilename(raw) : '';
    if (name && canAccessPortalPage(role, pages, name)) {
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
  return ALLOWED_RETURN_PAGES.includes(name) ? name : '';
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
              const returnTo = new URLSearchParams(window.location.search).get('return');
              redirectByRole(access.role, returnTo || document.referrer, access.allowedPages);
            } else {
              resolve({ user: userAgain, role: access.role, allowedPages: access.allowedPages });
            }
            return;
          }
        }
        if (isLoginPage) resolve(null);
        else {
          const ret = returnPage || getCurrentPageForReturn();
          window.location.replace(ret ? 'login.html?return=' + encodeURIComponent(ret) : 'login.html');
        }
        return;
      }
      const access = await getUserAccess(user.uid);
      if (!access) {
        await auth.signOut();
        if (isLoginPage) resolve(null);
        else {
          const ret = returnPage || getCurrentPageForReturn();
          window.location.replace(ret ? 'login.html?return=' + encodeURIComponent(ret) : 'login.html');
        }
        return;
      }
      if (isLoginPage) {
        const returnTo = new URLSearchParams(window.location.search).get('return');
        redirectByRole(access.role, returnTo || document.referrer, access.allowedPages);
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
    console.warn('[AuthPortal] Removing auth-overlay at window load (stuck guard)');
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
  FUNDER_PAGE_OPTIONS,
  ALLOWED_RETURN_PAGES,
  PORTAL_PUBLIC_HOME,
  USER_ROLE_DEFAULT_PAGES,
  VIEWER_ROLE_DEFAULT_PAGES
};
