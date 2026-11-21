// The browser sends its public project key. Paid content and database credentials stay server-side.
const project = Deno.env.get('SUPABASE_URL');
const serverKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const publicKey = 'sb_publishable_1i9qcwrxWAistFqcFYnOag_3ju2FU_P';
const siteOrigin = 'https://swayam-siddhi-academic-solutions.github.io';
const staffEmail = 'im.abhilash.ssas@gmail.com';
const studentActions = new Set(['register','status','renew','payment','pick','open','complete']);
const staffActions = new Set(['staff_list','staff_approve','staff_issue','staff_rotate']);
const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

class RequestError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
function field(value: unknown, max: number): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new RequestError('Check the details you entered.');
  }
  return value.trim();
}
function email(value: unknown): string {
  const result = field(value, 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new RequestError('Enter your registered email address.');
  return result;
}
function transaction(value: unknown): string {
  const result = field(value, 60).replace(/[ -]/g,'').toUpperCase();
  if (!/^[A-Z0-9]{8,35}$/.test(result)) throw new RequestError('Check the UPI transaction reference shown on your receipt.');
  return result;
}
async function digest(key: unknown): Promise<string> {
  const raw = field(key, 75).replace(/[\s-]/g,'').toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(raw)) throw new RequestError('Enter the full learning key saved at registration.');
  const hash = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
  return bytesHex(new Uint8Array(hash));
}
function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte=>byte.toString(16).padStart(2,'0')).join('');
}
async function rpc(name: string, payload: Record<string,unknown>) {
  const response = await fetch(project+'/rest/v1/rpc/'+name,{
    method:'POST',headers:{apikey:serverKey!,Authorization:'Bearer '+serverKey,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const value = await response.json().catch(()=>null);
  if (response.ok && value !== null) return value;
  if (value?.code==='P0001') throw new RequestError(value.message,409);
  throw new RequestError('The learning desk is temporarily unavailable. Refresh to check your pass before retrying.',503);
}
async function owner(request: Request): Promise<string> {
  const auth=request.headers.get('Authorization')||'';
  if (!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth)) throw new RequestError('Sign in to the owner desk.',401);
  const response=await fetch(project+'/auth/v1/user',{headers:{apikey:publicKey,Authorization:auth}});
  const user=await response.json().catch(()=>null);
  if (!response.ok || !uuid.test(user?.id||'') || !user.email_confirmed_at || user.email?.toLowerCase()!==staffEmail) {
    throw new RequestError('Owner access is required.',403);
  }
  return user.id; // im_sl_staff also checks the existing private UID allowlist.
}
async function handle(request: Request) {
  const headers={'Access-Control-Allow-Origin':siteOrigin,'Access-Control-Allow-Headers':'apikey, authorization, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin','Cache-Control':'private, no-store',
    'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};
  const send=(object: unknown,status=200)=>new Response(JSON.stringify(object),{status,headers});
  if (request.headers.get('Origin')!==siteOrigin) return send({error:'Use the official learning page.'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (request.method!=='POST') return send({error:'Use the learning form.'},405);
  if (request.headers.get('apikey')!==publicKey) return send({error:'Learning page configuration is unavailable.'},403);
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) throw new RequestError('Invalid request.');
    const raw=await request.text();
    if (raw.length>3500) throw new RequestError('Request is too large.',413);
    let body;
    try { body=JSON.parse(raw); } catch {throw new RequestError('Invalid request.');}
    if (!body || typeof body!=='object' || Array.isArray(body)) throw new RequestError('Invalid request.');
    const action=field(body.action,22);
    if (action==='catalog') return send(await rpc('im_sl_catalog',{}));
    if (staffActions.has(action)) {
      const id=await owner(request);
      const data: Record<string,unknown>={};
      if (body.email) data.email=email(body.email);
      if (action!=='staff_list' && !uuid.test(body.pass||'')) throw new RequestError('Select a pass in the review queue.');
      data.pass=body.pass;
      if (action==='staff_approve' || action==='staff_issue') data.ref=transaction(body.ref);
      if (action==='staff_approve' && body.verified!==true) throw new RequestError('Confirm the ₹599 credit in your bank before approving.');
      if (action==='staff_issue') data.note=field(body.note,240);
      let replacement;
      if (action==='staff_rotate') {
        if (body.verified!==true || !data.email) throw new RequestError('Confirm the learner identity and registered email before replacing a key.');
        replacement=bytesHex(crypto.getRandomValues(new Uint8Array(20)));
        data.hash=await digest(replacement);
      }
      const result=await rpc('im_sl_staff',{p_owner:id,p_action:action.slice(6),p_data:data});
      return send(replacement ? {key:replacement} : result);
    }
    if (!studentActions.has(action)) throw new RequestError('Unknown request.');
    const address=email(body.email), hash=await digest(body.key);
    const data: Record<string,string>={};
    if (action==='register') {
      data.name=field(body.name,90);
      if (!data.name || body.consent!==true || email(body.confirmEmail)!==address || body.website) {
        throw new RequestError('Check your name, email and plan confirmation.');
      }
    }
    if (['payment','pick','complete','open'].includes(action)) {
      if (!uuid.test(body.pass||'')) throw new RequestError('Refresh your pass and try again.');
      data.pass=body.pass;
    }
    if (action==='payment') {
      data.ref=transaction(body.ref);data.payer=field(body.payer,90);
      if (!data.payer || body.paid!==true) throw new RequestError('Enter the payer name and confirm your payment.');
    }
    if (['pick','complete','open'].includes(action)) data.chapter=field(body.chapter,45);
    if (action==='complete') data.unit=field(body.unit,45);
    return send(await rpc('im_sl_student',{p_action:action,p_hash:hash,p_email:address,p_data:data}));
  } catch(e) {
    return send({error:e instanceof RequestError ? e.message : 'The learning desk is unavailable. Please try again.'},e instanceof RequestError?e.status:503);
  }
}
Deno.serve(handle);
