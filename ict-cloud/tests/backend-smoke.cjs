'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const win={};
const txt=fs.readFileSync(path.join(__dirname,'..','config.js'),'utf8');
vm.runInNewContext(txt,{window:win},{timeout:1000});
const cfg=win.TONY_CONFIG;
if(!cfg?.supabaseUrl?.startsWith('https://') || !cfg?.publishableKey?.startsWith('sb_publishable_'))throw Error('Missing public backend config');
async function check(){
 const tables=['schools','staff','progress_entries','staff_private','documents'];
 for(const table of tables){
  const primaryKey=table==='staff_private'?'staff_id':'id';
  const res=await fetch(cfg.supabaseUrl+'/rest/v1/'+table+'?select='+primaryKey+'&limit=1',{
   headers:{apikey:cfg.publishableKey,Accept:'application/json'}
  });
  const raw=await res.text();
  if(res.status===401||res.status===403){console.log('PASS anon blocked:',table,res.status);continue}
  if(res.status!==200)throw Error('Unexpected backend response '+table+': '+res.status+' '+raw.slice(0,100));
  const data=JSON.parse(raw);
  if(!Array.isArray(data)||data.length!==0)throw Error('Security failure: anonymous caller can see '+table+' rows');
  console.log('PASS anon empty with RLS:',table);
 }
 console.log('PASS: backend reachable and anonymous staff/school records are not readable.');
}
check().catch(e=>{console.error(e);process.exit(1)});
