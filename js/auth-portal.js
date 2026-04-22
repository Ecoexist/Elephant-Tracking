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
  // { value: 'dashboard.html', label: 'Dashboard (shell)' },
  // { value: 'firebasemap.html', label: 'Firebase map' },
  // { value: 'firebasemap_1.html', label: 'Firebase map (alt)' },
  { value: 'vehicle-tracker.html', label: 'Vehicle tracker' },
  { value: 'ngamiland-lucis.html', label: 'Ngamiland LUCIS' },
  { value: 'hec.html', label: 'HEC' },
  { value: 'land_use_conflict.html', label: 'Land use conflict' },
  { value: 'lightmap_100m.html', label: 'Light map (100 m)' },
  { value: 'corridor_monitoring.html', label: 'Corridor monitoring' },
  { value: 'corridor-mon2.html', label: 'Corridor monitoring (GCS + AGOL)' },
  // { value: 'road_crossings_firebase.html', label: 'Road crossings (Firebase)' },
  // { value: 'map.html', label: 'Map (legacy)' },
  { value: 'meeting-reports.html', label: 'Meeting reports' },
  // { value: 'user-submissions.html', label: 'User submissions' }
];

const ALLOWED_RETURN_PAGES = FUNDER_PAGE_OPTIONS.map((o) => o.value);

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
  const isViewer = role === 'viewer' || role === 'user';

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

  if (isViewer) {
    window.location.href = 'dashboard_public_firebase.html';
    return;
  }

  window.location.href = 'admin.html';
}

function getCurrentPageForReturn() {
  const name = (window.location.pathname || '').split('/').pop() || '';
  return ALLOWED_RETURN_PAGES.includes(name) ? name : '';
}

/**
 * Admin-only tools: admin, or funder with page in allowedPages.
 */
function canAccessAdminToolPage(role, allowedPages, page) {
  if (role === 'admin') return true;
  if (role === 'funder') {
    return page !== 'admin.html' && (Array.isArray(allowedPages) ? allowedPages : []).includes(page);
  }
  return false;
}

/**
 * Any logged-in portal page that previously allowed viewer/user (e.g. HEC, map-users).
 */
function canAccessPortalPage(role, allowedPages, page) {
  if (role === 'admin') return true;
  if (role === 'funder') {
    if (page === 'admin.html') return false;
    if (page === 'dashboard_public_firebase.html') return true;
    return (Array.isArray(allowedPages) ? allowedPages : []).includes(page);
  }
  if (role === 'viewer' || role === 'user') return true;
  return false;
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
  FUNDER_PAGE_OPTIONS,
  ALLOWED_RETURN_PAGES
};
