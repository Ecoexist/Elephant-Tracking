/**
 * Auth Portal - Firebase auth for Ecoexist Monitoring
 * - Email PIN login (same as PWA)
 * - Role-based redirect: admin -> map.html + admin, viewer/user -> map-users.html
 * - Protects map.html, admin.html, map-users.html
 */

const API_BASE = 'https://ecoexist-pwa-backend.vercel.app';

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

async function getUserRole(uid) {
  const { db, doc, getDoc } = window.firebasePortal;
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (data.status === 'revoked') return null;
      return data.role || 'viewer';
    }
  } catch (e) {
    console.error('Failed to get user role:', e);
  }
  return 'viewer';
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

const ALLOWED_RETURN_PAGES = ['firebasemap.html', 'dashboard.html', 'dashboard_public_firebase.html', 'admin.html', 'vehicle-tracker.html', 'ngamiland-lucis.html', 'hec.html', 'land_use_conflict.html','lightmap_100m.html','corridor-mon2.html'];

function redirectByRole(role, returnUrl) {
  const isAdmin = role === 'admin';
  const isViewer = role === 'viewer' || role === 'user';

  if (isAdmin) {
    // Admin: firebasemap/dashboard -> dashboard.html; admin.html -> admin; else admin.html
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

  if (isViewer) {
    // Viewer/user: always go to public dashboard (no access to admin/internal pages)
    window.location.href = 'dashboard_public_firebase.html';
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
        await new Promise(r => setTimeout(r, 600));
        const userAgain = auth.currentUser;
        if (userAgain) {
          const role = await getUserRole(userAgain.uid);
          if (role) {
            if (isLoginPage) {
              const returnTo = new URLSearchParams(window.location.search).get('return');
              redirectByRole(role, returnTo || document.referrer);
            } else {
              resolve({ user: userAgain, role });
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
      const role = await getUserRole(user.uid);
      if (!role) {
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
        redirectByRole(role, returnTo || document.referrer);
      } else {
        resolve({ user, role });
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
  loginWithPassword,
  requestPin,
  verifyPin,
  signInWithPin,
  redirectByRole,
  checkAuthAndRedirect,
  canAccessPage
};

