/**
 * Shared UI for portal pages: user avatar initials + sign-out (sidebar shell).
 * Expects Bootstrap 5 JS for dropdown; #userAvatarMenuBtn, #userAvatarInitials, #userAvatarSignOut.
 */
(function () {
  window._corridorProfileNameForInitials = '';

  function initialsFromFirebaseUser(user) {
    if (!user) return '?';
    const name = (user.displayName || window._corridorProfileNameForInitials || '').trim();
    if (name) {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0].charAt(0) || '?').toUpperCase();
    }
    let emailStr = user.email || '';
    if (!emailStr && user.providerData && user.providerData.length) emailStr = user.providerData[0].email || '';
    const local = emailStr.split('@')[0] || '';
    if (local) {
      const bits = local.split(/[._-]+/).filter(Boolean);
      if (bits.length >= 2) return (bits[0].charAt(0) + bits[1].charAt(0)).toUpperCase();
      if (local.length >= 2) return local.substring(0, 2).toUpperCase();
      return (local.charAt(0) + local.charAt(0)).toUpperCase();
    }
    return user.uid ? user.uid.substring(0, 2).toUpperCase() : '?';
  }

  window.updatePortalShellAvatar = function () {
    const el = document.getElementById('userAvatarInitials');
    if (!el) return;
    const user = window.firebasePortal && window.firebasePortal.auth ? window.firebasePortal.auth.currentUser : null;
    el.textContent = initialsFromFirebaseUser(user);
  };

  async function fetchPortalShellProfileName() {
    window._corridorProfileNameForInitials = '';
    const auth = window.firebasePortal && window.firebasePortal.auth ? window.firebasePortal.auth : null;
    const db = window.firebasePortal && window.firebasePortal.db ? window.firebasePortal.db : null;
    const docFn = window.firebasePortal && window.firebasePortal.doc ? window.firebasePortal.doc : null;
    const getDocFn = window.firebasePortal && window.firebasePortal.getDoc ? window.firebasePortal.getDoc : null;
    if (!auth || !auth.currentUser || !db || !docFn || !getDocFn) return;
    try {
      const snap = await getDocFn(docFn(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const d = snap.data();
        let n = (d.name || d.displayName || '').trim();
        if (!n) {
          const em = (d.email || auth.currentUser.email || '').trim();
          if (em) {
            const local = em.split('@')[0];
            const parts = local.split(/[._-]+/).filter(Boolean);
            if (parts.length >= 2) n = parts[0] + ' ' + parts[parts.length - 1];
            else n = local;
          }
        }
        if (n) window._corridorProfileNameForInitials = n;
      }
    } catch (e) { /* ignore */ }
  }

  function wirePortalShellUiCore() {
    window.updatePortalShellAvatar();
    fetchPortalShellProfileName().then(function () { window.updatePortalShellAvatar(); });
    var auth = window.firebasePortal && window.firebasePortal.auth ? window.firebasePortal.auth : null;
    var oasc = window.firebasePortal && window.firebasePortal.onAuthStateChanged;
    if (auth && oasc && !auth._portalShellAvatarBound) {
      auth._portalShellAvatarBound = true;
      oasc(auth, function (u) {
        window._corridorProfileNameForInitials = '';
        if (u) fetchPortalShellProfileName().then(function () { window.updatePortalShellAvatar(); });
        else window.updatePortalShellAvatar();
      });
    }
    var so = document.getElementById('userAvatarSignOut');
    if (so && !so._portalShellSignOutBound) {
      so._portalShellSignOutBound = true;
      so.addEventListener('click', function (e) {
        e.preventDefault();
        var a = window.firebasePortal && window.firebasePortal.auth ? window.firebasePortal.auth : null;
        var signOutFn = window.firebasePortal && window.firebasePortal.signOut;
        if (a && signOutFn) {
          signOutFn(a).then(function () { window.location.href = 'login.html'; }).catch(function () { window.location.href = 'login.html'; });
        } else window.location.href = 'login.html';
      });
    }
  }

  window.wirePortalShellUi = function () {
    if (window.AuthPortal && typeof window.AuthPortal.waitForFirebase === 'function') {
      window.AuthPortal.waitForFirebase().then(function () { wirePortalShellUiCore(); }).catch(function () { wirePortalShellUiCore(); });
    } else setTimeout(window.wirePortalShellUi, 80);
  };

  window.updateCorridorUserAvatar = window.updatePortalShellAvatar;
})();
