// Assessments are available in English only, including old bookmarked links.
(() => {
  document.documentElement.lang = 'en';
  document.querySelectorAll('.assessment-start-link').forEach(link => {
    const url = new URL(link.href);
    url.searchParams.delete('lang');
    link.href = url.toString();
  });
})();
