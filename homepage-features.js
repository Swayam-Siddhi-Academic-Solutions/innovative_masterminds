// Optional decorative motion. The assessment and reservation links work without JS.
(() => {
  const section = document.getElementById('learning-pathways');
  const control = document.getElementById('learningMotionToggle');
  if (!section || !control) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pausedByVisitor = false;
  function updateMotion() {
    const paused = pausedByVisitor || reducedMotion.matches;
    section.classList.toggle('motion-paused', paused);
    control.setAttribute('aria-pressed', String(paused));
    control.disabled = reducedMotion.matches;
    control.textContent = reducedMotion.matches ? 'Reduced motion enabled' : paused ? 'Play animations' : 'Pause animations';
  }
  control.hidden = false;
  control.addEventListener('click', () => {
    pausedByVisitor = !pausedByVisitor;
    updateMotion();
  });
  reducedMotion.addEventListener('change', updateMotion);
  updateMotion();

  if ('IntersectionObserver' in window) {
    const visibility = new IntersectionObserver(entries => {
      section.classList.toggle('is-in-view', entries.some(entry => entry.isIntersecting));
    }, {threshold: 0});
    visibility.observe(section);
  } else {
    section.classList.add('is-in-view');
  }
})();
