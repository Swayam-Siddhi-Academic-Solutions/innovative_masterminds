(() => {
  let saved = 'en';
  try { saved = localStorage.getItem('imAssessmentLang') || 'en'; } catch {}
  const apply = (lang) => {
    const safe = lang === 'kn' ? 'kn' : 'en';
    document.documentElement.setAttribute('data-assessment-lang', safe);
    try { localStorage.setItem('imAssessmentLang', safe); } catch {}
    document.documentElement.lang = safe;
    document.querySelectorAll('a[data-assessment-grade]').forEach(link => {
      const url = new URL(link.href);
      url.searchParams.set('lang', safe);
      link.href = url.toString();
    });
    document.querySelectorAll('[data-assessment-lang-choice]').forEach(btn => {
      const active = btn.dataset.assessmentLangChoice === safe;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  };
  document.querySelectorAll('[data-assessment-lang-choice]').forEach(btn => {
    btn.addEventListener('click', () => apply(btn.dataset.assessmentLangChoice));
  });
  apply(saved);
})();

