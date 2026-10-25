(() => {
  'use strict';
  const config = window.SSAS_MATH_BOOKING || {};
  // Activated booking pages are hosted by the teacher's authorized Google app.
  // The catalogue remains useful while calendar reservations are unavailable.
  if (config.bookingUrl) {
    try {
      const url = new URL(config.bookingUrl);
      if (url.origin === 'https://script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) {
        window.location.replace(url.href);
        return;
      }
    } catch (_) { /* Keep the catalogue open when no valid live URL is set. */ }
  }

  const $ = id => document.getElementById(id);
  const OTHER = 'Other – Enter Your Topic';
  const state = { catalogue: {}, art: {}, topic: '', query: '' };
  const board = $('math-board'), grade = $('math-grade'), search = $('math-search');
  const grid = $('math-topic-grid'), subtopic = $('math-subtopic');
  const custom = $('math-custom'), difficulty = $('math-difficulty');
  const fees = Object.freeze({ Beginner: 599, Intermediate: 599, Advanced: 899 });
  const collator = new Intl.Collator('en', { numeric: true });
  const topics = () => state.catalogue[board.value]?.[grade.value] || {};

  function optionList(select, values, label = v => v) {
    select.replaceChildren(...values.map(value => {
      const el = document.createElement('option');
      el.value = value;
      el.textContent = label(value);
      return el;
    }));
  }

  function updateContact() {
    $('math-fee').textContent = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0
    }).format(fees[difficulty.value]);
    const lesson = state.topic === OTHER ? custom.value.trim() : subtopic.value;
    const lines = [
      'Hello Abhilash, I would like to discuss a maths class.',
      `Syllabus: ${board.value}`,
      `Grade / stage: ${grade.value}`,
      `Topic: ${state.topic}`,
      `Lesson: ${lesson || 'I will share the topic details'}`,
      `Difficulty: ${difficulty.value}`,
      'Please help me arrange an available class time before I make payment.'
    ];
    $('math-contact').href = `https://wa.me/${config.whatsapp || '919945525562'}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  function renderTopics() {
    const all = Object.keys(topics()).sort((a, b) =>
      a === OTHER ? 1 : b === OTHER ? -1 : collator.compare(a, b));
    const visible = all.filter(topic => topic.toLowerCase().includes(state.query) ||
      topics()[topic].some(lesson => lesson.toLowerCase().includes(state.query)));
    const scrollPosition = grid.scrollTop;
    grid.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'studio-empty';
      empty.textContent = 'No matching topics here. Clear the search or choose another grade. You can also select “Other – Enter Your Topic”.';
      grid.appendChild(empty);
    }
    for (const topic of visible) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'studio-topic-card';
      button.setAttribute('aria-pressed', String(state.topic === topic));
      const src = state.art[topic] || state.art[OTHER] || '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        button.appendChild(img);
      }
      const name = document.createElement('strong');
      name.textContent = topic;
      button.appendChild(name);
      const count = document.createElement('small');
      count.textContent = topic === OTHER ? 'Tell us what you need to learn' : `${topics()[topic].length} lesson choices`;
      button.appendChild(count);
      button.addEventListener('click', () => { selectTopic(topic); grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); });
      grid.appendChild(button);
    }
    $('math-topic-count').textContent = `${visible.length} of ${all.length} topic groups · Choose a card to see its lessons`;
    grid.scrollTop = scrollPosition;
    grid.setAttribute('aria-busy', 'false');
  }

  function selectTopic(topic) {
    state.topic = topic;
    const isOther = topic === OTHER;
    $('math-selected-topic').textContent = topic;
    $('math-custom-label').hidden = !isOther;
    $('math-subtopic-label').hidden = isOther;
    optionList(subtopic, topics()[topic] || []);
    subtopic.disabled = isOther;
    const matchingLesson = state.query && (topics()[topic] || []).find(lesson => lesson.toLowerCase().includes(state.query));
    if (matchingLesson) subtopic.value = matchingLesson;
    const img = $('math-selected-art');
    const src = state.art[topic] || state.art[OTHER] || '';
    img.hidden = !src;
    if (src) img.src = src;
    renderTopics();
    updateContact();
  }

  function gradeChanged() {
    state.query = '';
    search.value = '';
    custom.value = '';
    const all = Object.keys(topics());
    selectTopic(all.includes('Quadratic Equations') ? 'Quadratic Equations' : all.find(t => t !== OTHER) || OTHER);
  }

  function boardChanged() {
    const grades = Object.keys(state.catalogue[board.value]).sort(collator.compare);
    optionList(grade, grades, value => /^\d+$/.test(value) ? `Grade ${value}` : value);
    if (grades.includes('10')) grade.value = '10';
    gradeChanged();
  }

  board.addEventListener('change', boardChanged);
  grade.addEventListener('change', gradeChanged);
  search.addEventListener('input', () => { state.query = search.value.trim().toLowerCase(); renderTopics(); });
  subtopic.addEventListener('change', updateContact);
  custom.addEventListener('input', updateContact);
  difficulty.addEventListener('change', updateContact);

  fetch('math-topics.json').then(response => {
    if (!response.ok) throw new Error(`Catalogue response ${response.status}`);
    return response.json();
  }).then(data => {
    if (!data.catalogue || !Object.keys(data.catalogue).length || !data.art) throw new Error('Invalid catalogue');
    state.catalogue = data.catalogue;
    state.art = data.art;
    optionList(board, Object.keys(state.catalogue));
    if (state.catalogue['CBSE / NCERT']) board.value = 'CBSE / NCERT';
    board.disabled = grade.disabled = search.disabled = false;
    boardChanged();
  }).catch(error => {
    console.error('Math catalogue could not load:', error);
    grid.setAttribute('aria-busy', 'false');
    $('math-topic-count').textContent = 'We could not load the topics. Refresh the page or contact us for help.';
    $('math-contact').textContent = 'Contact us about a maths class →';
  });
})();
