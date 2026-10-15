(() => {
  const saved = localStorage.getItem('imAssessmentLang') || 'en';
  const apply = (lang) => {
    const safe = lang === 'kn' ? 'kn' : 'en';
    document.documentElement.setAttribute('data-assessment-lang', safe);
    localStorage.setItem('imAssessmentLang', safe);
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
