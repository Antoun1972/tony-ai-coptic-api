import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{extractMessages,verifiedSignature,isReady} from './worker.mjs';

const env={
 META_VERIFY_TOKEN:'testing-verify-token-not-for-production',
 META_APP_SECRET:'testing-app-secret-not-for-production',
 SUPABASE_URL:'https://school.invalid',
 SUPABASE_SERVICE_ROLE_KEY:'testing-service-token-not-for-production',
 SCHOOL_ID:'00000000-0000-4000-8000-000000000001',
 EXPECTED_PHONE_NUMBER_ID:'555000333',
 ALLOWED_SENDERS:'201111111111'
};
const url='https://example.test/webhooks/whatsapp';
const doc=(type='text',from='201111111111',extra={})=>({
 object:'whatsapp_business_account',
 entry:[{id:'dummy-waba',changes:[{field:'messages',value:{
    metadata:{phone_number_id:'555000333'},
    contacts:[{wa_id:from,profile:{name:'Sample Teacher'}}],
    messages:[{id:'wamid.test01',from,timestamp:'1794560400',type,
       ...(type==='text'?{text:{body:'P5 lesson 2 theme 2 week 6'}}:
            {[type]:{id:'media012',filename:'Review.docx',mime_type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}}),
       ...extra
     }]
 }}]}]
});
async function sign(body){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.META_APP_SECRET),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 return 'sha256='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body))))
  .map(x=>x.toString(16).padStart(2,'0')).join('');
}
function get(params){return new Request(url+'?'+new URLSearchParams(params))}
async function post(payload,signature=true){
 const body=JSON.stringify(payload);
 return new Request(url,{method:'POST',headers:signature?
  {'x-hub-signature-256':await sign(body)}:{},body});
}
test('integration deliberately refuses all traffic before secret configuration',async()=>{
 assert.equal(isReady({}),false);
 assert.equal((await worker.fetch(new Request(url),{})).status,503);
});
test('Meta webhook handshake verifies token and responds with challenge',async()=>{
 const good=await worker.fetch(get({'hub.mode':'subscribe','hub.verify_token':env.META_VERIFY_TOKEN,'hub.challenge':'challenge123'}),env);
 assert.equal(good.status,200);assert.equal(await good.text(),'challenge123');
 const bad=await worker.fetch(get({'hub.mode':'subscribe','hub.verify_token':'WRONG','hub.challenge':'challenge123'}),env);
 assert.equal(bad.status,403);
});
test('HMAC checked from unmodified raw payload and wrong signatures fail',async()=>{
 const body=JSON.stringify(doc()),sig=await sign(body);
 assert.equal(await verifiedSignature(body,sig,env.META_APP_SECRET),true);
 assert.equal(await verifiedSignature(body+' ',sig,env.META_APP_SECRET),false);
 assert.equal(await verifiedSignature(body,'sha256='+''.padStart(64,'0'),env.META_APP_SECRET),false);
 assert.equal((await worker.fetch(await post(doc(),false),env)).status,401);
});
test('the teacher whitelist and expected business phone filter are mandatory',()=>{
 assert.equal(extractMessages(doc(),env).length,1);
 assert.equal(extractMessages(doc('text','201222222222'),env).length,0);
 const foreign=doc();
 foreign.entry[0].changes[0].value.metadata.phone_number_id='888';
 assert.equal(extractMessages(foreign,env).length,0);
});
test('text, document metadata and non-message statuses parsed safely without approval',()=>{
 const t=extractMessages(doc(),env)[0];
 assert.equal(t.review_status,'pending_review');
 assert.equal(t.body_text,'P5 lesson 2 theme 2 week 6');
 assert.equal(t.sender_wa_id,'201111111111');
 const f=extractMessages(doc('document'),env)[0];
 assert.equal(f.media_filename,'Review.docx');
 assert.equal(f.media_id,'media012');
 assert.equal(f.body_text,'');
 const stat=doc();stat.entry[0].changes[0].value.messages=[];
 stat.entry[0].changes[0].value.statuses=[{id:'a',status:'delivered'}];
 assert.equal(extractMessages(stat,env).length,0);
});
test('verified webhooks use private storage endpoint, no WhatsApp reply and no auto-approval',async()=>{
 const prior=globalThis.fetch;const calls=[];
 globalThis.fetch=async(href,opts)=>{calls.push({href,opts});return new Response(null,{status:201})};
 try{
   const r=await worker.fetch(await post(doc()),env);
   assert.equal(r.status,200);
   assert.equal(calls.length,1);
   assert.ok(calls[0].href.includes('ict_whatsapp_inbox?on_conflict=message_id'));
   const data=JSON.parse(calls[0].opts.body);
   assert.equal(data.length,1);
   assert.equal(data[0].review_status,'pending_review');
   assert.equal(data[0].media_id,null);
   assert.equal(calls[0].opts.headers.prefer,'resolution=ignore-duplicates,return=minimal');
 }finally{globalThis.fetch=prior;}
});
test('storage outages cause retryable 503, never falsely acknowledge stored data',async()=>{
 const prior=globalThis.fetch;globalThis.fetch=async()=>new Response('error',{status:500});
 try{const r=await worker.fetch(await post(doc()),env);assert.equal(r.status,503)}
 finally{globalThis.fetch=prior}
});
test('returns 200 without storage for non-approved personal contact',async()=>{
 const prior=globalThis.fetch;globalThis.fetch=async()=>{throw Error('should not store personal messages')};
 try{const r=await worker.fetch(await post(doc('text','201777777777')),env);assert.equal(r.status,200)}
 finally{globalThis.fetch=prior}
});
