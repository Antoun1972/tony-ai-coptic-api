'use strict';
/* Additional academic modules — never mark unreviewed source content as verified. */
const ALLOWED_TYPES=['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/png','image/jpeg','image/webp','audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/ogg','audio/webm'];
const MAX_FILE=15*1024*1024;
function documentsView(){
 const rows=App.documents.filter(d=>!App.yearId||d.year_id===App.yearId||!d.year_id).map(d=>tr([
   '<b>'+safe(d.title)+'</b><div class="small muted">'+safe(d.mime_type)+'</div>',
   safe(d.source_type),safe(d.grade||'عام'),safe(d.week??'—'),safe(fmt(d.created_at)),stateTag(d.status),
   '<div class="actions"><button data-action="download-doc" data-id="'+safe(d.id)+'">فتح المصدر</button>'+(isHead()&&d.status!=='approved'?'<button data-action="approve-doc" data-id="'+safe(d.id)+'">اعتماد الاستلام</button>':'')+'</div>'
 ]));
 const form=canSubmit()?panel('رفع ملف كتاب أو مراجعة أو تقييم أسبوعي','الملف الأصلي يبقى في مساحة خاصة بالمدرسة. كل مصدر مرتبط بسنة دراسية وصف ومرحلة.',
 '<form class="form" data-form="document"><div class="fields">'+
 field('title','عنوان المستند','','text','required placeholder="مراجعة الشهر – الصف الرابع"')+
 pick('source_type','نوع المستند',[['textbook','الكتاب المدرسي'],['weekly_evaluation','تقييم أسبوعي'],['monthly_review','مراجعة شهرية'],['exam','امتحان'],['lesson_plan','تحضير'],['audio','تسجيل صوتي'],['other','أخرى']],'weekly_evaluation')+
 pick('grade','الصف',[['','جميع المراحل'],...Array.from(new Set(App.classes.map(c=>c.grade))).map(x=>[x,x])])+
 field('week','الأسبوع (عند الحاجة)','','number','min="1" max="45"')+
 '<label class="field wide"><span>ملف المصدر PDF / Word / صورة / صوت – 15 MB بحد أقصى</span><input type="file" name="file" required accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.m4a,.wav,.ogg,.webm"></label></div>'+
 '<button class="primary" type="submit">رفع الملف إلى المكتبة الخاصة</button></form>'):'';
 return title('مكتبة الكتب والمراجعات','رفع المصادر من المدرسين وفحص ما تم استلامه؛ لا يوجد OCR أو تدقيق دلالي آلي في هذه النسخة.')+
 notice('رفع PDF أو Word يعني <b>حفظ الملف الأصلي</b> وربطه بسجل المدرسة، وليس إثبات تطابق أسئلة المراجعة مع الكتاب. المطابقة الدلالية والقراءة الآلية للملفات المصورة لم تُنفّذا بعد.',true)+
 form+panel('المستندات المسجلة',null,table(['المستند','النوع','الصف','Week','الاستلام','الحالة',''],rows));
}
async function sendFile(file,category='documents'){
 if(!file)throw Error('اختر ملفًا.');
 if(file.size===0||file.size>MAX_FILE)throw Error('الحد الأقصى للملف 15 MB.');
 if(!ALLOWED_TYPES.includes(file.type))throw Error('نوع الملف غير مدعوم: '+(file.type||'غير معروف'));
 const clean=String(file.name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-70)||'document';
 const key=App.school.id+'/'+(category==='branding'?'branding/':category==='audio'?'audio/':'')+crypto.randomUUID()+'_'+clean;
 await ensureSession();
 await api('/storage/v1/object/school-files/'+key.split('/').map(encodeURIComponent).join('/'),{
  method:'POST',data:file,raw:true,headers:{'Content-Type':file.type,'x-upsert':'false'}
 });
 return {path:key,mime:file.type,size:file.size};
}
async function signedFile(path){
 const r=await api('/storage/v1/object/sign/school-files/'+String(path).split('/').map(encodeURIComponent).join('/'),{method:'POST',data:{expiresIn:120}});
 const v=r?.signedURL||r?.signedUrl;if(!v)throw Error('تعذر توليد رابط مؤقت للملف.');
 return /^https:\/\//.test(v)?v:apiRoot+(v.startsWith('/storage/')?v:'/storage/v1'+v);
}
async function saveDocument(d,form){
 if(!canSubmit())return flash('الصلاحية غير متاحة.',true);
 const file=form.querySelector('[name="file"]')?.files?.[0];if(!file)return flash('اختر الملف المراد رفعه.',true);
 return run(async()=>{
  if(App.demo){App.documents.unshift({id:'d-'+Date.now(),title:d.title,source_type:d.source_type,grade:d.grade,week:d.week,status:'pending',created_at:new Date().toISOString(),mime_type:file.type,year_id:App.yearId});return}
  const uploaded=await sendFile(file);
  await insert('documents',{school_id:App.school.id,year_id:App.yearId||null,title:String(d.title).trim(),grade:d.grade||null,week:d.week?Number(d.week):null,source_type:d.source_type,storage_path:uploaded.path,mime_type:uploaded.mime,size_bytes:uploaded.size,status:'pending',uploaded_by:App.user.id});
 });
}
async function downloadDocument(id){
 const d=App.documents.find(x=>x.id===id);if(!d)return;
 if(App.demo)return flash('هذا مستند افتراضي. لا يوجد ملف حقيقي في وضع التجربة.');
 try{await ensureSession();const url=await signedFile(d.storage_path);window.open(url,'_blank','noopener,noreferrer')}catch(e){flash('تعذر فتح الملف: '+e.message,true)}
}
async function approveDocument(id){
 if(!isHead())return flash('اعتماد المستند من صلاحيات المدرس الأول فقط.',true);
 const d=App.documents.find(x=>x.id===id);if(!d)return;
 if(!confirm('اعتماد الاستلام فقط؟ هذا لا يثبت صحة محتوى الأسئلة أو مطابقته للمنهج.'))return;
 return run(async()=>update('documents',id,{status:'approved',updated_by:App.user.id},d.version));
}
function questionsView(){
 const list=App.questions;
 const rows=list.map(q=>tr([
 '<b>'+safe(q.body)+'</b><div class="small muted">'+safe(q.source_ref)+' (مرجع مدخل يدويًا)</div>',
 safe(q.grade),safe(({true_false:'صح وخطأ',mcq:'اختيار',short:'إجابة قصيرة',practical:'عملي'})[q.qtype]||q.qtype),safe(q.marks),
 q.approved?'<span class="tag ok">معتمد بشريًا</span>':'<span class="tag warn">غير معتمد</span>',
 isHead()&&!q.approved?'<button class="soft sm" data-action="approve-question" data-id="'+safe(q.id)+'">اعتماد السؤال</button>':'—'
 ]));
 const form=canSubmit()?panel('إضافة سؤال موثق','لابد من إدخال إجابة مرجعية. الاعتماد النهائي للمدرس الأول بعد مراجعة الكتاب والتقييم.',
 '<form class="form" data-form="question"><div class="fields">'+
 pick('grade','الصف',Array.from(new Set(App.classes.map(c=>c.grade).concat(['4th Primary']))).map(x=>[x,x]))+
 pick('qtype','نوع السؤال',[['true_false','True / False'],['mcq','Multiple Choice'],['short','Short Answer'],['practical','Practical']],'true_false')+
 pick('language','اللغة',[['en','English'],['ar','Arabic']],'en')+
 field('marks','درجة السؤال','1','number','min="0.5" step="0.5" required')+
 '</div>'+textarea('body','نص السؤال','', 'required')+textarea('choices','الاختيارات لسؤال MCQ — كل اختيار في سطر')+
 field('answer','الإجابة النموذجية','', 'text','required')+field('source_ref','مرجع السؤال – الملف ورقم الصفحة أو رقم التقييم','', 'text','required placeholder="Book p. 18 / Evaluation 6 Q3"')+
 notice('حقل المرجع نص يدخله المدرس؛ لا يعني أن التطبيق تحقق من الصفحة أو صحة الإجابة تلقائيًا.',true)+
 '<button class="primary" type="submit">إرسال السؤال للمراجعة</button></form>'):'';
 return title('بنك الأسئلة','فصل الأسئلة المعتمدة عن المقترحات غير الموثقة. لا تُنشأ أسئلة بالاختلاق.')+form+
 panel('الأسئلة المسجلة','التصميم النهائي يستخدم الأسئلة المعتمدة فقط.',table(['السؤال والمصدر','الصف','النوع','الدرجة','الاعتماد',''],rows));
}
async function saveQuestion(d){
 if(!canSubmit())return flash('غير مسموح.',true);
 if(!String(d.body||'').trim()||!String(d.answer||'').trim()||!String(d.source_ref||'').trim())return flash('السؤال وإجابته ومرجعه حقول مطلوبة.',true);
 return run(async()=>{
  const row={school_id:App.school.id,grade:d.grade,qtype:d.qtype,language:d.language,marks:Number(d.marks),body:String(d.body).trim(),choices:d.qtype==='mcq'?String(d.choices||'').split('\n').map(x=>x.trim()).filter(Boolean):null,answer:String(d.answer).trim(),source_ref:String(d.source_ref).trim(),approved:false,created_by:App.user.id};
  if(App.demo)App.questions.push({...row,id:'q-'+Date.now()});else await insert('questions',row);
 });
}
async function approveQuestion(id){
 if(!isHead())return flash('الاعتماد بشري ومن صلاحية المدرس الأول.',true);
 const q=App.questions.find(x=>x.id===id);if(!q)return;
 if(!confirm('هل تحققت من مصدر السؤال وصحة الإجابة وتغطية المنهج؟'))return;
 return run(async()=>update('questions',id,{approved:true,updated_by:App.user.id},q.version));
}
function examGradeOptions(){
 const g=Array.from(new Set(App.classes.map(c=>c.grade).concat(App.questions.map(q=>q.grade)).concat(['4th Primary'])));
 return g.map(v=>[v,v]);
}
function examsView(){
 const exams=App.exams.filter(x=>!App.yearId||x.spec?.year_id===App.yearId||!x.spec?.year_id);
 const rows=exams.map(e=>tr([
 '<strong>'+safe(e.title)+'</strong><div class="muted small">'+safe(e.grade)+'</div>',
 safe(fmt(e.created_at)),
 e.finalized?'<span class="tag ok">امتحان معتمد</span>':'<span class="tag warn">DRAFT</span>',
 '<div class="actions"><button data-action="preview-exam" data-id="'+safe(e.id)+'">معاينة الطالب</button><button data-action="preview-answers" data-id="'+safe(e.id)+'">Model Answer</button>'+(isHead()&&!e.finalized?'<button data-action="approve-exam" data-id="'+safe(e.id)+'">اعتماد نهائي</button>':'')+'</div>'
 ]));
 const form=canEdit()?panel('مواصفات الورقة الامتحانية','حدد أعداد الأسئلة والدرجات والصف. يمنع النظام إنشاء الورقة إذا لم يتوفر بنك أسئلة معتمد وكافٍ.',
 '<form class="form" data-form="make-exam"><div class="fields">'+
 field('title','عنوان الامتحان','ICT Monthly Exam – November','text','required')+
 pick('grade','الصف',examGradeOptions(),'4th Primary')+
 pick('language','اللغة',[['en','English'],['ar','Arabic']],'en')+
 pick('models','النماذج',[['A','Model A'],['A,B,C','Models A / B / C (إعادة ترتيب)']],'A')+
 field('true_count','عدد True / False','1','number','min="0" max="35" required')+
 field('mcq_count','عدد MCQ','1','number','min="0" max="35" required')+
 field('short_count','عدد الإجابات القصيرة','0','number','min="0" max="35" required')+
 field('marks','درجة السؤال لكل نوع (مبدئيًا)','1','number','step="0.5" min="0.5" required')+
 field('duration','الزمن','One Period')+
 '</div><button class="primary" type="submit">تكوين مسودة من الأسئلة المعتمدة</button></form>'):'';
 return title('استوديو الامتحانات والمراجعات','معاينة A4 فعلية قبل الطباعة. نسخة الطالب وإجابة نموذجية منفصلتان.')+
 notice('البرنامج لا يؤلف أسئلة من الكتاب تلقائيًا، ولا يضمن تطابقها بالمناهج دون مراجعة بشرية. ملفات Word الناتجة بصيغة DOC المتوافقة مع Word حاليًا، وليس DOCX.',true)+
 form+panel('الامتحانات المسجلة',null,table(['العنوان','التاريخ','الحالة','معاينة وإخراج'],rows));
}
function examEligible(q,grade,type,lang,marks){
 return q.approved&&q.grade===grade&&q.qtype===type&&q.language===lang&&Math.abs(Number(q.marks)-marks)<.0001;
}
function orderForModel(arr,model){
 const a=[...arr].sort((x,y)=>String(x.id).localeCompare(String(y.id)));
 const shift=({A:0,B:1,C:2})[model]||0;
 for(let z=0;z<shift;z++)if(a.length>1)a.push(a.shift());
 return a;
}
async function buildExam(d){
 if(!canEdit())return flash('الإجراء للمدرس الأول.',true);
 const mark=Number(d.marks),rows=[['true_false',Number(d.true_count)],['mcq',Number(d.mcq_count)],['short',Number(d.short_count)]].filter(x=>x[1]>0);
 if(!rows.length)return flash('اختر نوعًا واحدًا من الأسئلة على الأقل.',true);
 const shortages=rows.map(([type,count])=>({type,count,pool:App.questions.filter(q=>examEligible(q,d.grade,type,d.language,mark))})).filter(x=>x.pool.length<x.count);
 if(shortages.length)return flash('لا توجد أسئلة معتمدة كافية: '+shortages.map(x=>x.type+' المطلوب '+x.count+' والمتاح '+x.pool.length).join('؛ '),true);
 const models=String(d.models).split(',');
 const specModels=models.map(model=>({
   model,
   sections:rows.map(([type,count])=>{
     const pool=App.questions.filter(q=>examEligible(q,d.grade,type,d.language,mark));
     return {type,marks:mark,questions:orderForModel(pool,model).slice(0,count).map(q=>({id:q.id,body:q.body,choices:q.choices,answer:q.answer,source_ref:q.source_ref,marks:q.marks}))}
   })
 }));
 const spec={year_id:App.yearId,models:specModels,duration:d.duration,grade:d.grade,language:d.language,total:rows.reduce((s,r)=>s+r[1]*mark,0),source_policy:'Questions approved by senior teacher; page references submitted manually.'};
 return run(async()=>{
  const row={school_id:App.school.id,title:d.title,grade:d.grade,language:d.language,spec,created_by:App.user.id,finalized:false};
  if(App.demo)App.exams.unshift({...row,id:'exam-'+Date.now(),created_at:new Date().toISOString(),version:1});else await insert('exams',row);
 });
}
async function approveExam(id){
 if(!isHead())return flash('اعتماد الامتحانات من صلاحية المدرس الأول.',true);
 const ex=App.exams.find(e=>e.id===id);if(!ex)return;
 if(!confirm('هل راجعت نص الأسئلة والإجابات والدرجات والمراجع يدويًا؟ اعتمادك سيقفل الامتحان.'))return;
 return run(async()=>update('exams',id,{finalized:true,updated_by:App.user.id},ex.version));
}
function paperStyles(){
 return '@page{size:A4;margin:14mm}*{box-sizing:border-box}body{margin:0;font:13px/1.65 "Times New Roman",Arial,sans-serif;color:#152d49;background:white} .sheet{width:100%;min-height:260mm;border:1.7px solid #17365a;padding:13mm 10mm 11mm;page-break-after:always;position:relative}.sheet:last-child{page-break-after:auto}.school-row{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #c9a654;padding-bottom:10px;gap:12px}.school-row .logo{max-width:68px;max-height:68px;object-fit:contain}.school-row .group{font-size:10px;line-height:1.5}.school-name{text-align:center;font:bold 14px Georgia,serif;letter-spacing:.4px}.subject{text-align:center;font-weight:bold;border-top:1px solid #183755;border-bottom:1px solid #183755;background:#e9f0f8;padding:8px;margin:14px 0}.info{display:flex;justify-content:space-between;gap:15px;margin:8px 0;font-size:11px}.section-head{background:#1d4168;color:#fff;padding:7px 10px;margin-top:16px;font-weight:bold;display:flex;justify-content:space-between}.section-head em{font-style:normal;color:#dfca95}.q{margin:10px 0;break-inside:avoid}.q .num{font-weight:bold;display:inline-block;min-width:23px}.q .choices{padding-left:20px;color:#354c62;font-size:11px;margin:5px}.writing{height:27px;border-bottom:1px dotted #aebdc9}.answer{color:#175c49;font-weight:bold;padding:4px 20px}.sources{font-size:10px;color:#6c7b8f}.watermark{position:absolute;top:45%;left:12%;transform:rotate(-30deg);font-size:72px;color:rgba(174,54,45,.12);font-weight:800;letter-spacing:6px;pointer-events:none}.footer{position:absolute;bottom:8mm;left:10mm;right:10mm;border-top:1px solid #d3dfe8;padding-top:6px;text-align:center;font-size:9px;color:#6b7b8a}.paper-note{font-size:10px;color:#8a6120}.ar{direction:rtl;text-align:right}.en{direction:ltr;text-align:left}@media print{.sheet{box-shadow:none}}';
}
function paperBody(ex,answers=false,logoUrl=''){
 const brand=App.branding||{};
 const models=ex.spec?.models||[];
 const head=(model)=>'<div class="school-row"><div class="group">'+safe(brand.governorate||'Cairo Governorate')+'<br>'+safe(brand.administration||'Education Administration')+'<br>'+safe(brand.department||'ICT Department')+'</div><div class="school-name">'+safe(brand.school_name||'COLLÈGE SAINT PAUL – FRÈRES SHOUBRA')+'<br><small>TONY AI</small></div>'+(logoUrl?'<img class="logo" src="'+safe(logoUrl)+'" alt="School logo">':'<div class="group">School Logo</div>')+'</div>'+
 '<div class="subject">'+safe(ex.title)+(answers?' · MODEL ANSWER':'')+' · Model '+safe(model.model)+'</div>'+
 '<div class="info"><span>Name: _________________________</span><span>Grade: '+safe(ex.grade)+'</span></div>'+
 '<div class="info"><span>Time: '+safe(ex.spec.duration||'One Period')+'</span><span>Total Marks: '+safe(ex.spec.total)+'</span></div>';
 return models.map(model=>{
 const sections=(model.sections||[]).map((sect,idx)=>{
 const label=({true_false:'True or False',mcq:'Choose the correct answer',short:'Answer the following questions',practical:'Practical'})[sect.type]||sect.type;
 const total=sect.questions.reduce((s,q)=>s+Number(q.marks),0);
 return '<div class="section-head"><span>Q'+(idx+1)+': '+safe(label)+'</span><em>('+safe(total)+' Marks)</em></div>'+
 sect.questions.map((q,i)=>'<div class="q"><span class="num">'+(i+1)+'.</span>'+safe(q.body)+
 (sect.type==='true_false'&&!answers?' <span>( True / False )</span>':'')+
 (Array.isArray(q.choices)?'<div class="choices">'+q.choices.map((o,j)=>String.fromCharCode(65+j)+') '+safe(o)).join('　')+'</div>':'')+
 (answers?'<div class="answer">Answer: '+safe(q.answer)+' · '+safe(q.marks)+' mark(s)</div><div class="sources">Source entered by teacher: '+safe(q.source_ref||'Not specified')+'</div>':sect.type==='short'?'<div class="writing"></div><div class="writing"></div>':'')+
 '</div>').join('')
 }).join('');
 return '<section class="sheet '+(ex.language==='ar'?'ar':'en')+'">'+(!ex.finalized?'<div class="watermark">DRAFT</div>':'')+head(model)+sections+
 (answers?'<p class="paper-note">Check manual source references and acceptable alternative answers before final approval.</p>':'')+
 '<div class="footer">'+safe(brand.footer_note||'TONY AI · ICT Department')+' · '+(ex.finalized?'Approved':'DRAFT – NOT APPROVED')+'</div></section>';
 }).join('');
}
async function previewSavedExam(id,answers=false){
 const ex=App.exams.find(x=>x.id===id);if(!ex)return;
 try{
  let logo='';if(!App.demo&&App.branding?.logo_path){try{logo=await signedFile(App.branding.logo_path)}catch{}}
  showPreview(paperBody(ex,answers,logo),answers?'Model Answer · '+ex.title:ex.title,answers?'TONY_AI_Model_Answer':'TONY_AI_Exam');
 }catch(e){flash('تعذرت المعاينة: '+e.message,true)}
}
function showPreview(body,titleText,filename){
 App.previewHTML=body;App.printTitle=filename||'TONY_AI_ICT';
 $('previewTitle').textContent=titleText;
 const doc='<!doctype html><html lang="ar"><head><meta charset="utf-8"><title>'+safe(titleText)+'</title><style>'+paperStyles()+'</style></head><body>'+body+'</body></html>';
 $('printFrame').srcdoc=doc;
 $('previewDialog').showModal();
}
function exportWordPreview(){
 if(!App.previewHTML)return;
 const doc='<!doctype html><html><head><meta charset="utf-8"><style>'+paperStyles()+'</style></head><body>'+App.previewHTML+'</body></html>';
 const blob=new Blob(['\ufeff',doc],{type:'application/msword;charset=utf-8'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(App.printTitle||'TONY_AI_ICT')+'.doc';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),25000);
 flash('تم تنزيل DOC متوافق مع Word. هذه الصيغة ليست DOCX؛ افتحه في Word ثم احفظ نسخة DOCX إذا لزم.');
}
$('doWord').addEventListener('click',exportWordPreview);
$('doPrint').addEventListener('click',()=>{try{$('printFrame').contentWindow.focus();$('printFrame').contentWindow.print()}catch(e){flash('تعذر فتح الطباعة: '+e.message,true)}});
$('closePreview').addEventListener('click',()=>$('previewDialog').close());
function meetingsView(){
 const rows=App.meetings.map(m=>tr([safe(m.title),safe(fmt(m.meeting_date)),safe(m.attendees||'—'),safe(String(m.decisions||'').slice(0,80)), '<button class="soft sm" data-action="preview-meeting" data-id="'+safe(m.id)+'">معاينة المحضر</button>']));
 const form=App.demo||isHead()||['reviewer','teacher'].includes(App.member?.role)?panel('محضر اجتماع جديد','لا ترفع تسجيلات صوتية دون علم وموافقة المشاركين.',
 '<form class="form" data-form="meeting"><div class="fields">'+field('title','عنوان الاجتماع','','text','required')+field('meeting_date','التاريخ',nowISO(),'date','required')+'</div>'+
 textarea('attendees','الحاضرون')+textarea('agenda','جدول الأعمال')+textarea('minutes','محضر المناقشات')+textarea('decisions','القرارات والتكليفات')+
 '<label class="field"><span>تسجيل صوتي اختياري (يتطلب موافقة)</span><input name="audio" type="file" accept=".mp3,.m4a,.wav,.ogg,.webm"></label>'+
 '<label class="field"><span><input name="audio_consent" type="checkbox" value="true"> أؤكد علم وموافقة المشاركين على تسجيل الصوت وحفظه</span></label>'+
 '<button class="primary" type="submit">حفظ المحضر</button></form>'):'';
 return title('محاضر الاجتماعات','الاجتماعات وملاحظات التوجيه والتوصيات، مع تصدير ورقة A4.')+form+panel('سجل الاجتماعات',null,table(['الموضوع','التاريخ','الحضور','القرارات',''],rows));
}
async function saveMeeting(d,form){
 const f=form.querySelector('[name="audio"]')?.files?.[0];
 if(f&&!d.audio_consent)return flash('يجب تأكيد موافقة الحاضرين قبل رفع تسجيل صوتي.',true);
 return run(async()=>{
  const row={school_id:App.school.id,meeting_date:d.meeting_date,title:d.title,attendees:d.attendees||null,agenda:d.agenda||null,minutes:d.minutes||null,decisions:d.decisions||null,action_items:[],audio_consent:!!d.audio_consent,created_by:App.user.id};
  if(App.demo){App.meetings.unshift({...row,id:'m-'+Date.now(),created_at:new Date().toISOString()})}
  else{if(f){const up=await sendFile(f,'audio');row.audio_path=up.path}await insert('meetings',row)}
 });
}
function previewMeeting(id){
 const m=App.meetings.find(x=>x.id===id);if(!m)return;
 const b=App.branding||{};
 const body='<section class="sheet ar">'+(!App.demo?'<div class="watermark">DRAFT</div>':'')+
 '<div class="school-name">'+safe(b.school_name||'Collège Saint Paul')+'<br>'+safe(b.department||'ICT')+'</div>'+
 '<div class="subject">محضر اجتماع: '+safe(m.title)+'</div><div class="info"><span>التاريخ: '+safe(fmt(m.meeting_date))+'</span><span>TONY AI</span></div>'+
 ['الحاضرون','جدول الأعمال','المناقشات','القرارات والتكليفات'].map((h,i)=>'<div class="section-head">'+h+'</div><p>'+safe([m.attendees,m.agenda,m.minutes,m.decisions][i]||'لم يُسجل')+'</p>').join('')+
 '<div class="footer">TONY AI · سجل للاطلاع والمراجعة</div></section>';
 showPreview(body,'محضر اجتماع – '+m.title,'TONY_AI_Meeting');
}
function brandingView(){
 const b=App.branding||{};
 const form=canEdit()?panel('بيانات ترويسة المدرسة','هذه البيانات تطبق على كل معاينات الامتحانات والمحاضر.',
 '<form class="form" data-form="branding"><div class="fields">'+field('governorate','المحافظة',b.governorate||'Cairo Governorate')+
 field('administration','الإدارة التعليمية',b.administration||'Rod El-Farag Education')+
 field('school_name','اسم المدرسة',b.school_name||'COLLÈGE SAINT PAUL – FRÈRES SHOUBRA')+
 field('department','القسم',b.department||'ICT Department')+'</div>'+textarea('header_note','الدباجة والنص الإضافي',b.header_note||'')+textarea('footer_note','التذييل',b.footer_note||'TONY AI')+
 '<label class="field"><span>شعار المدرسة PNG / JPG (اختياري)</span><input type="file" name="logo" accept=".png,.jpg,.jpeg,.webp"></label>'+
 '<button class="primary" type="submit">حفظ الترويسة</button></form>'):'';
 return title('هوية ورقة الامتحان','الترويسة الرسمية وشعار المدرسة، قابلة للاستخدام في المعاينة وملفات Word.')+
 form+panel('معاينة طباعة الترويسة','لا تعني معاينة الترويسة أن الامتحان معتمد.',
 '<div class="inside"><b>'+safe(b.school_name||'Collège Saint Paul')+'</b><div class="muted">'+safe(b.governorate||'Cairo Governorate')+' · '+safe(b.administration||'Education Administration')+'</div><p>'+safe(b.department||'ICT')+'</p><button class="soft" data-action="preview-branding">فتح Print Preview A4</button></div>');
}
async function saveBranding(d,form){
 if(!canEdit())return flash('صلاحيات المدرس الأول فقط.',true);
 return run(async()=>{
  const patch={governorate:d.governorate,administration:d.administration,school_name:d.school_name,department:d.department,header_note:d.header_note||null,footer_note:d.footer_note||null,updated_by:App.user.id};
  const f=form.querySelector('[name="logo"]')?.files?.[0];
  if(App.demo){App.branding={...App.branding,...patch};return}
  if(f){if(!['image/png','image/jpeg','image/webp'].includes(f.type))throw Error('الشعار يجب أن يكون صورة.');const up=await sendFile(f,'branding');patch.logo_path=up.path}
  if(App.branding)await update('branding',App.school.id,patch,App.branding.version,'school_id');else await insert('branding',{school_id:App.school.id,...patch});
 });
}
async function previewBranding(){
 const b=App.branding||{};
 let logo='';if(!App.demo&&b.logo_path){try{logo=await signedFile(b.logo_path)}catch{}}
 const ex={title:'EXAM HEADER PREVIEW',grade:'4th Primary',spec:{models:[{model:'A',sections:[]}],total:15,duration:'One Period'},finalized:false};
 showPreview(paperBody(ex,false,logo),'معاينة ترويسة المدرسة','TONY_AI_Header_Preview');
}
function membersView(){
 const rows=(App.members||[]).map(m=>{
  const p=App.profiles.find(x=>x.id===m.user_id);
  return tr([safe(p?.display_name||p?.email||m.user_id),safe(roleName(m.role)),m.status==='active'?'<span class="tag ok">نشط</span>':'<span class="tag warn">موقوف</span>']);
 });
 const form=isHead()?panel('دعوة مدرس أو مراجع','تُسجل الدعوة في النظام. يجب على المستخدم إنشاء حساب بالبريد نفسه والتحقق منه لتفعيل الصلاحية.',
 '<form data-form="invite" class="form"><div class="fields">'+field('email','البريد الإلكتروني للمدرس','','email','required')+
 pick('role','صلاحية الحساب',[['teacher','مدرس / مدرسة'],['reviewer','مراجع'],['management','إدارة المدرسة']],'teacher')+'</div><button class="primary">تسجيل الدعوة في النظام</button></form>'):'';
 return title('الحسابات والصلاحيات','الأدوار تُطبّق في قاعدة البيانات ولا يستطيع أي مستخدم ترقية نفسه.')+
 notice('رئيس النظام الداخلي يُسمى تقنيًا head، لكن المسمى المعتمد في كل شاشات البرنامج هو <b>مدرس أول ICT</b>. لا يتم إرسال بريد الدعوة تلقائيًا في هذه النسخة.',true)+
 form+panel('المستخدمون المسجلون',null,table(['الحساب','الصلاحية','الحالة'],rows));
}
async function saveInvitation(d){
 if(!isHead())return flash('دعوة المستخدمين صلاحية المدرس الأول.',true);
 return run(async()=>{await insert('invitations',{school_id:App.school.id,email:String(d.email).trim().toLowerCase(),role:d.role,invited_by:App.user.id});flash('تم تسجيل الدعوة. أعطِ المدرس رابط الموقع ليؤكد بريده ويسجّل الدخول.')});
}
