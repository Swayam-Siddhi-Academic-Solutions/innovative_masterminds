'use strict';
(() => {
  const {call,escape:e,titleGrade,date,showNotice,formatKey,pay}=window.IMLearning;
  const el=id=>document.getElementById(id);
  const sessionName='im-self-learning-pass-v1';
  let credentials=null, pass=null, catalogue=[], accepting=false, catalogReady=false;
  let current=null, lessonIndex=0, pendingChoice=null, expiresTimer, busy=false, accountVersion=0;
  const stateNames={awaiting_payment:'Awaiting payment',in_review:'Payment under review',needs_reference:'Payment details needed',approved:'Active',expired:'Expired'};
  const canonicalKey=k=>String(k||'').replace(/[\s-]/g,'').toLowerCase();
  const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(20)),v=>v.toString(16).padStart(2,'0')).join('');
  function remember(value) {
    credentials=value;
    try { if(value) sessionStorage.setItem(sessionName,JSON.stringify(value)); else sessionStorage.removeItem(sessionName); } catch { /* The key still works during this visit. */ }
  }
  function focusSection(id) {const n=el(id);if(n){n.focus({preventScroll:true});n.scrollIntoView({block:'start'});} }
  function clearReader(){current=null;el('reader').hidden=true;el('reader-body').replaceChildren();}
  function apply(next) {
    pass=next;
    if(pass.status!=='approved') clearReader();
    scheduleExpiry();
    renderPass(); renderList();
  }
  function scheduleExpiry(){
    clearTimeout(expiresTimer);
    if(pass?.status==='approved') {
      const delay=Date.parse(pass.endsAt)-Date.now();
      expiresTimer=setTimeout(atExpiry,Math.min(86400000,Math.max(50,delay+25)));
    }
  }
  async function atExpiry(){
    if(!pass||pass.status!=='approved')return;
    if(Date.now()>=Date.parse(pass.endsAt)) {clearReader();apply({...pass,status:'expired'});}
    try {await refresh();} catch(error){showNotice(error.message,true);} finally {scheduleExpiry();}
  }
  async function refresh(){
    if(!credentials)return;
    const version=accountVersion, next=await call('status',credentials);
    if(version===accountVersion && JSON.stringify(next)!==JSON.stringify(pass)) apply(next);
  }
  const support=(msg,label)=>'<a class="support" target="_blank" rel="noopener noreferrer" href="https://wa.me/'+e(pay.whatsapp)+'?text='+encodeURIComponent(msg)+'">'+e(label)+'</a>';
  function renderLogin(){
    return '<div class="split"><div class="surface"><h3>Start a 30-day pass</h3><p>Register the learner before paying. We’ll give you a private key to open your pass on any device.</p>'+
      '<form id="register" class="stack"><label>Learner name<input name="name" required maxlength="90" autocomplete="given-name"></label><label>Student or parent email<input name="email" type="email" required maxlength="180" autocomplete="email"></label><label>Confirm email<input name="confirmEmail" type="email" required maxlength="180" autocomplete="off"></label>'+
      '<label class="check"><input name="consent" type="checkbox" required>I understand that ₹599 gives me 30 days from payment approval and up to 10 whole chapter choices.</label>'+
      '<button type="submit" class="main" '+(accepting?'':'disabled')+'>Register for ₹599</button></form>'+
      (!accepting?'<p class="note">'+(catalogReady?'New passes are currently paused.':'Checking chapter availability…')+'</p>':'')+'</div>'+
      '<div class="surface"><h3>Return to my pass</h3><p>Use the email and private learning key you saved at registration.</p><form id="signin" class="stack"><label>Registered email<input type="email" name="email" autocomplete="email" required maxlength="180"></label><label>Learning key<input type="password" name="key" autocomplete="current-password" required maxlength="75" spellcheck="false"></label><button type="submit">Open my pass</button></form>'+
      support('Hi, I need help with my Innovative Masterminds Self Learning pass.','Get help with my learning key')+'</div></div>';
  }
  function paymentPanel(){
    const upi=new URLSearchParams({pa:pay.upiId,pn:pay.payee,am:'599.00',cu:'INR',tn:'IM Self Learning '+pass.id});
    return '<div class="surface key-panel"><h3>Pay ₹599 and submit your reference</h3><div class="split"><div><p>Scan the existing Innovative Masterminds QR or pay with a UPI app. Enter ₹599 and check the payee before confirming.</p>'+
      '<img class="pay-qr" src="'+e(pay.qr)+'" alt="Innovative Masterminds UPI payment QR code"><p>'+e(pay.payee)+' · '+e(pay.upiId)+'</p><a class="btn" href="upi://pay?'+e(upi.toString())+'">Pay ₹599 in a UPI app</a></div><div><p>After payment, enter the reference on the receipt. Your 30 days start when the ₹599 credit is verified. If you already paid, submit that reference.</p>'+
      '<form id="payment" class="stack"><label>Payer name<input name="payer" required maxlength="90"></label><label>UPI transaction reference (UTR)<input name="ref" required minlength="8" maxlength="60" spellcheck="false" autocomplete="off"></label><label class="check"><input type="checkbox" name="paid" required>I have paid ₹599 for this pass.</label><button class="main" type="submit">Submit for payment review</button></form>'+
      support('Hi, I paid ₹599 for my Self Learning pass '+pass.id+'. I would like to share my payment screenshot.','Share a payment screenshot on WhatsApp')+'</div></div></div>';
  }
  function keyCard(){
    return '<details id="saved-key"><summary>Save my private learning key</summary><p>Keep this key with your registered email. Anyone with both can open your pass.</p><code class="key">'+e(formatKey(credentials.key))+'</code>'+
      '<button type="button" data-task="download-key">Download key</button></details>';
  }
  function selectedCards(){
    const cards=pass.chapters.map(ch=>'<article class="card"><p class="lesson-meta">'+e(ch.board)+' · '+e(titleGrade(ch.grade))+'</p><h4>'+e(ch.title)+'</h4><p>'+ch.done+' of '+ch.total+' lessons complete</p><button type="button" data-open="'+e(ch.id)+'">Open chapter</button></article>').join('');
    return '<h3>My chapters</h3><p>'+pass.chapters.length+' of 10 choices used. You can open every lesson in a chosen chapter until '+e(date(pass.endsAt))+'.</p>'+
      (cards?'<div class="cards">'+cards+'</div>':'')+(pass.chapters.length<10?'<div class="actions"><a class="btn main" href="#catalogue">Choose a whole chapter</a></div>':'');
  }
  function renderPass(){
    const box=el('account');
    if(!credentials || !pass){
      if(credentials){box.innerHTML='<div class="surface"><p>Opening your learning pass…</p><div class="actions"><button data-task="refresh" type="button">Retry</button><button data-task="logout" type="button">Use another pass</button></div></div>';return;}
      box.innerHTML=renderLogin();return;
    }
    let detail='';
    if(pass.status==='in_review')detail='<p class="note">We received reference <strong>'+e(pass.reference)+'</strong>. We’ll activate your pass after checking the bank credit. Your 30 days have yet to start.</p>'+
      support('Hi, I submitted my ₹599 payment for Self Learning. My pass is '+pass.id+'.','Send my screenshot on WhatsApp');
    if(pass.status==='needs_reference')detail='<p class="note warn">'+e(pass.reviewNote)+'</p>';
    if(pass.status==='expired')detail='<p>This pass ended on '+e(date(pass.endsAt))+'. A new ₹599 payment gives you another 30 days and a fresh set of 10 choices. Your completed lessons are saved.</p>'+
      '<button type="button" data-task="renew" '+(accepting?'':'disabled')+'>Start a new 30-day pass</button>';
    box.innerHTML='<div class="surface"><div class="hrow"><div><span class="tag">'+e(stateNames[pass.status])+'</span><h3>'+e(pass.name)+'</h3><p class="muted">'+e(pass.email)+'</p></div><div class="reader-controls"><button data-task="refresh" type="button">Refresh status</button><button data-task="logout" type="button">Sign out</button></div></div>'+
      detail+keyCard()+(pass.status==='approved'?'<div class="lesson-part">'+selectedCards()+'</div>':'')+'</div>'+
      (['awaiting_payment','needs_reference'].includes(pass.status)?paymentPanel():'');
  }
  function option(val,label=val){return '<option value="'+e(val)+'">'+e(label)+'</option>';}
  function fillGrades(){
    const grades=[...new Set(catalogue.filter(c=>c.board===el('board').value).map(c=>c.grade))].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    el('grade').innerHTML=grades.map(g=>option(g,titleGrade(g))).join('');el('grade').disabled=!grades.length;renderList();
  }
  async function loadCatalog(){
    try{
      const data=await call('catalog');catalogue=data.chapters;accepting=data.accepting;catalogReady=true;
      const boards=[...new Set(catalogue.map(c=>c.board))];el('board').innerHTML=boards.map(b=>option(b)).join('');el('board').disabled=!boards.length;
      if(boards.includes('CBSE / NCERT'))el('board').value='CBSE / NCERT';
      el('library-size').textContent=catalogue.length+' chapters · '+boards.length+' curricula and tracks';fillGrades();
      if(!pass){ if(el('register')){el('register').querySelector('button[type=submit]').disabled=!accepting;const n=el('register').parentElement.querySelector('.note');if(n){if(accepting)n.remove();else n.textContent='New passes are currently paused.';}}else renderPass();}else renderPass();
    } catch(error){el('cat-status').innerHTML=e(error.message)+' <button data-task="load-catalogue" type="button">Retry catalogue</button>'; }
  }
  function renderList(){
    if(!catalogReady)return;
    const filter=el('search').value.trim().toLocaleLowerCase('en');
    const rows=catalogue.filter(c=>c.board===el('board').value && c.grade===el('grade').value && (!filter||[c.title,...c.lessons].some(s=>s.toLowerCase().includes(filter))));
    el('cat-status').textContent=rows.length?rows.length+' whole chapter'+(rows.length===1?'':'s')+' in this selection.':'No matching chapters. Try a different class or search.';
    el('chapter-list').innerHTML=rows.map(c=>{
      const selected=pass?.status==='approved' && pass.chapters.some(x=>x.id===c.id);
      const choose=pass?.status==='approved' && !selected && pass.chapters.length<10;
      return '<article class="card"><h3>'+e(c.title)+'</h3><details><summary>'+c.lessons.length+' lessons included</summary><ol>'+c.lessons.map(l=>'<li>'+e(l)+'</li>').join('')+'</ol></details>'+
        (selected?'<button type="button" data-open="'+e(c.id)+'">Open chapter</button>':choose?'<button type="button" data-pick="'+e(c.id)+'">Choose chapter</button>':'')+'</article>';
    }).join('');
  }
  function checkBlock(lesson){return '<p class="mathcopy">'+e(lesson.body.question)+'</p><details><summary>Check my reasoning</summary><p class="mathcopy"><strong>'+e(lesson.body.answer)+'</strong></p><p class="mathcopy">'+e(lesson.body.why)+'</p></details>';}
  function renderReader(){
    if(!current||!pass||pass.status!=='approved')return;
    const r=current, lesson=r.lessons[lessonIndex], b=lesson.body, done=r.lessons.filter(x=>x.complete).length;
    el('reader').hidden=false;
    el('reader-body').innerHTML='<article class="surface"><div class="hrow"><div><p class="overline">'+e(r.board)+' · '+e(titleGrade(r.grade))+'</p><h2 id="reader-title" tabindex="-1">'+e(r.title)+'</h2><p>'+done+' of '+r.lessons.length+' lessons complete</p></div><button type="button" data-task="close-reader">Back to my pass</button></div>'+
      '<label class="lesson-select">Lesson<select id="lesson-select">'+r.lessons.map((s,i)=>option(i,(i+1)+'. '+s.title+(s.complete?' · completed':''))).join('')+'</select></label>'+
      '<div class="lesson-part"><h3 id="lesson-heading" tabindex="-1">'+e(lesson.title)+'</h3><p class="mathcopy">'+e(b.teach)+'</p>'+
      '<div class="pane"><h4>Worked example</h4><p class="mathcopy">'+e(b.example)+'</p><p class="mathcopy">'+e(b.steps)+'</p></div>'+
      '<div class="pane"><h4>Try it yourself</h4>'+checkBlock(lesson)+'</div><p class="note mathcopy">'+e(b.tip)+'</p></div>'+
      '<div class="reader-controls"><button type="button" class="main" data-task="complete" '+(lesson.complete?'disabled':'')+'>'+(lesson.complete?'Lesson completed':'Mark lesson complete')+'</button>'+
      (lessonIndex>0?'<button type="button" data-task="previous">Previous lesson</button>':'')+
      (lessonIndex<r.lessons.length-1?'<button type="button" data-task="next">Next lesson</button>':'')+'</div>'+
      '<section class="pane lesson-part"><h4>Chapter challenge</h4><p class="mathcopy">'+e(r.challenge.question)+'</p><details><summary>See the worked solution</summary><p class="mathcopy">'+e(r.challenge.solution)+'</p></details></section>'+
      '<details id="chapter-check" class="lesson-part"><summary>Chapter self-check</summary><p>Try these questions together without your notes. Open each solution when you are ready to check your method.</p><ol class="checkpoint">'+r.check.map(i=>'<li>'+checkBlock(r.lessons[i])+'</li>').join('')+'</ol><button type="button" data-task="shuffle-check">Change the practice order</button></details></article>';
    el('lesson-select').value=String(lessonIndex);
  }
  function shuffledCheck(lessons){const ids=lessons.map((_,i)=>i);for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,5);}
  async function openChapter(chapter){
    const r=await call('open',{...credentials,pass:pass.id,chapter});
    current={...r,check:shuffledCheck(r.lessons)};lessonIndex=Math.max(0,r.lessons.findIndex(s=>!s.complete));renderReader();focusSection('reader-title');
  }
  function downloadKey(){
    const transfer=new Blob(['Innovative Masterminds — Self Learning\nRegistered email: '+credentials.email+'\nPrivate learning key: '+formatKey(credentials.key)+'\nOpen your pass: '+new URL('./',location.href).href+'\nStore this file privately.'],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(transfer),a=document.createElement('a');a.href=url;a.download='Innovative-Masterminds-learning-key.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  async function act(fn){if(busy)return;busy=true;showNotice('');try{await fn();}catch(error){showNotice(error.message,true);}finally{busy=false;}}
  document.addEventListener('submit',event=>{
    const form=event.target;if(!['register','signin','payment'].includes(form.id))return;event.preventDefault();
    const val=Object.fromEntries(new FormData(form));
    act(async()=>{
      if(form.id==='register'){
        const address=val.email.trim().toLowerCase(), confirm=val.confirmEmail.trim().toLowerCase();
        if(address!==confirm)throw new Error('The two email addresses must match.');
        const key=form.dataset.pendingKey||newKey();form.dataset.pendingKey=key;
        const next=await call('register',{...val,email:address,key,consent:true});
        accountVersion++;remember({email:address,key});apply(next);el('saved-key').open=true;focusSection('pass-heading');
        showNotice('Pass registered. Save your learning key before paying.');
      } else if(form.id==='signin') {
        const c={email:val.email.trim().toLowerCase(),key:canonicalKey(val.key)}, next=await call('status',c);
        accountVersion++;remember(c);apply(next);focusSection('pass-heading');
      } else {
        apply(await call('payment',{...credentials,...val,pass:pass.id,paid:true}));
        focusSection('pass-heading');showNotice('Payment reference submitted for manual review.');
      }
    });
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b)return;
    if(b.dataset.pick){pendingChoice=catalogue.find(c=>c.id===b.dataset.pick);if(!pendingChoice)return;
      el('pick-copy').textContent=pendingChoice.title+' ('+pendingChoice.board+', '+titleGrade(pendingChoice.grade)+') includes '+pendingChoice.lessons.length+' lessons. This will use choice '+(pass.chapters.length+1)+' of 10 for this pass. The chapter stays on your pass until expiry.';el('pick-dialog').showModal();return;}
    if(b.id==='pick-cancel'){el('pick-dialog').close();return;}
    if(b.id==='pick-confirm'){if(!pendingChoice)return;const id=pendingChoice.id;el('pick-dialog').close();act(async()=>{apply(await call('pick',{...credentials,pass:pass.id,chapter:id}));await openChapter(id);});return;}
    if(b.dataset.open){act(()=>openChapter(b.dataset.open));return;}
    const task=b.dataset.task;if(!task)return;
    act(async()=>{
      if(task==='refresh'){await refresh();showNotice('Your pass is up to date.');}
      if(task==='logout'){accountVersion++;remember(null);pass=null;clearTimeout(expiresTimer);clearReader();renderPass();renderList();focusSection('pass-heading');}
      if(task==='renew'){apply(await call('renew',credentials));focusSection('pass-heading');}
      if(task==='download-key')downloadKey();
      if(task==='load-catalogue')await loadCatalog();
      if(task==='complete'){const l=current.lessons[lessonIndex];apply(await call('complete',{...credentials,pass:pass.id,chapter:current.id,unit:l.id}));l.complete=true;renderReader();showNotice('Lesson progress saved.');}
      if(task==='previous'||task==='next'){lessonIndex+=task==='previous'?-1:1;renderReader();focusSection('lesson-heading');}
      if(task==='shuffle-check'){current.check=shuffledCheck(current.lessons);renderReader();el('chapter-check').open=true;el('chapter-check').querySelector('summary').focus();}
      if(task==='close-reader'){clearReader();focusSection('pass-heading');}
    });
  });
  el('board').addEventListener('change',()=>{el('search').value='';fillGrades();});el('grade').addEventListener('change',renderList);el('search').addEventListener('input',renderList);
  document.addEventListener('change',event=>{if(event.target.id==='lesson-select'){lessonIndex=Number(event.target.value);renderReader();focusSection('lesson-heading');}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&credentials&&pass){if(pass.status==='approved')atExpiry();else refresh().catch(()=>{});}});
  setInterval(()=>{if(!document.hidden && pass?.status==='in_review'&&!busy)refresh().catch(()=>{});},45000);
  try{const saved=JSON.parse(sessionStorage.getItem(sessionName)||'null');if(saved?.email && /^[a-f0-9]{40}$/.test(saved.key))credentials=saved;}catch{/* Start signed out. */}
  renderPass();loadCatalog();if(credentials) refresh().catch(error=>showNotice(error.message,true));
})();
