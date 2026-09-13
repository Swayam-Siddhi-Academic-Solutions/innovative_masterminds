(() => {
  const cfg = window.IM_SUPABASE_CONFIG || {};
  const hasConfig =
    typeof cfg.url === 'string' &&
    cfg.url.startsWith('https://') &&
    !cfg.url.includes('PASTE_') &&
    typeof cfg.publishableKey === 'string' &&
    cfg.publishableKey.length > 20 &&
    !cfg.publishableKey.includes('PASTE_');

  const gallery = document.getElementById('cloudMediaGallery');
  const galleryStatus = document.getElementById('galleryStatus');
  const emptyGallery = document.getElementById('emptyGallery');
  const setupGallery = document.getElementById('setupGallery');

  const loginBtn = document.getElementById('adminLoginBtn');
  const signOutBtn = document.getElementById('adminSignOutBtn');
  const uploadBtn = document.getElementById('cloudUploadBtn');

  const loginModal = document.getElementById('adminLoginModal');
  const uploadModal = document.getElementById('cloudUploadModal');
  const loginForm = document.getElementById('adminLoginForm');
  const adminEmail = document.getElementById('adminEmail');
  const adminPassword = document.getElementById('adminPassword');
  const loginMessage = document.getElementById('adminLoginMessage');

  const mediaInput = document.getElementById('cloudMediaInput');
  const dropZone = document.getElementById('cloudDropZone');
  const selectedFiles = document.getElementById('selectedFiles');
  const clearSelected = document.getElementById('clearSelectedFiles');
  const uploadStart = document.getElementById('startCloudUpload');
  const progressWrap = document.getElementById('uploadProgressWrap');
  const progressBar = document.getElementById('uploadProgressBar');
  const progressText = document.getElementById('uploadProgressText');

  const lightbox = document.getElementById('cloudLightbox');
  const lightboxClose = document.getElementById('cloudLightboxClose');
  const lightboxContent = document.getElementById('cloudLightboxContent');

  let supabaseClient = null;
  let isAdmin = false;
  let pendingFiles = [];

  const bucket = cfg.bucket || 'gallery';
  const expectedAdminEmail = (cfg.adminEmail || '').toLowerCase();

  function show(el) { el?.classList.remove('is-hidden'); }
  function hide(el) { el?.classList.add('is-hidden'); }

  function openModal(el) {
    if (!el) return;
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(document.getElementById(btn.dataset.closeModal));
    });
  });

  [loginModal, uploadModal].forEach(modal => {
    modal?.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal(loginModal);
      closeModal(uploadModal);
      closeLightbox();
    }
  });

  function setStatus(text, type = '') {
    if (!galleryStatus) return;
    galleryStatus.textContent = text;
    galleryStatus.className = `gallery-status ${type}`.trim();
  }

  function humanFileSize(bytes = 0) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B','KB','MB','GB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) {
      n /= 1024;
      i += 1;
    }
    return `${n.toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  function prettyName(name = '') {
    return name
      .replace(/^\d{13}-[a-z0-9-]+-/i, '')
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }

  function isVideo(name = '', metadata = {}) {
    const mime = metadata?.mimetype || metadata?.contentType || '';
    return mime.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(name);
  }

  function publicUrl(path) {
    return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  function openLightbox(url, video) {
    if (!lightbox || !lightboxContent) return;
    lightboxContent.innerHTML = video
      ? `<video src="${url}" controls autoplay playsinline></video>`
      : `<img src="${url}" alt="Gallery media">`;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    if (!lightbox || !lightboxContent) return;
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxContent.innerHTML = '';
  }

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  async function deleteMedia(path) {
    if (!isAdmin) return;
    const ok = confirm('Delete this item permanently from the public gallery?');
    if (!ok) return;

    setStatus('Deleting media…');
    const { error } = await supabaseClient.storage.from(bucket).remove([path]);
    if (error) {
      console.error(error);
      setStatus(`Delete failed: ${error.message}`, 'error');
      return;
    }
    setStatus('Media deleted.', 'success');
    await loadGallery();
  }

  function renderItem(item) {
    const url = publicUrl(item.name);
    const video = isVideo(item.name, item.metadata);
    const card = document.createElement('article');
    card.className = 'cloud-media-card reveal visible';

    const mediaMarkup = video
      ? `<video src="${url}" muted playsinline preload="metadata"></video><span class="cloud-media-badge">VIDEO</span>`
      : `<img src="${url}" alt="${prettyName(item.name) || 'Gallery photo'}" loading="lazy"><span class="cloud-media-badge">PHOTO</span>`;

    const size = humanFileSize(item.metadata?.size || 0);
    card.innerHTML = `
      <button class="cloud-media-open" type="button" aria-label="Open ${video ? 'video' : 'photo'}">
        <div class="cloud-media-frame">${mediaMarkup}<span class="cloud-view-pill">View</span></div>
      </button>
      <div class="cloud-media-info">
        <div>
          <strong>${prettyName(item.name) || 'Gallery media'}</strong>
          <small>${size || (video ? 'Video' : 'Photo')}</small>
        </div>
        <button class="cloud-delete-btn ${isAdmin ? '' : 'is-hidden'}" type="button">Delete</button>
      </div>`;

    card.querySelector('.cloud-media-open')?.addEventListener('click', () => openLightbox(url, video));
    card.querySelector('.cloud-delete-btn')?.addEventListener('click', () => deleteMedia(item.name));
    return card;
  }

  async function loadGallery() {
    if (!hasConfig || !supabaseClient) return;

    hide(setupGallery);
    hide(emptyGallery);
    setStatus('Loading gallery…');
    gallery.innerHTML = '';

    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      });

    if (error) {
      console.error(error);
      setStatus(`Gallery could not load: ${error.message}`, 'error');
      return;
    }

    const files = (data || []).filter(item => item.id !== null && item.name !== '.emptyFolderPlaceholder');

    if (!files.length) {
      setStatus('');
      show(emptyGallery);
      return;
    }

    const fragment = document.createDocumentFragment();
    files.forEach(item => fragment.appendChild(renderItem(item)));
    gallery.appendChild(fragment);
    setStatus(`${files.length} media item${files.length === 1 ? '' : 's'} in the public gallery.`, 'success');
  }

  async function refreshAdminState(session) {
    const email = (session?.user?.email || '').toLowerCase();
    isAdmin = Boolean(session && email === expectedAdminEmail);

    if (isAdmin) {
      hide(loginBtn);
      show(uploadBtn);
      show(signOutBtn);
    } else {
      show(loginBtn);
      hide(uploadBtn);
      hide(signOutBtn);

      if (session && email && email !== expectedAdminEmail) {
        await supabaseClient.auth.signOut();
      }
    }

    document.querySelectorAll('.cloud-delete-btn').forEach(btn => {
      btn.classList.toggle('is-hidden', !isAdmin);
    });
  }

  loginBtn?.addEventListener('click', () => {
    if (!hasConfig) {
      show(setupGallery);
      setupGallery?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    loginMessage.textContent = '';
    adminPassword.value = '';
    openModal(loginModal);
    setTimeout(() => adminPassword?.focus(), 150);
  });

  loginForm?.addEventListener('submit', async e => {
    e.preventDefault();
    loginMessage.textContent = 'Signing in…';

    const email = adminEmail.value.trim().toLowerCase();
    if (email !== expectedAdminEmail) {
      loginMessage.textContent = 'This email is not authorised for gallery administration.';
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: adminPassword.value
    });

    if (error) {
      console.error(error);
      loginMessage.textContent = 'Sign-in failed. Check the email/password and Supabase Auth user.';
      return;
    }

    await refreshAdminState(data.session);
    closeModal(loginModal);
    loginMessage.textContent = '';
    await loadGallery();
  });

  signOutBtn?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    await refreshAdminState(null);
    setStatus('Admin signed out.', 'success');
  });

  uploadBtn?.addEventListener('click', () => {
    if (!isAdmin) return;
    pendingFiles = [];
    if (mediaInput) mediaInput.value = '';
    renderPendingFiles();
    hide(progressWrap);
    openModal(uploadModal);
  });

  function renderPendingFiles() {
    if (!selectedFiles) return;
    selectedFiles.innerHTML = '';
    if (!pendingFiles.length) {
      selectedFiles.innerHTML = '<p class="selected-empty">No files selected yet.</p>';
      return;
    }

    pendingFiles.forEach((file, index) => {
      const row = document.createElement('div');
      row.className = 'selected-file-row';
      row.innerHTML = `
        <div><strong>${file.name}</strong><small>${humanFileSize(file.size)} • ${file.type || 'media'}</small></div>
        <button type="button" aria-label="Remove file">×</button>`;
      row.querySelector('button').addEventListener('click', () => {
        pendingFiles.splice(index, 1);
        renderPendingFiles();
      });
      selectedFiles.appendChild(row);
    });
  }

  function acceptFiles(fileList) {
    const allowed = [
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime'
    ];
    const maxBytes = 50 * 1024 * 1024;

    [...fileList].forEach(file => {
      if (!allowed.includes(file.type)) return;
      if (file.size > maxBytes) return;
      pendingFiles.push(file);
    });
    renderPendingFiles();
  }

  mediaInput?.addEventListener('change', e => acceptFiles(e.target.files));

  ['dragenter','dragover'].forEach(evt => {
    dropZone?.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave','drop'].forEach(evt => {
    dropZone?.addEventListener(evt, e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone?.addEventListener('drop', e => acceptFiles(e.dataTransfer.files));

  clearSelected?.addEventListener('click', () => {
    pendingFiles = [];
    if (mediaInput) mediaInput.value = '';
    renderPendingFiles();
  });

  function safeFileName(name) {
    const clean = name
      .normalize('NFKD')
      .replace(/[^\w.\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return clean || 'media';
  }

  uploadStart?.addEventListener('click', async () => {
    if (!isAdmin || !pendingFiles.length) return;

    show(progressWrap);
    uploadStart.disabled = true;
    clearSelected.disabled = true;

    let completed = 0;
    const total = pendingFiles.length;

    for (const file of pendingFiles) {
      progressText.textContent = `Uploading ${completed + 1} of ${total}: ${file.name}`;
      const pct = Math.round((completed / total) * 100);
      progressBar.style.width = `${pct}%`;

      const stamp = Date.now();
      const id = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
      const path = `${stamp}-${id}-${safeFileName(file.name)}`;

      const { error } = await supabaseClient.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          contentType: file.type || undefined,
          upsert: false
        });

      if (error) {
        console.error(error);
        progressText.textContent = `Upload stopped: ${error.message}`;
        progressBar.style.width = '100%';
        progressBar.classList.add('error');
        uploadStart.disabled = false;
        clearSelected.disabled = false;
        return;
      }

      completed += 1;
      progressBar.style.width = `${Math.round((completed / total) * 100)}%`;
    }

    progressText.textContent = 'Upload complete.';
    progressBar.style.width = '100%';

    setTimeout(async () => {
      closeModal(uploadModal);
      pendingFiles = [];
      renderPendingFiles();
      progressBar.style.width = '0%';
      progressBar.classList.remove('error');
      uploadStart.disabled = false;
      clearSelected.disabled = false;
      await loadGallery();
    }, 600);
  });

  async function init() {
    if (!hasConfig) {
      setStatus('');
      hide(emptyGallery);
      show(setupGallery);
      hide(uploadBtn);
      hide(signOutBtn);
      show(loginBtn);
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(cfg.url, cfg.publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      const { data: { session } } = await supabaseClient.auth.getSession();
      await refreshAdminState(session);

      supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        await refreshAdminState(session);
      });

      await loadGallery();
    } catch (error) {
      console.error(error);
      setStatus('Supabase configuration could not be initialized.', 'error');
    }
  }

  init();
})();