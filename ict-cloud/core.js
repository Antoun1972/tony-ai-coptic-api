'use strict';
/* TONY AI ICT Manager Cloud — senior teacher. Publishable key only. Backend RLS is mandatory. */
const App=window.App={
  cfg:window.TONY_CONFIG, session:null, user:null, member:null, school:null,
  page:'dashboard', view:'login', demo:false, loading:false, busy:false, syncTimer:null,
  yearId:null, years:[], staff:[], privateStaff:[], classes:[], assignments:[], progress:[],
  documents:[], questions:[], exams:[], meetings:[], branding:null, members:[], profiles:[],
  lastSync:0, error:'', selectedExam:null, previewHTML:'', printTitle:'', initialized:false
};
const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const opts=(list,selected,value='id',label='name')=>list.map(o=>'<option value="'+safe(o[value])+'" '+(String(o[value])===String(selected)?'selected':'')+'>'+safe(o[label])+'</option>').join('');
const option=(value,label,selected)=>'<option value="'+safe(value)+'" '+(String(value)===String(selected)?'selected':'')+'>'+safe(label)+'</option>';
const fmt=v=>v?new Date(v).toLocaleDateString('ar-EG'):'—';
const nowISO=()=>new Date().toISOString().slice(0,10);
const iconText=t=>'<span aria-hidden="true">'+t+'</span>';
const el=document.createElement.bind(document);
function flash(message,isError=false){const t=$('toast');t.textContent=message;t.classList.toggle('error',isError);t.classList.add('show');setTimeout(()=>t.classList.remove('show'),4800)}
function syncLabel(text,kind=''){const e=$('syncIndicator');e.className='sync-pill '+kind;e.innerHTML='<span class="signal"></span>'+safe(text)}
function canEdit(){return App.demo||App.member?.role==='head'}
function isHead(){return !App.demo&&App.member?.role==='head'}
function canSubmit(){return App.demo||['head','teacher'].includes(App.member?.role)}
function roleName(x){return ({head:'مدرس أول ICT',teacher:'مدرس / مدرسة',reviewer:'مراجع أكاديمي',management:'إدارة المدرسة'})[x]||x}
function labelState(x){return ({submitted:'مرسل للمراجعة',flagged:'يحتاج توضيحًا',approved:'معتمد',rejected:'مرفوض',confirmed:'تمت المراجعة',pending:'بانتظار الاعتماد'})[x]||x||'—'}
function stateTag(x){const cls=x==='approved'?'ok':x==='rejected'?'danger':x==='flagged'||x==='pending'?'warn':'blue';return '<span class="tag '+cls+'">'+safe(labelState(x))+'</span>'}
function title(text,desc='',buttons=''){return '<div class="page-title"><div><span class="eyebrow">TONY AI / ICT SENIOR TEACHER</span><h1>'+text+'</h1><p>'+desc+'</p></div><div class="btn-row">'+buttons+'</div></div>'}
function field(name,title_,value='',type='text',extra=''){return '<label class="field"><span>'+title_+'</span><input name="'+name+'" type="'+type+'" value="'+safe(value)+'" '+extra+'></label>'}
function textarea(name,title_,value='',extra=''){return '<label class="field wide"><span>'+title_+'</span><textarea name="'+name+'" '+extra+'>'+safe(value)+'</textarea></label>'}
function pick(name,title_,items,selected,extra=''){return '<label class="field"><span>'+title_+'</span><select name="'+name+'" '+extra+'>'+items.map(x=>option(x[0],x[1],selected)).join('')+'</select></label>'}
function panel(c,sub='',inner=''){return '<section class="panel"><h2>'+c+'</h2>'+(sub?'<p class="sub">'+sub+'</p>':'')+inner+'</section>'}
function empty(msg='لا توجد سجلات حتى الآن',sym='▧'){return '<div class="empty"><span class="symbol">'+sym+'</span><strong>'+msg+'</strong><small>يمكن استكمال البيانات من النموذج الموجود أعلى هذه القائمة.</small></div>'}
function notice(msg,warning=false){return '<div class="note'+(warning?' warn':'')+'">'+msg+'</div>'}
function table(headers,rows){if(!rows.length)return empty();return '<div class="tablewrap"><table class="data-table"><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'}
function tr(cells){return '<tr>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>'}
function dataOf(form){const f=new FormData(form);return Object.fromEntries(f.entries())}
function getYear(){return App.years.find(y=>y.id===App.yearId)||App.years[0]}
function demoInit(){
 App.demo=true;App.member={role:'head',status:'active'};App.school={id:'demo',name:'مدرسة تجريبية — بيانات افتراضية'};App.user={id:'demo',email:'demo@example.test'};
 App.years=[{id:'demo-year',label:'2026/2027',is_current:true}];App.yearId='demo-year';
 App.staff=[
  {id:'demo-a',school_id:'demo',name_ar:'معلمة تجريبية ألف',name_en:'Teacher Demo Alpha',specialization:'ICT',employment_status:'active',version:1},
  {id:'demo-b',school_id:'demo',name_ar:'معلم تجريبي باء',name_en:'Teacher Demo Beta',specialization:'Programming',employment_status:'active',version:1}
 ];
 App.classes=[{id:'cls-a',school_id:'demo',year_id:'demo-year',grade:'4th Primary',section:'A'},{id:'cls-b',school_id:'demo',year_id:'demo-year',grade:'6th Primary',section:'B'}];
 App.assignments=[{id:'as-a',staff_id:'demo-a',class_id:'cls-a',school_id:'demo',year_id:'demo-year'}];
 App.progress=[{id:'p-a',school_id:'demo',year_id:'demo-year',staff_id:'demo-a',grade:'4th Primary',section:'A',theme_unit:'Theme 2',lesson:'Lesson 2',week:6,evaluation:'غير مذكور',notes:'هذا السجل مثال افتراضي فقط',review_state:'flagged',submitted_by:'demo',updated_at:new Date().toISOString(),version:1}];
 App.documents=[];App.questions=[
  {id:'q1',school_id:'demo',grade:'4th Primary',qtype:'true_false',language:'en',body:'This is a fictional demonstration statement.',answer:'True',source_ref:'DEMO – not a textbook',approved:true,marks:1},
  {id:'q2',school_id:'demo',grade:'4th Primary',qtype:'mcq',language:'en',body:'Which option is a fictional answer?',choices:['Alpha','Beta','Gamma'],answer:'Alpha',source_ref:'DEMO – not a textbook',approved:true,marks:1}
 ];App.exams=[];App.meetings=[];App.members=[];App.privateStaff=[];App.profiles=[];
 App.branding={governorate:'Cairo Governorate',administration:'Rod El-Farag Education',school_name:'COLLÈGE SAINT PAUL – FRÈRES SHOUBRA',department:'ICT Department',header_note:'DEMONSTRATION ONLY',footer_note:'TONY AI – DEMO',version:1};
 App.initialized=true;syncLabel('وضع تجربة – دون حفظ سحابي','');$('signoutButton').hidden=false;render();
}
function readSession(){try{return JSON.parse(localStorage.getItem('tony-ict-cloud-session')||'null')}catch{return null}}
function storeSession(s){App.session=s;if(s)localStorage.setItem('tony-ict-cloud-session',JSON.stringify(s));else localStorage.removeItem('tony-ict-cloud-session')}
const apiRoot=App.cfg?.supabaseUrl?.replace(/\/+$/,'')||'';
async function api(path,{method='GET',data=null,raw=false,token=null,headers={}}={}){
 if(!apiRoot||!App.cfg?.publishableKey)throw Error('التطبيق لم يتصل بمشروع قاعدة البيانات.');
 const auth=token||App.session?.access_token||null;
 // New Supabase publishable keys are not JWTs. Send them as apikey only.
 const h={apikey:App.cfg.publishableKey,...headers};
 if(auth&&auth!==App.cfg.publishableKey)h.Authorization='Bearer '+auth;
 if(data!==null && !raw && !('Content-Type' in h))h['Content-Type']='application/json';
 let response;
 try{response=await fetch(apiRoot+path,{method,headers:h,body:data===null?undefined:raw?data:JSON.stringify(data)})}
 catch(e){syncLabel('غير متصل – التعديلات لم تُحفظ','bad');throw Error('تعذر الوصول للخادم. تحقق من اتصال الإنترنت.')}
 const text=await response.text();let body;try{body=text?JSON.parse(text):null}catch{body=text}
 if(!response.ok){const err=(body&&typeof body==='object'&&(body.message||body.msg||body.error_description||body.error))||('HTTP '+response.status);
  if(response.status===401||response.status===403){syncLabel('صلاحية غير متاحة','bad')}
  throw Error(err)}
 return body;
}
async function ensureSession(){
 const s=App.session;
 if(!s)throw Error('يجب تسجيل الدخول.');
 if(Date.now() < ((s.expires_at||0)-90)*1000)return s;
 if(!s.refresh_token)throw Error('انتهت جلسة الدخول؛ سجّل دخولك مرة أخرى.');
 const r=await api('/auth/v1/token?grant_type=refresh_token',{method:'POST',data:{refresh_token:s.refresh_token},token:App.cfg.publishableKey});
 r.expires_at=Math.floor(Date.now()/1000)+(r.expires_in||3600);storeSession(r);return r;
}
async function select(name,query=''){await ensureSession();return api('/rest/v1/'+name+(query?'?'+query:''))}
async function insert(name,obj){await ensureSession();return api('/rest/v1/'+name,{method:'POST',data:obj,headers:{Prefer:'return=representation'}})}
async function update(name,id,patch,ver=null,key='id'){await ensureSession();const q='?'+key+'=eq.'+encodeURIComponent(id)+(ver===null?'':'&version=eq.'+ver);const rows=await api('/rest/v1/'+name+q,{method:'PATCH',data:patch,headers:{Prefer:'return=representation'}});if(!rows?.length)throw Error('تعارض: عُدّل السجل من جهاز آخر. حدّث الصفحة وراجع البيانات قبل الحفظ.');return rows[0]}
async function callRpc(name,body={}){await ensureSession();return api('/rest/v1/rpc/'+name,{method:'POST',data:body})}
async function run(action,label='جارٍ الحفظ…'){if(App.busy)return;App.busy=true;syncLabel(label,'');try{await action();if(!App.demo){await loadData({silent:true})}flash('تم التنفيذ');syncLabel(App.demo?'بيانات تجريبية':'تمت المزامنة','ok');render()}catch(e){console.error(e);flash('تعذر التنفيذ: '+e.message,true);syncLabel('تحتاج مراجعة','bad')}finally{App.busy=false}}
async function signIn(email,password){
 const r=await api('/auth/v1/token?grant_type=password',{method:'POST',data:{email,password},token:App.cfg.publishableKey});
 r.expires_at=Math.floor(Date.now()/1000)+(r.expires_in||3600);storeSession(r);App.user=r.user||null;
 try{await callRpc('accept_invitations')}catch(e){console.warn('invitation check:',e.message)}
 await bootstrap();
}
async function signUp(email,password,name){
 const r=await api('/auth/v1/signup',{method:'POST',data:{email,password,data:{display_name:name}},token:App.cfg.publishableKey});
 return r;
}
async function recover(email){return api('/auth/v1/recover',{method:'POST',data:{email},token:App.cfg.publishableKey})}
async function signOut(){
 try{if(App.session)await api('/auth/v1/logout',{method:'POST'})}catch{}
 storeSession(null);App.demo=false;App.user=null;App.member=null;App.school=null;App.initialized=false;App.view='login';
 if(App.syncTimer){clearInterval(App.syncTimer);App.syncTimer=null}
 $('signoutButton').hidden=true;syncLabel('غير مسجّل','');render();
}
async function bootstrap(){
 App.loading=true;syncLabel('جارٍ التحقق من الحساب','');render();
 try{
  await ensureSession();App.user=await api('/auth/v1/user');
  if(!App.user?.id)throw Error('لم أتمكن من التأكد من هوية الحساب.');
  const mine=await select('memberships','select=id,school_id,user_id,role,status&user_id=eq.'+App.user.id);
  const valid=(mine||[]).find(m=>m.status==='active');
  if(!valid){App.member=null;App.school=null;App.loading=false;App.initialized=true;syncLabel('الحساب ينتظر الصلاحيات','');render();return}
  App.member=valid;
  const schools=await select('schools','select=id,name&id=eq.'+valid.school_id);
  App.school=schools?.[0]||{id:valid.school_id,name:'المدرسة'};
  await loadData({silent:true});App.initialized=true;App.loading=false;syncLabel('متصل – تمت المزامنة','ok');
  $('signoutButton').hidden=false;render();
  if(!App.syncTimer)App.syncTimer=setInterval(async()=>{if(!App.session||App.demo||document.hidden)return;try{await loadData({silent:true});syncLabel('متصل · '+new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),'ok');if(!document.activeElement?.closest('form'))render()}catch(e){syncLabel('تعذر التحديث – '+e.message,'bad')}},22000);
 }catch(e){App.loading=false;App.error=e.message;App.initialized=true;syncLabel('خطأ اتصال','bad');render()}
}
async function loadData({silent=false}={}){
 if(App.demo||!App.school)return;
 const sid=encodeURIComponent(App.school.id),q='?select=*&school_id=eq.'+sid;
 const tables=['academic_years','staff','classes','assignments','progress_entries','documents','questions','exams','meetings','branding'];
 const results=await Promise.all(tables.map(async t=>{try{return await select(t,q+(t==='progress_entries'?'&order=entry_date.desc&limit=300':''))}catch(e){if(t==='branding')return[];throw Error(t+': '+e.message)}}));
 [App.years,App.staff,App.classes,App.assignments,App.progress,App.documents,App.questions,App.exams,App.meetings]=results.slice(0,9);
 App.branding=results[9]?.[0]||null;
 const chosen=App.years.find(y=>y.id===App.yearId);
 if(!chosen)App.yearId=(App.years.find(y=>y.is_current)||App.years[0])?.id||null;
 if(isHead()){
   try{App.privateStaff=await select('staff_private',q)}catch{App.privateStaff=[]}
   try{App.members=await select('memberships',q);App.profiles=await select('profiles','?select=id,display_name,email')}catch{App.members=[];App.profiles=[]}
 }else{App.privateStaff=[];App.members=[];App.profiles=[]}
 App.lastSync=Date.now();if(!silent)syncLabel('تمت المزامنة','ok');
}
function go(page){if(!App.member&&!App.demo)return;App.page=page;render();window.scrollTo({top:0,behavior:'instant'})}
function render(){
 const main=$('main');if(!main)return;
 $('signoutButton').hidden=!(App.demo||App.session);
 if(App.loading){main.innerHTML='<div class="panel"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><p>جارٍ التحقق من حساب المدرسة…</p></div>';return}
 if(!App.demo&&!App.session){main.innerHTML=authView();return}
 if(!App.demo&&!App.member){main.innerHTML=pendingView();return}
 const pages={dashboard:dashboardView,teachers:teachersView,progress:progressView,years:yearsView,documents:documentsView,questions:questionsView,exams:examsView,meetings:meetingsView,members:membersView,branding:brandingView};
 main.innerHTML=(App.demo?'<div class="fake-banner">⚠️ وضع تجربة افتراضي — لا توجد بيانات حقيقية، ولا تُحفظ هذه التغييرات في قاعدة المدرسة.</div>':'')+(pages[App.page]||dashboardView)();
 document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===App.page));
 if(App.demo||App.member)$('schoolCaption').textContent=(App.school?.name||'المدرسة')+' · '+roleName(App.member?.role);
}
document.addEventListener('click',e=>{
 const n=e.target.closest('[data-page]');if(n){go(n.dataset.page);return}
 const a=e.target.closest('[data-action]');if(a){onAction(a.dataset.action,a.dataset.id||'');return}
});
document.addEventListener('submit',e=>{if(e.target.matches('form[data-form]')){e.preventDefault();onForm(e.target.dataset.form,e.target)}});
$('signoutButton').addEventListener('click',()=>signOut());
$('themeToggle').addEventListener('click',()=>document.body.classList.toggle('high-contrast'));
window.addEventListener('online',()=>{if(App.session&&!App.demo)bootstrap()});
window.addEventListener('offline',()=>syncLabel('غير متصل – لن تُحفظ أي تغييرات','bad'));
window.addEventListener('focus',async()=>{if(App.member&&!App.demo&&!document.activeElement?.closest('form')){try{await loadData({silent:true});render()}catch{}}});
window.addEventListener('DOMContentLoaded',()=>{const s=readSession();if(s){App.session=s;bootstrap()}else{App.initialized=true;render()}});
