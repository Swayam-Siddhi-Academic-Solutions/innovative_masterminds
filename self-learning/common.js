'use strict';
window.IMLearning = (() => {
  const config = window.IM_SUPABASE_CONFIG;
  const pay = window.IM_PAPER_CONFIG;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titleGrade = grade => /^\d+$/.test(grade) ? 'Class '+grade : grade;
  function date(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))+' IST';
  }
  function showNotice(message,error=false) {
    const box=document.getElementById('notice');
    box.hidden=!message; box.textContent=message; box.classList.toggle('error',error);
  }
  async function call(action,data={},token='') {
    const headers={'Content-Type':'application/json',apikey:config.publishableKey};
    if(token) headers.Authorization='Bearer '+token;
    let response;
    try {response=await fetch(config.url+'/functions/v1/im-self-learning',{method:'POST',headers,
      body:JSON.stringify({...data,action}),cache:'no-store',credentials:'omit'});}
    catch {throw new Error('Connection interrupted. Refresh your pass before retrying a payment or chapter choice.');}
    const body=await response.json().catch(()=>null);
    if(!response.ok||body===null||body.error) throw new Error(body?.error||'The learning desk is unavailable. Please try again.');
    return body;
  }
  function formatKey(key) { return key.replace(/[-\s]/g,'').toUpperCase().match(/.{1,5}/g)?.join('-')||''; }
  return {config,pay,escape,titleGrade,date,showNotice,call,formatKey};
})();
