/* ===================================================
   BAKELY Admin Live Editor
   Inert unless ?admin=1 is in the URL.
   Two-layer security:
     1) Password gate (SHA-256 checked client-side)
     2) GitHub Personal Access Token required to publish
        (never stored in this file, entered per-session,
         kept only in sessionStorage — cleared on tab close)
   =================================================== */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  if (params.get('admin') !== '1') return; // completely inert for the public

  const PW_HASH = '10413925d3d2254256345ce323e5decc3802d13ab9a0e616c18f6b63352a90d9';
  const REPO_OWNER = 'infosupport247-gif';
  const REPO_NAME = 'cookie-site';
  const REPO_BRANCH = 'main';
  const PAGE_PATH = location.pathname.split('/').filter(Boolean).pop() || 'index.html';

  let unlocked = false;
  let editModeOn = false;
  let dirty = false;
  let saving = false;

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function injectStyles() {
    const css = `
      #admin-gate { position:fixed; inset:0; background:rgba(10,6,2,0.92); z-index:99999;
        display:flex; align-items:center; justify-content:center; font-family:sans-serif; }
      #admin-gate .box { background:#1c1108; border:1px solid #c9a55c; border-radius:12px;
        padding:2.5rem; width:320px; text-align:center; box-shadow:0 20px 60px rgba(0,0,0,0.6); }
      #admin-gate h2 { color:#e8dcc8; font-size:1.1rem; margin-bottom:1.2rem; letter-spacing:0.05em; }
      #admin-gate input { width:100%; padding:0.7rem 1rem; border-radius:8px; border:1px solid #3d2817;
        background:#241708; color:#f5ecd9; margin-bottom:1rem; font-size:0.95rem; box-sizing:border-box; }
      #admin-gate button { width:100%; padding:0.7rem; border-radius:8px; border:none;
        background:linear-gradient(135deg,#c9a55c,#e0c896); color:#1c1108; font-weight:700;
        cursor:pointer; font-size:0.9rem; }
      #admin-gate .err { color:#e08080; font-size:0.8rem; margin-top:0.6rem; min-height:1em; }
      #admin-toolbar { position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:#1c1108; border:1px solid #c9a55c; border-radius:50px; z-index:99998;
        display:flex; align-items:center; gap:0.6rem; padding:0.6rem 1rem;
        box-shadow:0 10px 40px rgba(0,0,0,0.5); font-family:sans-serif; }
      #admin-toolbar button { border:none; border-radius:30px; padding:0.5rem 1.1rem;
        font-size:0.78rem; font-weight:600; cursor:pointer; letter-spacing:0.03em; }
      #admin-toolbar .btn-save { background:linear-gradient(135deg,#c9a55c,#e0c896); color:#1c1108; }
      #admin-toolbar .btn-discard { background:#3d2817; color:#e8dcc8; }
      #admin-toolbar .btn-logout { background:transparent; color:#e8dcc8; border:1px solid #3d2817 !important; }
      #admin-toolbar .status { color:#e0c896; font-size:0.75rem; padding:0 0.4rem; }
      .admin-editable { outline:1px dashed rgba(201,165,92,0.35); outline-offset:2px; cursor:text; }
      .admin-editable:hover { outline-color:rgba(201,165,92,0.8); background:rgba(201,165,92,0.06); }
      .admin-editable:focus { outline:2px solid #c9a55c; background:rgba(201,165,92,0.1); }
      .admin-editable-img { cursor:pointer; position:relative; }
      .admin-editable-img:hover { outline:2px dashed #c9a55c; outline-offset:-2px; filter:brightness(0.85); }
      .admin-drag-over { outline:3px solid #e0c896 !important; filter:brightness(1.2); }
      #admin-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%);
        background:#1c1108; border:1px solid #c9a55c; color:#f5ecd9; padding:0.8rem 1.4rem;
        border-radius:8px; z-index:100000; font-family:sans-serif; font-size:0.85rem;
        box-shadow:0 10px 30px rgba(0,0,0,0.5); max-width:90vw; }
    `;
    const style = document.createElement('style');
    style.id = 'admin-edit-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function toast(msg, ms) {
    let t = document.getElementById('admin-toast');
    if (t) t.remove();
    t = document.createElement('div');
    t.id = 'admin-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 3500);
  }

  function showGate() {
    const gate = document.createElement('div');
    gate.id = 'admin-gate';
    gate.innerHTML = `
      <div class="box">
        <h2>🔒 BAKELY Admin Access</h2>
        <input type="password" id="admin-pw" placeholder="Enter admin password" autofocus>
        <button id="admin-unlock-btn">Unlock Editor</button>
        <div class="err" id="admin-err"></div>
      </div>`;
    document.body.appendChild(gate);
    const pwInput = document.getElementById('admin-pw');
    const err = document.getElementById('admin-err');
    async function tryUnlock() {
      const hash = await sha256(pwInput.value);
      if (hash === PW_HASH) {
        gate.remove();
        unlocked = true;
        enableEditing();
      } else {
        err.textContent = 'Incorrect password.';
        pwInput.value = '';
        pwInput.focus();
      }
    }
    document.getElementById('admin-unlock-btn').addEventListener('click', tryUnlock);
    pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function extFromMime(mime) {
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('gif')) return 'gif';
    if (mime.includes('svg')) return 'svg';
    return 'png';
  }

  function markDirty() { dirty = true; updateToolbar(); }

  function attachImageHandlers(img) {
    img.classList.add('admin-editable-img');
    img.addEventListener('dragover', e => { e.preventDefault(); img.classList.add('admin-drag-over'); });
    img.addEventListener('dragleave', () => img.classList.remove('admin-drag-over'));
    img.addEventListener('drop', async e => {
      e.preventDefault();
      img.classList.remove('admin-drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const dataUrl = await fileToDataUrl(file);
      img.dataset.pendingUpload = 'true';
      img.dataset.newImageData = dataUrl;
      img.dataset.newImageMime = file.type;
      img.src = dataUrl;
      markDirty();
      toast('Image staged — click Save & Publish to go live.');
    });
    img.addEventListener('click', e => {
      e.preventDefault();
      const picker = document.createElement('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      picker.onchange = async () => {
        const file = picker.files[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        img.dataset.pendingUpload = 'true';
        img.dataset.newImageData = dataUrl;
        img.dataset.newImageMime = file.type;
        img.src = dataUrl;
        markDirty();
        toast('Image staged — click Save & Publish to go live.');
      };
      picker.click();
    });
  }

  function enableEditing() {
    injectStyles();
    editModeOn = true;

    const TEXT_SELECTOR = [
      'h1', 'h2', 'h3', 'h4', 'h5', 'p', 'blockquote',
      '.stat-num', '.stat-label', '.price', '.menu-item-price',
      '.hero-eyebrow', '.section-eyebrow', '.footer-brand',
      'li:not(:has(a)):not(:has(i))'
    ].join(',');

    let els;
    try { els = document.querySelectorAll(TEXT_SELECTOR); }
    catch (e) {
      // :has() unsupported fallback
      els = document.querySelectorAll('h1,h2,h3,h4,h5,p,blockquote,.stat-num,.stat-label,.price,.menu-item-price,.hero-eyebrow,.section-eyebrow,.footer-brand');
    }
    els.forEach(el => {
      if (el.closest('#admin-gate,#admin-toolbar')) return;
      if (el.querySelector('img,script,style,input,textarea,select')) return;
      el.contentEditable = 'true';
      el.classList.add('admin-editable');
      el.addEventListener('input', markDirty);
    });

    document.querySelectorAll('img').forEach(img => {
      if (img.closest('#admin-gate,#admin-toolbar')) return;
      attachImageHandlers(img);
    });

    // prevent nav links from navigating away while editing
    document.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => { if (editModeOn) e.preventDefault(); });
    });

    showToolbar();
    toast('Edit mode unlocked. Click text to edit, click/drag images to replace.', 5000);
  }

  function showToolbar() {
    const bar = document.createElement('div');
    bar.id = 'admin-toolbar';
    bar.innerHTML = `
      <span class="status" id="admin-status">No changes</span>
      <button class="btn-save" id="admin-save-btn">💾 Save &amp; Publish</button>
      <button class="btn-discard" id="admin-discard-btn">Discard</button>
      <button class="btn-logout" id="admin-logout-btn">Exit</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('admin-save-btn').addEventListener('click', publish);
    document.getElementById('admin-discard-btn').addEventListener('click', () => location.reload());
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.delete('admin');
      location.href = url.toString();
    });
  }

  function updateToolbar() {
    const s = document.getElementById('admin-status');
    if (s) s.textContent = dirty ? 'Unsaved changes' : 'No changes';
  }

  function getToken() {
    let token = sessionStorage.getItem('bakely_admin_token');
    if (!token) {
      token = prompt('Enter your GitHub Personal Access Token (repo write scope). This is only stored in this browser tab and never saved to the site:');
      if (token) sessionStorage.setItem('bakely_admin_token', token.trim());
    }
    return token ? token.trim() : null;
  }

  async function ghRequest(path, options) {
    const token = getToken();
    if (!token) throw new Error('No token provided');
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
      ...options,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        ...(options && options.headers)
      }
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401 || res.status === 403) sessionStorage.removeItem('bakely_admin_token');
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json();
  }

  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function uploadPendingImages() {
    const pending = Array.from(document.querySelectorAll('img[data-pending-upload="true"]'));
    let i = 0;
    for (const img of pending) {
      i++;
      const dataUrl = img.dataset.newImageData;
      const mime = img.dataset.newImageMime || 'image/png';
      const base64 = dataUrl.split(',')[1];
      const ext = extFromMime(mime);
      const filename = `images/admin-upload-${Date.now()}-${i}.${ext}`;
      toast(`Uploading image ${i}/${pending.length}...`, 8000);
      await ghRequest(filename, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Admin edit: upload image via live editor`,
          content: base64,
          branch: REPO_BRANCH
        })
      });
      img.src = filename;
      img.removeAttribute('data-pending-upload');
      img.removeAttribute('data-new-image-data');
      img.removeAttribute('data-new-image-mime');
    }
  }

  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.admin-editable').forEach(el => el.classList.remove('admin-editable'));
    clone.querySelectorAll('.admin-editable-img').forEach(el => el.classList.remove('admin-editable-img'));
    clone.querySelectorAll('.admin-drag-over').forEach(el => el.classList.remove('admin-drag-over'));
    const gate = clone.querySelector('#admin-gate'); if (gate) gate.remove();
    const bar = clone.querySelector('#admin-toolbar'); if (bar) bar.remove();
    const toastEl = clone.querySelector('#admin-toast'); if (toastEl) toastEl.remove();
    const styleEl = clone.querySelector('#admin-edit-styles'); if (styleEl) styleEl.remove();
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  async function publish() {
    if (saving) return;
    saving = true;
    const btn = document.getElementById('admin-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Publishing...'; }
    try {
      await uploadPendingImages();
      const html = getCleanHTML();
      const current = await ghRequest(`${PAGE_PATH}?ref=${REPO_BRANCH}`, { method: 'GET' });
      await ghRequest(PAGE_PATH, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Admin edit: update ${PAGE_PATH} via live editor`,
          content: b64EncodeUnicode(html),
          sha: current.sha,
          branch: REPO_BRANCH
        })
      });
      dirty = false;
      updateToolbar();
      toast('✅ Published! Live site updates in ~20-30s.', 6000);
    } catch (err) {
      console.error(err);
      toast('❌ Publish failed: ' + err.message, 6000);
    } finally {
      saving = false;
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save & Publish'; }
    }
  }

  window.addEventListener('beforeunload', e => {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  // boot
  function boot() {
    injectStyles();
    showGate();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
