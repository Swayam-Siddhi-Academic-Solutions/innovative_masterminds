(() => {
  const grid = document.getElementById('homeGalleryGrid');
  const cfg = window.IM_SUPABASE_CONFIG || {};

  const escapeHtml = (value = '') =>
    String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));

  const prettyName = (name = '') =>
    name
      .replace(/^\\d{13}-[a-z0-9-]+-/i, '')
      .replace(/\\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim() || 'Gallery highlight';

  const isVideo = (name = '', metadata = {}) => {
    const mime = metadata?.mimetype || metadata?.contentType || '';
    return mime.startsWith('video/') || /\\.(mp4|webm|mov|m4v)$/i.test(name);
  };

  async function loadHomeGallery() {
    if (!grid) return;

    const hasConfig =
      typeof cfg.url === 'string' &&
      cfg.url.startsWith('https://') &&
      typeof cfg.publishableKey === 'string' &&
      cfg.publishableKey.length > 20 &&
      window.supabase;

    if (!hasConfig) {
      grid.innerHTML = '<div class="home-gallery-message">Gallery highlights are temporarily unavailable. <a href="gallery.html">Open the full gallery →</a></div>';
      return;
    }

    try {
      const client = window.supabase.createClient(cfg.url, cfg.publishableKey);
      const bucket = cfg.bucket || 'gallery';
      const { data, error } = await client.storage
        .from(bucket)
        .list('', {
          limit: 6,
          offset: 0,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (error) throw error;

      const files = (data || []).filter(
        item => item.id !== null && item.name !== '.emptyFolderPlaceholder'
      );

      if (!files.length) {
        grid.innerHTML = '<div class="home-gallery-message">New gallery uploads will appear here automatically. <a href="gallery.html">Visit Gallery →</a></div>';
        return;
      }

      grid.innerHTML = files.map(item => {
        const url = client.storage.from(bucket).getPublicUrl(item.name).data.publicUrl;
        const video = isVideo(item.name, item.metadata);
        const title = escapeHtml(prettyName(item.name));
        const media = video
          ? `<video src="${url}" muted playsinline preload="metadata"></video>`
          : `<img src="${url}" alt="${title}" loading="lazy">`;

        return `
          <a class="home-gallery-card" href="gallery.html" aria-label="View full gallery">
            ${media}
            <div class="home-gallery-overlay">
              <strong>${title}</strong>
              <span class="home-gallery-badge">${video ? 'VIDEO' : 'PHOTO'}</span>
            </div>
          </a>`;
      }).join('');
    } catch (error) {
      console.error('Homepage gallery error:', error);
      grid.innerHTML = '<div class="home-gallery-message">Could not load gallery highlights right now. <a href="gallery.html">Open Gallery →</a></div>';
    }
  }

  function renderQr() {
    const canvas = document.getElementById('siteQrCanvas');
    if (!canvas || typeof QRious === 'undefined') return;

    new QRious({
      element: canvas,
      value: 'https://swayam-siddhi-academic-solutions.github.io/innovative_masterminds/index.html',
      size: 420,
      level: 'H',
      background: 'white',
      foreground: 'black'
    });
  }

  const downloadQr = document.getElementById('downloadQr');
  downloadQr?.addEventListener('click', () => {
    const canvas = document.getElementById('siteQrCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'Innovative-Masterminds-QR.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  loadHomeGallery();
  renderQr();
})();