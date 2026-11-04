/* Live Midnight Lab navigation and optional decorative motion. */
(()=>{
 const nav=document.getElementById('siteNav'),menu=document.getElementById('menuButton');
 const closeMenu=()=>{nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false')};
 menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});
 nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();const dialog=document.getElementById('featureDialog');if(dialog?.open)dialog.close()}});
 const motion=document.getElementById('midnightMotion'),reduced=matchMedia('(prefers-reduced-motion:reduce)');let paused=false;
 function sync(){document.documentElement.classList.toggle('motion-paused',paused||reduced.matches);if(motion){motion.disabled=reduced.matches;motion.setAttribute('aria-pressed',String(paused||reduced.matches));motion.textContent=reduced.matches?'Reduced motion enabled':paused?'Play animations':'Pause animations'}}
 motion?.addEventListener('click',()=>{paused=!paused;sync()});reduced.addEventListener('change',sync);sync();
 const dialog=document.getElementById('featureDialog'),title=document.getElementById('featureTitle'),body=document.getElementById('featureBody');
 document.querySelectorAll('[data-art]').forEach(button=>button.addEventListener('click',()=>{const image=button.querySelector('img');if(!image||!dialog)return;title.textContent=image.alt||'Learning in focus';body.replaceChildren();const copy=image.cloneNode();copy.className='midnight-art-preview';copy.alt=image.alt;body.append(copy);dialog.showModal()}));
 document.getElementById('closeFeature')?.addEventListener('click',()=>dialog.close());
 if('IntersectionObserver' in window){const sections=[...document.querySelectorAll('section[id]')];const watch=new IntersectionObserver(entries=>{for(const e of entries){if(!e.isIntersecting)continue;nav?.querySelectorAll('[data-scroll]').forEach(a=>a.classList.toggle('is-current',a.dataset.scroll===e.target.id))}},{rootMargin:'-20% 0px -60% 0px'});sections.forEach(s=>watch.observe(s))}
})();
