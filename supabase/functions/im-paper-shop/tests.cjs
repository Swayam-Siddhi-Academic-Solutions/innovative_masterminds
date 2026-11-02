const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
let clock=Date.parse('2026-11-02T07:00:00Z'),handler;
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
const db={im_paper_products:[{id:'IM-C10-MS-30-A',name:'Focused Practice',marks:30,amount:9,active:true,version:1,sample_questions:[{text:'Sample only'}]},{id:'IM-C10-MS-80-A',name:'Full-Length Practice',marks:80,amount:29,active:true,version:1,sample_questions:[{text:'Sample only'}]}],im_paper_settings:[{id:true,accepting_orders:true}],im_paper_admins:[{user_id:'owner-uuid'}],im_paper_content:[{product_id:'IM-C10-MS-30-A',content:{privateMarker:'PRIVATE_PAPER_CONTENT',questions:[]}}],im_paper_orders:[]};
function response(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}})}
async function mockedFetch(url,options={}){
 const u=new URL(url),auth=options.headers?.Authorization||'';
 if(u.pathname==='/auth/v1/user')return auth==='Bearer owner.valid.token'?response({id:'owner-uuid',email:'im.abhilash.ssas@gmail.com',email_confirmed_at:'2026-09-13'}):auth==='Bearer spoofed.user.token'?response({id:'attacker-uuid',email:'im.abhilash.ssas@gmail.com',email_confirmed_at:'2026-09-13',user_metadata:{is_admin:true}}):response({error:'No user'},401);
 const table=u.pathname.split('/').pop();if(!db[table])return response({error:'Unknown table'},404);
 const query=Object.fromEntries(u.searchParams),method=options.method||'GET';
 const match=row=>Object.entries(query).filter(([k])=>!['select','order','limit','offset'].includes(k)).every(([k,v])=>{if(v.startsWith('eq.'))return String(row[k])===v.slice(3);if(v.startsWith('neq.'))return String(row[k])!==v.slice(4);if(v.startsWith('gte.'))return String(row[k])>=v.slice(4);return true});
 if(method==='GET'){
  let rows=db[table].filter(match);if(query.order?.startsWith('created_at.desc'))rows.sort((a,b)=>b.created_at.localeCompare(a.created_at));rows=rows.slice(Number(query.offset)||0,(Number(query.offset)||0)+(Number(query.limit)||rows.length));
  if(query.select&&query.select!=='*')rows=rows.map(r=>Object.fromEntries(query.select.split(',').filter(k=>k in r).map(k=>[k,r[k]])));
  return response(rows);
 }
 const data=JSON.parse(options.body);
 if(method==='POST'){
  if(table==='im_paper_orders'&&db[table].some(r=>r.token_hash===data.token_hash||r.id===data.id||(data.utr&&r.utr===data.utr)))return response({code:'23505'},409);
  const row={version:1,history:[],payment_submitted_at:null,paper_due_at:null,bank_verified_at:null,paper_sent_at:null,answers_received_at:null,results_due_at:null,results_sent_at:null,staff_notes:'',utr:null,...data};db[table].push(row);return response([row]);
 }
 if(method==='PATCH'){
  const rows=db[table].filter(match);if(data.utr&&db[table].some(r=>!rows.includes(r)&&r.utr===data.utr))return response({code:'23505'},409);for(const row of rows)Object.assign(row,data);return response(rows);
 }
 return response({error:'Method'},405);
}
const source=fs.readFileSync(__dirname+'/index.ts','utf8').replace('export async function handle','async function handle');
vm.runInNewContext(source,{Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://test.supabase.co':'test-server-key'},serve:fn=>handler=fn},fetch:mockedFetch,crypto:webcrypto,TextEncoder,Uint8Array,Date:ClockDate,Response,URLSearchParams,Set,Error,Number,String,Array,Object,JSON});
const headers={origin:'https://swayam-siddhi-academic-solutions.github.io',apikey:'sb_publishable_1i9qcwrxWAistFqcFYnOag_3ju2FU_P','Content-Type':'application/json'};
let checks=0;
async function call(body,owner=false,extra={}){const r=await handler(new Request('https://test.supabase.co/functions/v1/im-paper-shop',{method:'POST',headers:{...headers,...(owner?{Authorization:'Bearer owner.valid.token'}:{}),...extra},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()}}
function expect(condition,message){assert.ok(condition,message);checks++}
const a='a'.repeat(64),b='b'.repeat(64),c='c'.repeat(64);
const create=(t=a,overrides={})=>({op:'create',productId:'IM-C10-MS-30-A',student:'Test Student',email:'parent@example.invalid',confirmEmail:'parent@example.invalid',token:t,consent:true,...overrides});
(async()=>{
 let r=await call({op:'catalog'});expect(r.status===200&&r.body.products.length===2,'Catalogue is available');expect(!JSON.stringify(r.body).includes('PRIVATE_PAPER_CONTENT'),'Catalogue hides paid contents');
 expect((await call({op:'catalog'},false,{origin:'https://attacker.example'})).status===403,'Origins restricted');expect((await call({op:'catalog'},false,{apikey:'wrong'})).status===401,'Application key checked');
 expect((await call(create(a,{confirmEmail:'other@example.invalid'}))).status===400,'Email confirmation required');expect((await call(create(a,{consent:false}))).status===400,'Terms confirmation required');
 r=await call(create(a,{amount:1}));expect(r.status===200&&r.body.order.amount===9,'Price comes from catalogue, not client');const id=r.body.order.id;
 expect(db.im_paper_orders.length===1,'Order persisted');expect((await call(create())).body.order.id===id&&db.im_paper_orders.length===1,'Registration retries are idempotent');expect((await call(create(a,{student:'Another Student'}))).status===409,'Token cannot be rebound to another registration');
 expect((await call({op:'status',id,token:b})).status===404,'A different token cannot read an order');expect((await call({op:'admin_paper',productId:'IM-C10-MS-30-A'})).status===401,'Anonymous visitors cannot read full paper');expect((await call({op:'admin_list'},false,{Authorization:'Bearer spoofed.user.token'})).status===403,'Allowlist excludes a spoofed owner email/metadata');
 const pay={op:'payment',id,token:a,payer:'Test Parent',reference:'QA-PAY-000001',confirmed:true};
 expect((await call({...pay,reference:'x'})).status===400,'Short references rejected');r=await call(pay);expect(r.status===200&&r.body.order.status==='PAYMENT_REVIEW','Payment reference never auto-approves credit');expect(Date.parse(r.body.order.paperDueAt)-Date.parse(r.body.order.paymentSubmittedAt)===3600000,'Paper deadline is one hour');const submitted=r.body.order.paymentSubmittedAt;
 clock+=1800000;r=await call({...pay,reference:'qa pay 000001'});expect(r.status===200&&r.body.order.paymentSubmittedAt===submitted,'Payment retries preserve original deadline');
 const other=(await call(create(b))).body.order.id;expect((await call({...pay,id:other,token:b})).status===409,'Reference cannot be reused for another paper');
 r=await call({op:'status',id,token:a});expect(!('history' in r.body.order)&&!('token_hash' in r.body.order)&&!('staff_notes' in r.body.order),'Student responses omit private fields');
 expect((await call({op:'admin_paper',productId:'IM-C10-MS-30-A'},true)).body.paper.privateMarker==='PRIVATE_PAPER_CONTENT','Allowed owner can read paper');
 const act=(action,rest={})=>call({op:'admin_action',id,action,...rest},true);
 expect((await act('paper_sent',{ack:true})).status===400,'Cannot record a paper sent before verification');expect((await act('results_sent',{ack:true})).status===400,'Cannot record results before answers');expect((await act('verify',{ack:false})).status===400,'Explicit bank verification required');
 r=await act('verify',{ack:true});expect(r.body.order.status==='VERIFIED'&&!r.body.order.paper_sent_at,'Bank approval does not send a paper');expect(r.body.order.paper_due_at===new Date(Date.parse(submitted)+3600000).toISOString(),'Approval never restarts paper deadline');expect((await act('paper_sent',{ack:false})).status===400,'Manual sending acknowledgement required');expect((await act('paper_sent',{ack:true,sentAt:new Date(clock+1000).toISOString()})).status===400,'Future paper email time rejected');expect((await act('paper_sent',{ack:true,sentAt:new Date(Date.parse(submitted)-1000).toISOString()})).status===400,'Paper email cannot predate payment details');
 r=await act('paper_sent',{ack:true});expect(r.body.order.status==='PAPER_SENT','Manual delivery time recorded');const sent=r.body.order.paper_sent_at;
 expect((await act('answers_received',{receivedAt:new Date(Date.parse(sent)-1000).toISOString()})).status===400,'Answer time cannot predate paper');expect((await act('answers_received',{receivedAt:new Date(clock+1000).toISOString()})).status===400,'Future answer time rejected');
 clock+=3600000;const received=new Date(clock-1800000).toISOString();r=await act('answers_received',{receivedAt:received});expect(Date.parse(r.body.order.results_due_at)-Date.parse(received)===21600000,'Results due six hours from actual answer receipt');expect((await act('results_sent',{ack:false})).status===400,'Manual result email acknowledgement required');
 expect((await act('results_sent',{ack:true,sentAt:new Date(clock+1000).toISOString()})).status===400,'Future result email time rejected');r=await act('results_sent',{ack:true});expect(r.body.order.status==='RESULTS_SENT'&&r.body.order.results_sent_at,'Results status recorded');expect((await call({...pay,reference:'DIFFERENT999'})).status===409,'Submitted reference is immutable');
 const whatsappOrder=(await call(create(c))).body.order.id;
 const receivedWa=new Date(clock).toISOString();
 const recordWa={op:'admin_action',id:whatsappOrder,action:'record_whatsapp_payment',reference:'WA-TEST-0002',payer:'Test WhatsApp Parent',receivedAt:receivedWa,ack:true};
 expect((await call({...recordWa,ack:false},true)).status===400,'WhatsApp receipt must be acknowledged by owner');
 clock+=900000;r=await call(recordWa,true);expect(r.status===200&&r.body.order.status==='PAYMENT_REVIEW'&&!r.body.order.bank_verified_at,'WhatsApp screenshots never auto-approve payment');
 expect(Date.parse(r.body.order.paper_due_at)-Date.parse(receivedWa)===3600000,'WhatsApp deadline uses actual message-received time');
 expect((await call({...recordWa,receivedAt:new Date(clock).toISOString()},true)).body.order.paper_due_at===r.body.order.paper_due_at,'WhatsApp retries keep the original deadline');
 expect((await call({op:'admin_settings',acceptingOrders:false},true)).status===200,'Owner can pause orders');expect((await call(create('d'.repeat(64)))).status===409,'Paused checkout blocks new orders');expect((await call(pay)).status===200,'Pause does not block an existing payment status/retry');
 expect(!db.im_paper_orders.some(o=>o.paper_sent_at&&!o.bank_verified_at),'No delivery without bank approval');expect(db.im_paper_orders[0].history.length===6,'Workflow audit is recorded atomically with transitions');
 console.log(checks+' meaningful paper-order and access-control checks passed.');
})().catch(e=>{console.error(e);process.exit(1)});
