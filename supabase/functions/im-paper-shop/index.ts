// Native fetch only. Paid question content is private database data, never bundled here.
// verify_jwt=false is intentional: anonymous checkout; owner routes validate Auth + allowlist.
const SB_URL = Deno.env.get('SUPABASE_URL');
const SERVER_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PUBLIC_KEY = 'sb_publishable_1i9qcwrxWAistFqcFYnOag_3ju2FU_P';
const ORIGINS = new Set(['https://swayam-siddhi-academic-solutions.github.io']);
const OWNER_EMAIL = 'im.abhilash.ssas@gmail.com';
const HOUR = 3600000;
class ApiError extends Error { constructor(message,status=400,code='REQUEST_INVALID'){super(message);this.status=status;this.code=code;} }
const clean = (v,n) => String(v??'').trim().replace(/[\u0000-\u001f<>]/g,'').slice(0,n);
const normalizeRef = v => String(v??'').trim().toUpperCase().replace(/[ -]/g,'');
const iso = n => new Date(n).toISOString();
async function hash(token){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}
function validToken(token){if(!/^[a-f0-9]{64}$/.test(String(token||'')))throw new ApiError('Your order session is missing. Please reopen the paper shop.');return token;}
const productFields = 'id,name,marks,amount,minutes,question_count,subject,grade,language,set_name,version,sample_questions,active';
async function db(table,query={},method='GET',body){
 const url=SB_URL+'/rest/v1/'+table+'?'+new URLSearchParams(query);
 const response=await fetch(url,{method,headers:{apikey:SERVER_KEY,Authorization:'Bearer '+SERVER_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 let value;try{value=await response.json();}catch{value=null;}
 if(!response.ok){if(value?.code==='23505')throw new ApiError('This payment reference is already attached to an order. Contact us on WhatsApp if you need help.',409,'DUPLICATE');throw new ApiError('The order service is temporarily unavailable. Please contact us if you have already paid. Do not pay again.',503,'STORE_UNAVAILABLE');}
 return value;
}
async function product(id,active=true){const rows=await db('im_paper_products',{id:'eq.'+clean(id,70),select:productFields,...(active?{active:'eq.true'}:{})});if(!rows[0])throw new ApiError('This question paper is not currently available.',404,'PAPER_UNAVAILABLE');return rows[0];}
function publicOrder(o){return {id:o.id,productId:o.product_id,amount:o.amount,registeredEmail:o.email,status:o.status,paymentReference:o.utr||'',paymentSubmittedAt:o.payment_submitted_at,paperDueAt:o.paper_due_at,paperSentAt:o.paper_sent_at,answersReceivedAt:o.answers_received_at,resultsDueAt:o.results_due_at,resultsSentAt:o.results_sent_at};}
async function ownOrder(id,token){const rows=await db('im_paper_orders',{id:'eq.'+clean(id,45),token_hash:'eq.'+await hash(validToken(token)),select:'*',limit:'1'});if(!rows[0])throw new ApiError('Order not found for this session. Please contact us if you have paid.',404,'ORDER_NOT_FOUND');return rows[0];}
async function update(o,patch,action,actor=null){const at=iso(Date.now());const rows=await db('im_paper_orders',{id:'eq.'+o.id,version:'eq.'+o.version},'PATCH',{...patch,updated_at:at,version:o.version+1,history:[...o.history,{action,at,actor}]});if(!rows[0])throw new ApiError('This order was just updated. Refresh its status and try again; do not pay again.',409,'ORDER_CHANGED');return rows[0];}
async function requireOwner(req){
 const auth=req.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]+$/.test(auth)||auth==='Bearer '+PUBLIC_KEY)throw new ApiError('Please sign in to the owner desk.',401,'OWNER_SIGN_IN');
 const r=await fetch(SB_URL+'/auth/v1/user',{headers:{apikey:PUBLIC_KEY,Authorization:auth}});
 const user=await r.json().catch(()=>null);
 if(!r.ok||!user?.id||!user.email_confirmed_at||String(user.email).toLowerCase()!==OWNER_EMAIL)throw new ApiError('Owner access is required.',403,'OWNER_REQUIRED');
 const allowed=await db('im_paper_admins',{user_id:'eq.'+user.id,select:'user_id',limit:'1'});
 if(!allowed[0])throw new ApiError('Owner access is required.',403,'OWNER_REQUIRED');
 return user.id;
}
async function create(body){
 if(clean(body.website,200))throw new ApiError('Unable to accept this request.');
 if(body.consent!==true)throw new ApiError('Please confirm the paper delivery and evaluation terms.');
 const student=clean(body.student,90),email=clean(body.email,150).toLowerCase(),confirm=clean(body.confirmEmail,150).toLowerCase();
 if(student.length<2||!/^\S+@\S+\.\S+$/.test(email)||email!==confirm)throw new ApiError('Enter the student’s name and matching valid email addresses.');
 const tokenHash=await hash(validToken(body.token));
 const previous=await db('im_paper_orders',{token_hash:'eq.'+tokenHash,select:'*',limit:'1'});
 if(previous[0]){if(previous[0].product_id!==body.productId||previous[0].email!==email||previous[0].student!==student)throw new ApiError('An order already exists for these session details. Resume it or start a new order.',409,'SESSION_EXISTS');return {order:publicOrder(previous[0])};}
 const settings=await db('im_paper_settings',{id:'eq.true',select:'accepting_orders'});
 if(!settings[0]?.accepting_orders)throw new ApiError('New paper orders are currently paused. Please contact us on WhatsApp.',409,'ORDERS_PAUSED');
 const p=await product(body.productId),since=iso(Date.now()-24*HOUR);
 const recent=await db('im_paper_orders',{email:'eq.'+email,created_at:'gte.'+since,select:'id',limit:'6'});
 if(recent.length>=5)throw new ApiError('Please contact us before creating another paper order today.',429,'DAILY_LIMIT');
 const global=await db('im_paper_orders',{created_at:'gte.'+since,select:'id',limit:'201'});
 if(global.length>=200)throw new ApiError('New orders are temporarily at capacity. Please contact us.',429,'CAPACITY');
 const at=iso(Date.now()),id='IMQP-'+crypto.randomUUID().replace(/-/g,'').toUpperCase();
 try{const saved=await db('im_paper_orders',{},'POST',{id,product_id:p.id,product_version:p.version,amount:p.amount,student,email,token_hash:tokenHash,status:'AWAITING_PAYMENT',created_at:at,updated_at:at,history:[{action:'ORDER_REGISTERED',at,actor:null}]});return {order:publicOrder(saved[0])};}
 catch(e){if(e.code==='DUPLICATE'){const again=await db('im_paper_orders',{token_hash:'eq.'+tokenHash,select:'*',limit:'1'});if(again[0]&&again[0].email===email&&again[0].product_id===p.id&&again[0].student===student)return {order:publicOrder(again[0])};}throw e;}
}
async function payment(body){
 const o=await ownOrder(body.id,body.token),ref=normalizeRef(body.reference),payer=clean(body.payer,90);
 if(body.confirmed!==true||!payer||!/^[A-Z0-9]{6,70}$/.test(ref))throw new ApiError('Enter the payer’s name, a valid UPI transaction reference and your payment confirmation.');
 if(o.utr){if(o.utr===ref)return {order:publicOrder(o)};throw new ApiError('A payment reference is already recorded. Contact us to correct it; do not pay again.',409,'REFERENCE_LOCKED');}
 if(o.status!=='AWAITING_PAYMENT')throw new ApiError('This order cannot accept a new payment reference. Please contact us.',409);
 const duplicate=await db('im_paper_orders',{utr:'eq.'+ref,select:'id',limit:'1'});
 if(duplicate[0])throw new ApiError('This payment reference is already attached to an order. Contact us if you need help.',409,'DUPLICATE');
 const at=Date.now();
 try{return {order:publicOrder(await update(o,{payer,utr:ref,status:'PAYMENT_REVIEW',payment_submitted_at:iso(at),paper_due_at:iso(at+HOUR)},'PAYMENT_REFERENCE_RECEIVED'))};}
 catch(e){if(e.code==='ORDER_CHANGED'){const again=await ownOrder(body.id,body.token);if(again.utr===ref)return {order:publicOrder(again)};}throw e;}
}
async function ownerAction(body,actor){
 const rows=await db('im_paper_orders',{id:'eq.'+clean(body.id,45),select:'*',limit:'1'}),o=rows[0];
 if(!o||o.status==='TEST_COMPLETED')throw new ApiError('Order not found or closed.',404);
 const at=iso(Date.now()),action=body.action;
 if(action==='record_whatsapp_payment'){
  const ref=normalizeRef(body.reference),payer=clean(body.payer,90),received=Date.parse(String(body.receivedAt||''));
  if(o.utr){if(o.utr===ref)return {order:stripOwner(o)};throw new ApiError('A payment reference is already recorded.');}
  if(o.status!=='AWAITING_PAYMENT'||body.ack!==true||!payer||!/^[A-Z0-9]{6,70}$/.test(ref)||!Number.isFinite(received)||received<Date.parse(o.created_at)||received>Date.now())throw new ApiError('Enter the payer, valid UPI reference and actual WhatsApp received time after registration and no later than now.');
  return {order:stripOwner(await update(o,{payer,utr:ref,status:'PAYMENT_REVIEW',payment_submitted_at:iso(received),paper_due_at:iso(received+HOUR)},'WHATSAPP_PAYMENT_DETAILS_RECORDED',actor))};
 }
 if(action==='verify'){
  if(o.bank_verified_at)return {order:stripOwner(o)};
  if(body.ack!==true||!o.utr||!['PAYMENT_REVIEW','PAYMENT_ISSUE'].includes(o.status))throw new ApiError('Confirm the actual bank credit, amount and transaction reference first.');
  return {order:stripOwner(await update(o,{status:'VERIFIED',bank_verified_at:at},'BANK_VERIFIED',actor))};
 }
 if(action==='payment_issue'){
  if(o.bank_verified_at)throw new ApiError('This payment has already been verified.');
  const notes=clean(body.notes,800);if(!notes||!o.utr)throw new ApiError('Enter the payment issue and check the submitted reference.');
  return {order:stripOwner(await update(o,{status:'PAYMENT_ISSUE',staff_notes:notes},'PAYMENT_ISSUE',actor))};
 }
 if(action==='paper_sent'){
  if(o.paper_sent_at)return {order:stripOwner(o)};
  if(!o.bank_verified_at||body.ack!==true)throw new ApiError('Verify the payment and manually email the PDF before recording delivery.');
  const sent=body.sentAt?Date.parse(String(body.sentAt)):Date.now();
  if(!Number.isFinite(sent)||sent<Date.parse(o.payment_submitted_at)||sent>Date.now())throw new ApiError('Use the paper email’s actual sent time, after payment details were received and no later than now.');
  return {order:stripOwner(await update(o,{status:'PAPER_SENT',paper_sent_at:iso(sent)},'PAPER_EMAILED_MANUALLY',actor))};
 }
 if(action==='answers_received'){
  if(o.answers_received_at)return {order:stripOwner(o)};
  const received=Date.parse(String(body.receivedAt||''));
  if(!o.paper_sent_at||!Number.isFinite(received)||received<Date.parse(o.paper_sent_at)||received>Date.now())throw new ApiError('Use the answer email’s actual received time, after the paper was sent and no later than now.');
  return {order:stripOwner(await update(o,{status:'ANSWERS_RECEIVED',answers_received_at:iso(received),results_due_at:iso(received+6*HOUR)},'ANSWER_EMAIL_RECEIVED',actor))};
 }
 if(action==='results_sent'){
  if(o.results_sent_at)return {order:stripOwner(o)};
  if(!o.answers_received_at||body.ack!==true)throw new ApiError('Record the answer receipt and manually email the evaluated results first.');
  const sent=body.sentAt?Date.parse(String(body.sentAt)):Date.now();
  if(!Number.isFinite(sent)||sent<Date.parse(o.answers_received_at)||sent>Date.now())throw new ApiError('Use the results email’s actual sent time, after answer receipt and no later than now.');
  return {order:stripOwner(await update(o,{status:'RESULTS_SENT',results_sent_at:iso(sent)},'RESULTS_EMAILED_MANUALLY',actor))};
 }
 if(action==='notes')return {order:stripOwner(await update(o,{staff_notes:clean(body.notes,800)},'NOTES_UPDATED',actor))};
 throw new ApiError('Unknown owner action.');
}
function stripOwner(o){const {token_hash,...rest}=o;return rest;}
export async function handle(req){
 const origin=req.headers.get('origin')||'',allowed=ORIGINS.has(origin);
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'apikey,authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:allowed?204:403,headers});
 if(!allowed)return reply({error:'This origin is not allowed.'},403);
 if(req.headers.get('apikey')!==PUBLIC_KEY)return reply({error:'Invalid application key.'},401);
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 if(!SERVER_KEY||!SB_URL)return reply({error:'The order service is not configured.'},503);
 try{
  if(Number(req.headers.get('content-length')||0)>12000)throw new ApiError('Request too large.',413);
  const text=await req.text();if(text.length>12000)throw new ApiError('Request too large.',413);
  let b;try{b=JSON.parse(text);}catch{throw new ApiError('Invalid request.');}
  if(!b||typeof b!=='object'||Array.isArray(b))throw new ApiError('Invalid request.');
  if(b.op==='catalog'){
   const [products,settings]=await Promise.all([db('im_paper_products',{active:'eq.true',select:productFields,order:'marks.asc'}),db('im_paper_settings',{id:'eq.true',select:'accepting_orders'})]);
   return reply({products,acceptingOrders:!!settings[0]?.accepting_orders,ownerEmail:OWNER_EMAIL,whatsapp:'919945525562'});
  }
  if(b.op==='create')return reply(await create(b));
  if(b.op==='payment')return reply(await payment(b));
  if(b.op==='status')return reply({order:publicOrder(await ownOrder(b.id,b.token))});
  if(String(b.op).startsWith('admin_')){
   const actor=await requireOwner(req);
   if(b.op==='admin_list'){
    const offset=Math.min(10000,Math.max(0,Number(b.offset)||0)),[orders,settings,products]=await Promise.all([db('im_paper_orders',{select:'*',status:'neq.TEST_COMPLETED',order:'created_at.desc,id.desc',limit:'100',offset:String(offset)}),db('im_paper_settings',{id:'eq.true',select:'accepting_orders'}),db('im_paper_products',{select:productFields,order:'marks.asc'})]);
    return reply({orders:orders.map(stripOwner),acceptingOrders:!!settings[0]?.accepting_orders,products,nextOffset:orders.length===100?offset+100:null});
   }
   if(b.op==='admin_action')return reply(await ownerAction(b,actor));
   if(b.op==='admin_settings'){
    if(typeof b.acceptingOrders!=='boolean')throw new ApiError('Invalid setting.');
    await db('im_paper_settings',{id:'eq.true'},'PATCH',{accepting_orders:b.acceptingOrders});return reply({acceptingOrders:b.acceptingOrders});
   }
   if(b.op==='admin_paper'){
    const p=await product(b.productId,false),r=await db('im_paper_content',{product_id:'eq.'+p.id,select:'content',limit:'1'});
    if(!r[0])throw new ApiError('Paper content is unavailable.',404);return reply({product:p,paper:r[0].content});
   }
   throw new ApiError('Unknown owner request.');
  }
  throw new ApiError('Unknown request.');
 }catch(e){const status=e instanceof ApiError?e.status:503;return reply({error:e instanceof ApiError?e.message:'The order service is temporarily unavailable. If you have paid, contact us on WhatsApp; do not pay again.',code:e instanceof ApiError?e.code:'UNAVAILABLE'},status);}
}
Deno.serve(handle);
