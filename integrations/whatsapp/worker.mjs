/**
 * TONY AI ICT Manager – WhatsApp Cloud API receive-only bridge.
 * Deployment is OFF until the owner completes Meta Coexistence + secret setup.
 * No credentials, staff phone numbers or school messages belong in this repository.
 */
const TEXT_HEADERS={ "content-type":"text/plain; charset=utf-8","cache-control":"no-store" };
const JSON_HEADERS={ "content-type":"application/json; charset=utf-8","cache-control":"no-store" };
const reply=(s,status=200)=>new Response(s,{status,headers:TEXT_HEADERS});
const digits=x=>String(x||"").replace(/\D/g,"");
const allowed=(env,from)=>new Set(String(env.ALLOWED_SENDERS||"").split(",").map(digits).filter(x=>x.length>=8)).has(digits(from));

function safeBytesEqual(a,b){
  if(a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;
}
async function verifiedSignature(raw,header,secret){
  if(!secret||!/^sha256=[a-f0-9]{64}$/i.test(header||""))return false;
  const input=new TextEncoder().encode(raw);
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const computed=new Uint8Array(await crypto.subtle.sign("HMAC",key,input));
  const received=Uint8Array.from((header.slice(7).match(/.{2}/g)||[]),h=>parseInt(h,16));
  return safeBytesEqual(computed,received);
}
function extractMessages(doc,env){
  if(doc?.object!=="whatsapp_business_account")return [];
  const records=[];
  for(const entry of (Array.isArray(doc.entry)?doc.entry:[]).slice(0,20)){
    for(const change of (Array.isArray(entry.changes)?entry.changes:[]).slice(0,10)){
      if(change?.field!=="messages")continue;
      const value=change.value;
      if(!value||String(value?.metadata?.phone_number_id||"")!==String(env.EXPECTED_PHONE_NUMBER_ID||""))continue;
      const contacts=new Map((value.contacts||[]).map(c=>[digits(c.wa_id),String(c?.profile?.name||"").slice(0,120)]));
      for(const m of (Array.isArray(value.messages)?value.messages:[]).slice(0,50)){
        const sender=digits(m.from);
        if(!m.id||!allowed(env,sender))continue; // Ignore all unapproved personal contacts by default.
        const types=new Set(["text","document","image","audio","video"]);
        if(!types.has(m.type))continue;
        const media=(m[m.type]||{});
        records.push({
          school_id:env.SCHOOL_ID,
          message_id:String(m.id).slice(0,250),
          sender_wa_id:sender,
          sender_name:contacts.get(sender)||null,
          source_type:"whatsapp",
          message_type:m.type,
          body_text:m.type==="text"?String(m.text?.body||"").slice(0,20000):
            String(media.caption||"").slice(0,20000),
          media_id:m.type!=="text"?String(media.id||"").slice(0,100):null,
          media_mime:m.type!=="text"?String(media.mime_type||"").slice(0,150):null,
          media_filename:m.type==="document"?String(media.filename||"").slice(0,255):null,
          received_at:Number(m.timestamp)>0 ? new Date(Number(m.timestamp)*1000).toISOString():new Date().toISOString(),
          review_status:"pending_review"
        });
      }
    }
  }
  return records;
}
function isReady(env){
  return !!(env.META_VERIFY_TOKEN&&env.META_APP_SECRET&&env.SUPABASE_URL&&
    env.SUPABASE_SERVICE_ROLE_KEY&&env.SCHOOL_ID&&env.EXPECTED_PHONE_NUMBER_ID&&
    String(env.ALLOWED_SENDERS||"").trim());
}
async function writeInbox(rows,env){
  const url=String(env.SUPABASE_URL).replace(/\/$/,"")+
    "/rest/v1/ict_whatsapp_inbox?on_conflict=message_id";
  const r=await fetch(url,{method:"POST",headers:{
    apikey:env.SUPABASE_SERVICE_ROLE_KEY,
    authorization:"Bearer "+env.SUPABASE_SERVICE_ROLE_KEY,
    "content-type":"application/json",
    prefer:"resolution=ignore-duplicates,return=minimal"
  },body:JSON.stringify(rows)});
  if(!r.ok)throw Error("storage_failed_"+r.status);
}
export default {
 async fetch(request,env){
   const url=new URL(request.url);
   if(url.pathname!=="/webhooks/whatsapp")return reply("Not found",404);
   if(!isReady(env))return reply("Integration not configured",503);
   if(request.method==="GET"){
     if(url.searchParams.get("hub.mode")!=="subscribe" ||
       !safeBytesEqual(new TextEncoder().encode(url.searchParams.get("hub.verify_token")||""),
         new TextEncoder().encode(env.META_VERIFY_TOKEN)))return reply("Forbidden",403);
     return reply(url.searchParams.get("hub.challenge")||"");
   }
   if(request.method!=="POST")return reply("Method not allowed",405);
   const length=Number(request.headers.get("content-length")||"0");
   if(length>1024*1024)return reply("Payload too large",413);
   const raw=await request.text();
   if(raw.length>1024*1024)return reply("Payload too large",413);
   if(!await verifiedSignature(raw,request.headers.get("x-hub-signature-256"),env.META_APP_SECRET))
     return reply("Invalid signature",401);
   let data;try{data=JSON.parse(raw)}catch{return reply("Invalid JSON",400)}
   let rows;try{rows=extractMessages(data,env)}catch{return reply("Invalid payload",400)}
   if(rows.length===0)return reply("No authorized messages",200);
   try{await writeInbox(rows,env)}catch{return reply("Temporary storage failure",503)}
   return new Response(JSON.stringify({accepted:rows.length}),{status:200,headers:JSON_HEADERS});
 }
};
export {verifiedSignature,extractMessages,isReady};
