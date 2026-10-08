
document.getElementById('year').textContent = new Date().getFullYear();

const menuBtn = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

// Keep the Learning Plans & Fees tab next to Reviews across all website pages.
if (nav && !nav.querySelector('a[href="commercials.html"]')) {
  const reviewsLink = nav.querySelector('a[href="reviews.html"]');
  const plansLink = document.createElement('a');
  plansLink.href = 'commercials.html';
  plansLink.textContent = 'Learning Plans & Fees';
  if (reviewsLink) {
    reviewsLink.insertAdjacentElement('afterend', plansLink);
  } else {
    nav.appendChild(plansLink);
  }
} else if (nav) {
  const plansLink = nav.querySelector('a[href="commercials.html"]');
  if (plansLink) plansLink.textContent = 'Learning Plans & Fees';
}

// Add Free Assessment immediately after Learning Plans & Fees across the site.
if (nav && !nav.querySelector('a[href="assessment.html"]')) {
  const plansLink = nav.querySelector('a[href="commercials.html"]');
  const assessmentLink = document.createElement('a');
  assessmentLink.href = 'assessment.html';
  assessmentLink.textContent = 'Free Assessment';
  if (plansLink) {
    plansLink.insertAdjacentElement('afterend', assessmentLink);
  } else {
    nav.appendChild(assessmentLink);
  }
}

// On the cover page, replace Explore Verticals with Learning Plans & Fees.
const coverPlansButton = document.querySelector('.hero-actions a.btn-gradient[href="services.html"]');
if (coverPlansButton) {
  coverPlansButton.href = 'commercials.html';
  coverPlansButton.innerHTML = 'Learning Plans & Fees <span>→</span>';
  coverPlansButton.setAttribute('aria-label', 'View Learning Plans and Fees');
}

// Add a prominent Free Student Assessment button on the cover page.
const heroActions = document.querySelector('.hero-actions');
if (heroActions && !heroActions.querySelector('a[href="assessment.html"]')) {
  const assessmentButton = document.createElement('a');
  assessmentButton.className = 'btn btn-glass free-assessment-cta';
  assessmentButton.href = 'assessment.html';
  assessmentButton.textContent = 'Free Student Assessment';
  assessmentButton.setAttribute('aria-label', 'Take the Free Student Assessment');
  const whatsappButton = heroActions.querySelector('a[href^="https://wa.me/"]');
  if (whatsappButton) {
    heroActions.insertBefore(assessmentButton, whatsappButton);
  } else {
    heroActions.appendChild(assessmentButton);
  }
}

menuBtn?.addEventListener('click', () => {
  nav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', nav.classList.contains('open'));
});
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// cursor glow
const glow = document.querySelector('.cursor-glow');
window.addEventListener('mousemove', e => {
  if (!glow) return;
  glow.style.left = e.clientX + 'px';
  glow.style.top = e.clientY + 'px';
});

// reveal on scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {threshold: 0.12});
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// counter
document.querySelectorAll('.counter').forEach(el => {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = parseFloat(el.dataset.target || '0');
      const startTime = performance.now();
      const duration = 900;
      function tick(now){
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = (target * eased).toFixed(1);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, {threshold: .5});
  observer.observe(el);
});

// uploader
const openUploader = document.getElementById('openUploader');
const closeUploader = document.getElementById('closeUploader');
const uploadPanel = document.getElementById('uploadPanel');
const mediaInput = document.getElementById('mediaInput');
const dropZone = document.getElementById('dropZone');
const uploadPreview = document.getElementById('uploadPreview');
const mediaGallery = document.getElementById('mediaGallery');
const clearMedia = document.getElementById('clearMedia');

function setUploader(open){
  if (!uploadPanel) return;
  uploadPanel.classList.toggle('open', open);
  uploadPanel.setAttribute('aria-hidden', String(!open));
}
openUploader?.addEventListener('click', () => setUploader(true));
closeUploader?.addEventListener('click', () => setUploader(false));
uploadPanel?.addEventListener('click', e => { if (e.target === uploadPanel) setUploader(false); });

function addFiles(files){
  [...files].forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);

    const preview = document.createElement('div');
    preview.className = 'preview-item';
    preview.innerHTML = file.type.startsWith('video/')
      ? `<video src="${url}" muted playsinline></video><span>${file.name}</span>`
      : `<img src="${url}" alt="${file.name}"><span>${file.name}</span>`;
    uploadPreview.appendChild(preview);

    const item = document.createElement('article');
    item.className = 'media-item';
    item.dataset.url = url;
    item.dataset.kind = file.type.startsWith('video/') ? 'video' : 'image';
    item.innerHTML = file.type.startsWith('video/')
      ? `<span class="media-type">VIDEO</span><video src="${url}" muted playsinline></video>`
      : `<span class="media-type">PHOTO</span><img src="${url}" alt="${file.name}">`;
    item.addEventListener('click', () => openLightbox(item.dataset.url, item.dataset.kind));
    mediaGallery.prepend(item);
  });
}

mediaInput?.addEventListener('change', e => addFiles(e.target.files));
['dragenter','dragover'].forEach(evt => dropZone?.addEventListener(evt, e => {
  e.preventDefault(); dropZone.classList.add('dragover');
}));
['dragleave','drop'].forEach(evt => dropZone?.addEventListener(evt, e => {
  e.preventDefault(); dropZone.classList.remove('dragover');
}));
dropZone?.addEventListener('drop', e => addFiles(e.dataTransfer.files));
clearMedia?.addEventListener('click', () => {
  uploadPreview.innerHTML = '';
  [...document.querySelectorAll('#mediaGallery .media-item')].forEach(el => el.remove());
  if (mediaInput) mediaInput.value = '';
});

// lightbox for review proofs and gallery
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxContent = document.getElementById('lightboxContent');

function openLightbox(url, kind){
  if (!lightboxContent || !lightbox) return;
  lightboxContent.innerHTML = kind === 'video'
    ? `<video src="${url}" controls autoplay></video>`
    : `<img src="${url}" alt="Preview">`;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
}
function closeLightbox(){
  if (!lightbox) return;
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxContent.innerHTML = '';
}
document.querySelectorAll('.proof-thumb').forEach(btn => {
  btn.addEventListener('click', () => openLightbox(btn.dataset.src, btn.dataset.type));
});
lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { setUploader(false); closeLightbox(); }
});
