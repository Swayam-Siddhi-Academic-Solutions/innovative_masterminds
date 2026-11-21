'use strict';
(() => {
  const {config,call,escape:e,date,showNotice,formatKey}=IMLearning;
  const el=id=>document.getElementById(id);
  let token='',rows=[],item=null,action='',busy=false;
  const labels={awaiting_payment:'Awaiting payment',in_review:'Under review',needs_reference:'Correction requested',approved:'Active',expired:'Expired'};
  function out(){token='';rows=[];item=null;el('rows').replaceChildren();el('count').textContent='';el('queue').hidden=true;el('login-panel').hidden=false;el('login').reset();}
  async function run(fn){if(busy)return;busy=true;showNotice('');try{await fn();}catch(error){if(/Owner access is required|Sign in to the owner desk/.test(error.message))out();showNotice(error.message,true);}finally{busy=false;}}
  function render(){
    const total=Number(rows[0]?.matches||0);el('count').textContent=total===0?'No matching passes.':total>rows.length?'Showing '+rows.length+' of '+total+' passes. Search by email to narrow the results.':total+' matching pass'+(total===1?'':'es')+'.';
    el('rows').innerHTML=rows.map((r,i)=>'<article class="card review-item"><span class="tag">'+e(labels[r.status])+'</span><h3>'+e(r.name)+'</h3><p>'+e(r.email)+'</p><p><strong>₹'+e(r.amount)+'</strong> · '+e(r.payer||'Payer details pending')+'</p>'+
      (r.utr?'<p>UPI reference <strong>'+e(r.utr)+'</strong><br>Received '+e(date(r.submitted_at))+'</p>':'')+
      (r.ends_at?'<p>Access from '+e(date(r.starts_at))+' to '+e(date(r.ends_at))+'</p>':'')+
      (r.review_note?'<p>'+e(r.review_note)+'</p>':'')+'<p class="muted">Pass '+e(r.id)+'</p><div class="actions">'+
      (r.status==='in_review'?'<button type="button" data-i="'+i+'" data-action="approve" class="main">Approve bank payment</button><button type="button" data-i="'+i+'" data-action="issue">Request a correction</button>':'')+
      '<button type="button" data-i="'+i+'" data-action="rotate">Replace lost learning key</button></div></article>').join('');
  }
  async function load(){rows=await call('staff_list',{email:el('find').elements.email.value.trim()},token);render();}
  el('login').addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const fields=Object.fromEntries(new FormData(event.target));
    const r=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(fields),cache:'no-store'});
    const result=await r.json().catch(()=>({}));if(!r.ok||!result.access_token)throw new Error('Owner sign-in failed. Check the email and password.');
    token=result.access_token;await load();el('login-panel').hidden=true;el('login').reset();el('queue').hidden=false;});});
  el('logout').addEventListener('click',()=>{out();showNotice('Signed out.');});
  el('find').addEventListener('submit',event=>{event.preventDefault();run(load);});
  el('pending').addEventListener('click',()=>{el('find').reset();run(load);});
  el('rows').addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||busy)return;
    item=rows[Number(button.dataset.i)];action=button.dataset.action;el('confirm').reset();
    const note=el('confirm').elements.note;el('note-label').hidden=action!=='issue';note.required=action==='issue';note.minLength=3;
    const copy={approve:['Approve ₹599 payment?','Verify ₹599 has reached your bank for '+item.payer+' under reference '+item.utr+'. Approving now starts 30 days for '+item.email+'.','I verified the bank credit'],
      issue:['Request a correction?','Explain what '+item.email+' should check on their receipt. They will see this message on their pass.','Send to the learner’s desk'],
      rotate:['Replace this learning key?','First confirm the learner’s identity. A replacement disables the current key for all passes on this account. Deliver the new key privately to '+item.email+'.','Identity verified, replace key']};
    const [title,msg,label]=copy[action];el('decision-title').textContent=title;el('decision-copy').textContent=msg;el('decision-button').textContent=label;el('decision').showModal();
  });
  el('cancel').addEventListener('click',()=>el('decision').close());
  el('confirm').addEventListener('submit',event=>{event.preventDefault();const note=el('confirm').elements.note.value.trim();el('decision').close();run(async()=>{
    const result=await call('staff_'+action,{pass:item.id,ref:item.utr,email:item.email,note,verified:true},token);
    if(action==='rotate'){el('key-email').textContent=item.email;el('key-value').textContent=formatKey(result.key);el('new-key').showModal();}
    else showNotice(action==='approve'?'Payment approved. The 30-day pass is active.':'Correction requested. The learner can submit their reference again.');
    await load();
  });});
  el('key-done').addEventListener('click',()=>el('new-key').close());el('new-key').addEventListener('close',()=>{el('key-value').textContent='';el('key-email').textContent='';});
})();
