/* ===================================================
   BAKELY Admin Live Editor v2
   Inert unless ?admin=1 is in the URL.
   Two-layer security:
     1) Password gate (SHA-256 checked client-side)
     2) GitHub Personal Access Token required to publish
        (never stored in this file, entered per-session,
         kept only in sessionStorage — cleared on tab close)

   Capabilities:
     - Click-to-edit any text
     - Replace <img> tags (click or drag-drop a file)
     - Replace CSS background-image divs (click or drag-drop)
     - Drag-to-reposition any element (Move Mode toggle)
     - Publishes straight to the GitHub repo (GitHub Pages rebuilds)
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

  let editModeOn = false;
  let moveModeOn = false;
  let dirty = false;
  let colorPanelOpen = false;
  const colorChanges = {}; // { '--gold': '#c9a55c', ... } only entries the admin actually changed

  const EDITABLE_COLOR_VARS = [
    { key: '--bg', label: 'Page Background' },
    { key: '--espresso', label: 'Card/Panel Background' },
    { key: '--gold', label: 'Primary Gold Accent' },
    { key: '--gold-light', label: 'Gold Light (hover/glow)' },
    { key: '--gold-bright', label: 'Gold Bright (highlights)' },
    { key: '--cream', label: 'Cream Text' },
    { key: '--ink', label: 'Body Text Color' },
    { key: '--border', label: 'Border / Divider' }
  ];
  let saving = false;

  async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function injectStyles() {
    if (document.getElementById('admin-edit-styles')) return;
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
        display:flex; align-items:center; gap:0.5rem; padding:0.6rem 1rem;
        box-shadow:0 10px 40px rgba(0,0,0,0.5); font-family:sans-serif; flex-wrap:wrap; justify-content:center; max-width:94vw; }
      #admin-toolbar button { border:none; border-radius:30px; padding:0.5rem 1.05rem;
        font-size:0.74rem; font-weight:600; cursor:pointer; letter-spacing:0.03em; white-space:nowrap; }
      #admin-toolbar .btn-save { background:linear-gradient(135deg,#c9a55c,#e0c896); color:#1c1108; }
      #admin-toolbar .btn-move { background:#3d2817; color:#e8dcc8; }
      #admin-toolbar .btn-move.active { background:linear-gradient(135deg,#e08080,#c95c5c); color:#fff; }
      #admin-toolbar .btn-discard { background:#3d2817; color:#e8dcc8; }
      #admin-toolbar .btn-logout { background:transparent; color:#e8dcc8; border:1px solid #5a4020 !important; }
      #admin-toolbar .status { color:#e0c896; font-size:0.72rem; padding:0 0.3rem; }
      .admin-editable { outline:1px dashed rgba(201,165,92,0.35); outline-offset:2px; cursor:text; }
      .admin-editable:hover { outline-color:rgba(201,165,92,0.8); background:rgba(201,165,92,0.06); }
      .admin-editable:focus { outline:2px solid #c9a55c; background:rgba(201,165,92,0.1); }
      .admin-img-target { cursor:pointer !important; position:relative; }
      .admin-img-target:hover { outline:2px dashed #c9a55c; outline-offset:-2px; filter:brightness(0.8); }
      .admin-img-target:hover::after {
        content:'📷 Click or drop image to replace'; position:absolute; inset:auto auto 0 0;
        background:rgba(28,17,8,0.9); color:#f0d99a; font-size:0.7rem; padding:0.3rem 0.6rem;
        z-index:500; pointer-events:none; font-family:sans-serif; border-top-right-radius:6px;
      }
      .admin-drag-over { outline:3px solid #e0c896 !important; filter:brightness(1.3) !important; }
      .admin-move-mode .admin-movable { cursor:grab !important; }
      .admin-move-mode .admin-movable:hover { outline:2px dashed #e08080 !important; outline-offset:2px; }
      .admin-movable.admin-dragging { cursor:grabbing !important; opacity:0.85; z-index:9000 !important; outline:2px solid #e08080 !important; }
      .admin-move-mode [contenteditable] { cursor:grab !important; }
      #admin-toast { position:fixed; top:20px; left:50%; transform:translateX(-50%);
        background:#1c1108; border:1px solid #c9a55c; color:#f5ecd9; padding:0.8rem 1.4rem;
        border-radius:8px; z-index:100000; font-family:sans-serif; font-size:0.85rem;
        box-shadow:0 10px 30px rgba(0,0,0,0.5); max-width:90vw; }
      .admin-reset-btn { position:absolute; top:-10px; right:-10px; z-index:600;
        background:#c9a55c; color:#1c1108; border:none; border-radius:50%;
        width:22px; height:22px; font-size:0.7rem; cursor:pointer; display:none;
        align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.4); }
      .admin-movable[style*="translate"]:hover .admin-reset-btn { display:flex; }

      #admin-color-panel { position:fixed; top:0; right:0; bottom:0; width:280px;
        background:#1c1108; border-left:1px solid #c9a55c; z-index:99997;
        box-shadow:-10px 0 40px rgba(0,0,0,0.5); font-family:sans-serif;
        overflow-y:auto; padding:1.2rem; transform:translateX(100%); transition:transform .3s ease; }
      #admin-color-panel.open { transform:translateX(0); }
      #admin-color-panel h3 { color:#f0d99a; font-size:0.95rem; margin-bottom:1rem; letter-spacing:0.03em; }
      #admin-color-panel .swatch-row { display:flex; align-items:center; justify-content:space-between;
        margin-bottom:0.9rem; gap:0.6rem; }
      #admin-color-panel .swatch-row label { color:#e8dcc8; font-size:0.72rem; flex:1; }
      #admin-color-panel .swatch-row input[type=color] { width:38px; height:28px; border:1px solid #3d2817;
        border-radius:6px; background:none; cursor:pointer; padding:0; }
      #admin-color-panel .swatch-row input[type=text] { width:78px; font-size:0.68rem; padding:0.3rem 0.4rem;
        border-radius:6px; border:1px solid #3d2817; background:#241708; color:#f5ecd9; }
      #admin-color-panel .panel-actions { display:flex; gap:0.5rem; margin-top:1.2rem; }
      #admin-color-panel .panel-actions button { flex:1; border:none; border-radius:8px; padding:0.6rem;
        font-size:0.75rem; font-weight:600; cursor:pointer; }
      #admin-color-panel .btn-reset-colors { background:#3d2817; color:#e8dcc8; }
      #admin-color-panel .btn-close-colors { background:linear-gradient(135deg,#c9a55c,#e0c896); color:#1c1108; }
      #admin-toolbar .btn-colors { background:#3d2817; color:#e8dcc8; }
      #admin-toolbar .btn-colors.active { background:linear-gradient(135deg,#c9a55c,#e0c896); color:#1c1108; }
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

  async function applyNewImage(el, file, isBackground) {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await fileToDataUrl(file);
    el.dataset.pendingUpload = 'true';
    el.dataset.newImageData = dataUrl;
    el.dataset.newImageMime = file.type;
    el.dataset.isBackground = isBackground ? 'true' : 'false';
    if (isBackground) {
      el.style.backgroundImage = `url('${dataUrl}')`;
    } else {
      el.src = dataUrl;
    }
    markDirty();
    toast('Image staged — click Save & Publish to go live.');
  }

  function openFilePicker(el, isBackground) {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.style.position = 'fixed';
    picker.style.top = '-1000px';
    document.body.appendChild(picker);
    picker.addEventListener('change', () => {
      const file = picker.files[0];
      applyNewImage(el, file, isBackground);
      picker.remove();
    });
    picker.click();
  }

  function attachImageTarget(el, isBackground) {
    el.classList.add('admin-img-target');
    el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('admin-drag-over'); });
    el.addEventListener('dragleave', e => { e.stopPropagation(); el.classList.remove('admin-drag-over'); });
    el.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      el.classList.remove('admin-drag-over');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) applyNewImage(el, file, isBackground);
    });
    el.addEventListener('click', e => {
      if (moveModeOn) return;
      e.preventDefault();
      e.stopPropagation();
      openFilePicker(el, isBackground);
    });
  }

  // --- Drag-to-reposition ---
  function attachMovable(el) {
    el.classList.add('admin-movable');
    // Prevent native browser image-drag from hijacking our custom drag
    el.querySelectorAll('img').forEach(img => { img.draggable = false; });
    el.addEventListener('dragstart', e => { if (moveModeOn) e.preventDefault(); });
    let startX, startY, origX = 0, origY = 0, dragging = false;

    function parseTranslate(str) {
      const m = /translate\(\s*(-?\d+(?:\.\d+)?)px\s*,\s*(-?\d+(?:\.\d+)?)px\s*\)/.exec(str || '');
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
    }

    const resetBtn = document.createElement('button');
    resetBtn.className = 'admin-reset-btn';
    resetBtn.textContent = '↺';
    resetBtn.title = 'Reset position';
    resetBtn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      el.style.transform = '';
      markDirty();
    });
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(resetBtn);

    el.addEventListener('mousedown', e => {
      if (!moveModeOn) return;
      if (e.target === resetBtn) return;
      e.preventDefault();
      e.stopPropagation();
      dragging = true;
      el.classList.add('admin-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const cur = parseTranslate(el.style.transform);
      origX = cur.x;
      origY = cur.y;
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      el.style.transform = `translate(${origX + dx}px, ${origY + dy}px)`;
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove('admin-dragging');
      markDirty();
    });
  }

  function enableEditing() {
    injectStyles();
    editModeOn = true;

    // --- 1. Text editing ---
    const TEXT_SELECTOR = 'h1,h2,h3,h4,h5,p,blockquote,.stat-num,.stat-label,.price,.menu-item-price,.hero-eyebrow,.section-eyebrow,.footer-brand,.brand-wordmark,.wm-name';
    document.querySelectorAll(TEXT_SELECTOR).forEach(el => {
      if (el.closest('#admin-gate,#admin-toolbar')) return;
      if (el.querySelector('img,script,style,input,textarea,select')) return;
      el.contentEditable = 'true';
      el.classList.add('admin-editable');
      el.addEventListener('input', markDirty);
    });

    // --- 2. <img> tag replacement ---
    document.querySelectorAll('img').forEach(img => {
      if (img.closest('#admin-gate,#admin-toolbar')) return;
      attachImageTarget(img, false);
    });

    // --- 3. CSS background-image div replacement ---
    document.querySelectorAll('[style*="background-image"]').forEach(el => {
      if (el.closest('#admin-gate,#admin-toolbar')) return;
      attachImageTarget(el, true);
    });

    // --- 4. Drag-to-reposition candidates ---
    const MOVABLE_SELECTOR = [
      '.featured-card', '.menu-item', '.viral-card', '.why-card', '.value-card',
      '.gallery-item', '.gp-item', '.testimonial-wrapper', '.cta-box', '.stat',
      '.hero-content', '.split-feature-img', '.split-feature-content',
      '.nav-brand', '.btn', '.order-box', '.about-story-img', '.about-story-text'
    ].join(',');
    document.querySelectorAll(MOVABLE_SELECTOR).forEach(el => {
      if (el.closest('#admin-gate,#admin-toolbar')) return;
      attachMovable(el);
    });

    // prevent links from navigating away while editing
    document.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => { if (editModeOn) e.preventDefault(); });
    });

    showToolbar();
    toast('Edit mode ON. Click text to edit. Click/drag onto any photo to replace it. Toggle "Move" to drag-reposition elements.', 6000);
  }

  function showToolbar() {
    const bar = document.createElement('div');
    bar.id = 'admin-toolbar';
    bar.innerHTML = `
      <span class="status" id="admin-status">No changes</span>
      <button class="btn-move" id="admin-move-btn">✥ Move: OFF</button>
      <button class="btn-colors" id="admin-colors-btn">🎨 Colors</button>
      <button class="btn-save" id="admin-save-btn">💾 Save &amp; Publish</button>
      <button class="btn-discard" id="admin-discard-btn">Discard</button>
      <button class="btn-logout" id="admin-logout-btn">Exit</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('admin-save-btn').addEventListener('click', publish);
    document.getElementById('admin-discard-btn').addEventListener('click', () => {
      if (confirm('Discard all unsaved changes and reload?')) location.reload();
    });
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
      if (dirty && !confirm('You have unsaved changes. Exit anyway?')) return;
      const url = new URL(location.href);
      url.searchParams.delete('admin');
      location.href = url.toString();
    });
    document.getElementById('admin-move-btn').addEventListener('click', e => {
      moveModeOn = !moveModeOn;
      document.body.classList.toggle('admin-move-mode', moveModeOn);
      e.target.textContent = moveModeOn ? '✥ Move: ON' : '✥ Move: OFF';
      e.target.classList.toggle('active', moveModeOn);
      toast(moveModeOn ? 'Move Mode ON — drag any highlighted block to reposition it.' : 'Move Mode OFF — text/image editing active.', 3000);
    });
    document.getElementById('admin-colors-btn').addEventListener('click', e => {
      toggleColorPanel();
      e.target.classList.toggle('active');
    });
  }

  function updateToolbar() {
    const s = document.getElementById('admin-status');
    if (s) s.textContent = dirty ? 'Unsaved changes' : 'No changes';
  }

  // --- Color Panel ---
  function rgbaToHex(str) {
    // supports 'rgba(r,g,b,a)' or plain hex; returns {hex, alpha}
    const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/.exec(str);
    if (!m) return { hex: str.trim(), alpha: 1 };
    const [, r, g, b, a] = m;
    const hex = '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
    return { hex, alpha: a !== undefined ? parseFloat(a) : 1 };
  }

  function getRootVarValue(key) {
    return getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  }

  function applyColorVar(key, hexValue) {
    document.documentElement.style.setProperty(key, hexValue);
    colorChanges[key] = hexValue;
    markDirty();
  }

  function buildColorPanel() {
    if (document.getElementById('admin-color-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'admin-color-panel';
    let rowsHtml = '<h3>🎨 Website Colors</h3>';
    EDITABLE_COLOR_VARS.forEach(v => {
      const raw = getRootVarValue(v.key) || '#000000';
      const { hex } = rgbaToHex(raw);
      rowsHtml += `
        <div class="swatch-row" data-var="${v.key}">
          <label>${v.label}</label>
          <input type="color" value="${hex}" data-var-input="${v.key}">
          <input type="text" value="${hex}" data-var-text="${v.key}">
        </div>`;
    });
    rowsHtml += `
      <div class="panel-actions">
        <button class="btn-reset-colors" id="admin-reset-colors">Reset All</button>
        <button class="btn-close-colors" id="admin-close-colors">Done</button>
      </div>`;
    panel.innerHTML = rowsHtml;
    document.body.appendChild(panel);

    panel.querySelectorAll('input[type=color]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.dataset.varInput;
        applyColorVar(key, input.value);
        const textInput = panel.querySelector(`input[type=text][data-var-text="${key}"]`);
        if (textInput) textInput.value = input.value;
      });
    });
    panel.querySelectorAll('input[type=text]').forEach(input => {
      input.addEventListener('change', () => {
        const key = input.dataset.varText;
        let val = input.value.trim();
        if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val)) { toast('Enter a valid hex color like #c9a55c'); return; }
        applyColorVar(key, val);
        const colorInput = panel.querySelector(`input[type=color][data-var-input="${key}"]`);
        if (colorInput) colorInput.value = val;
      });
    });
    document.getElementById('admin-reset-colors').addEventListener('click', () => {
      if (!confirm('Reset all colors to the last published values?')) return;
      Object.keys(colorChanges).forEach(k => delete colorChanges[k]);
      panel.remove();
      location.reload();
    });
    document.getElementById('admin-close-colors').addEventListener('click', toggleColorPanel);
  }

  function toggleColorPanel() {
    colorPanelOpen = !colorPanelOpen;
    buildColorPanel();
    const panel = document.getElementById('admin-color-panel');
    if (panel) panel.classList.toggle('open', colorPanelOpen);
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
    const pending = Array.from(document.querySelectorAll('[data-pending-upload="true"]'));
    let i = 0;
    for (const el of pending) {
      i++;
      const dataUrl = el.dataset.newImageData;
      const mime = el.dataset.newImageMime || 'image/png';
      const isBackground = el.dataset.isBackground === 'true';
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
      if (isBackground) {
        el.style.backgroundImage = `url('${filename}')`;
      } else {
        el.src = filename;
      }
      el.removeAttribute('data-pending-upload');
      el.removeAttribute('data-new-image-data');
      el.removeAttribute('data-new-image-mime');
      el.removeAttribute('data-is-background');
    }
  }

  function getCleanHTML() {
    const clone = document.documentElement.cloneNode(true);
    // strip cursor-glow div injected at runtime by main.js (id-less, fixed-position, not part of source)
    clone.querySelectorAll('div[style*="radial-gradient"][style*="pointer-events: none"]').forEach(el => el.remove());
    // strip any browser-extension-injected <script> tags (not part of our own site scripts)
    clone.querySelectorAll('script').forEach(el => {
      const src = el.getAttribute('src');
      const allowed = ['main.js', 'cart.js', 'editor.js'];
      if (!src && el.textContent && !el.hasAttribute('data-bakely-inline')) {
        // only keep inline scripts we intentionally authored (none currently) — drop unknown inline scripts
        el.remove();
      } else if (src && !allowed.some(a => src.endsWith(a)) && !src.startsWith('https://')) {
        el.remove();
      }
    });
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.admin-editable').forEach(el => el.classList.remove('admin-editable'));
    clone.querySelectorAll('.admin-img-target').forEach(el => el.classList.remove('admin-img-target'));
    clone.querySelectorAll('.admin-movable').forEach(el => el.classList.remove('admin-movable'));
    clone.querySelectorAll('.admin-drag-over').forEach(el => el.classList.remove('admin-drag-over'));
    clone.querySelectorAll('.admin-dragging').forEach(el => el.classList.remove('admin-dragging'));
    clone.querySelectorAll('.admin-reset-btn').forEach(el => el.remove());
    clone.classList.remove('admin-move-mode');
    const gate = clone.querySelector('#admin-gate'); if (gate) gate.remove();
    const bar = clone.querySelector('#admin-toolbar'); if (bar) bar.remove();
    const colorPanel = clone.querySelector('#admin-color-panel'); if (colorPanel) colorPanel.remove();
    const toastEl = clone.querySelector('#admin-toast'); if (toastEl) toastEl.remove();
    const styleEl = clone.querySelector('#admin-edit-styles'); if (styleEl) styleEl.remove();
    // strip any inline CSS var overrides used for live color preview — the real
    // values live in styles.css, published separately by publishColorChanges()
    if (clone.hasAttribute('style')) {
      const s = clone.getAttribute('style') || '';
      if (/--[a-z-]+\s*:/.test(s)) clone.removeAttribute('style');
    }
    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  async function publishColorChanges() {
    const keys = Object.keys(colorChanges);
    if (keys.length === 0) return;
    toast('Updating site colors...', 5000);
    const current = await ghRequest(`styles.css?ref=${REPO_BRANCH}`, { method: 'GET' });
    let css = decodeURIComponent(escape(atob(current.content.replace(/\n/g, ''))));
    keys.forEach(key => {
      const value = colorChanges[key];
      const re = new RegExp(`(${key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*)[^;]+;`);
      if (re.test(css)) {
        css = css.replace(re, `$1${value};`);
      } else {
        css = css.replace(/:root\s*{/, `:root {\n  ${key}: ${value};`);
      }
    });
    await ghRequest('styles.css', {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Admin edit: update site colors via live editor',
        content: b64EncodeUnicode(css),
        sha: current.sha,
        branch: REPO_BRANCH
      })
    });
  }

  async function publish() {
    if (saving) return;
    saving = true;
    const btn = document.getElementById('admin-save-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Publishing...'; }
    try {
      await uploadPendingImages();
      await publishColorChanges();
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
      Object.keys(colorChanges).forEach(k => delete colorChanges[k]);
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
