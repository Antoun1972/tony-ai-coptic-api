'use strict';
function authView(){
 const view=App.view||'login', tabs='<div class="auth-tabs"><button data-action="auth-login" class="'+(view==='login'?'active':'')+'">تسجيل الدخول</button><button data-action="auth-signup" class="'+(view==='signup'?'active':'')+'">إنشاء حساب</button></div>';
 const intro='<div class="auth-head"><div class="shield">✧</div><span class="eyebrow">SENIOR ICT TEACHER · SCHOOL MANAGER</span><h1>TONY AI ICT Manager</h1><p>لوحة متابعة مدرس أول ICT والبرمجة والذكاء الاصطناعي<br>Collège Saint Paul – Frères Shoubra</p></div>';
 const note=notice('الحساب الجديد يظل <b>بانتظار التفويض</b> حتى يتم اعتماده من إدارة النظام. لا يحصل أي شخص على صلاحيات المدرسة تلقائيًا.',true);
 let body='';
 if(view==='reset'){
  body='<form class="form" data-form="recover"><label class="field"><span>البريد الإلكتروني</span><input name="email" type="email" autocomplete="email" required></label><button type="submit" class="primary">إرسال رابط إعادة تعيين كلمة المرور</button></form><p class="login-help"><button class="ghost sm" data-action="auth-login">عودة إلى تسجيل الدخول</button></p>';
 }else{
  body=tabs+'<form class="form" data-form="'+(view==='signup'?'signup':'login')+'">'+(view==='signup'?field('name','الاسم الظاهر على الحساب','','text','autocomplete="name" required'):'')+field('email','البريد الإلكتروني','','email','autocomplete="email" required')+field('password','كلمة المرور','','password','minlength="8" autocomplete="'+(view==='signup'?'new-password':'current-password')+'" required')+'<button type="submit" class="primary">'+(view==='signup'?'إنشاء حساب للتحقق':'دخول آمن')+'</button></form>'+(view==='login'?'<p class="login-help"><button class="ghost sm" data-action="auth-reset">نسيت كلمة المرور؟</button></p>':'')+note;
 }
 return '<div class="auth-wrap"><div class="auth-card">'+intro+body+'<div class="divider"></div><button class="outline" style="width:100%" data-action="demo">تجربة الواجهة ببيانات افتراضية فقط</button><p class="login-help">لا تستخدم بيانات الموظفين الحقيقية قبل اكتمال اختبار الصلاحيات والموافقة على الاستضافة.</p></div></div>';
}
function pendingView(){
 return title('حسابك في انتظار الربط بالمدرسة','تم تسجيل دخولك، لكن لا توجد صلاحية مدرسة نشطة مرتبطة بالحساب بعد.')+
 panel('إعداد حساب المدرس الأول','تم التحقق من هوية الحساب. لا توجد طريقة لإعطاء نفسك صلاحية مدير من الشاشة.',
 '<div class="section-steps"><div class="step"><b>1</b><span>تأكد أنك فعّلت البريد الإلكتروني للحساب: <strong>'+safe(App.user?.email||'')+'</strong>.</span></div><div class="step"><b>2</b><span>مالك قاعدة البيانات يعيّن هذا الحساب بصلاحية <b>مدرس أول ICT</b> من لوحة الخادم الآمنة.</span></div><div class="step"><b>3</b><span>بعد التعيين اضغط على زر تحديث الصلاحيات هنا، ثم ابدأ بأسماء ومناهج تجريبية.</span></div></div>'+
 '<div class="toolbar"><button class="primary" data-action="refresh-account">تحديث صلاحيات الحساب</button><button class="soft" data-action="demo">تجربة بدون بيانات حقيقية</button></div>'+
 notice('لم يُنشأ للمشروع حساب مدرس أول معتمد حتى الآن. التطبيق لا يمكنه تجاوز هذه الخطوة ولا يسمح لأي مستخدم بترقية نفسه.'))+
 (App.error?notice(safe(App.error),true):'');
}
function dashboardView(){
 const prog=App.progress.filter(x=>!App.yearId||x.year_id===App.yearId);
 const cnt=App.staff.filter(x=>!x.archived).length;
 const needs=prog.filter(x=>['flagged','submitted'].includes(x.review_state)).length;
 const docNeeds=App.documents.filter(x=>x.status==='pending').length;
 const y=getYear();
 const stats=[['♙','هيئة التدريس',cnt,'ملفات نشطة'],['▦','الفصول',App.classes.filter(x=>x.year_id===App.yearId).length,'في العام المختار'],['▤','مواقف المنهج',prog.length,'تحديثات مسجلة'],['◷','تحتاج متابعة',needs+docNeeds,'مراجعات ومستندات']];
 const rows=prog.slice(0,8).map(x=>tr([safe(App.staff.find(s=>s.id===x.staff_id)?.name_ar||'غير محدد'),safe(x.grade)+' / '+safe(x.section),safe(x.theme_unit)+' — '+safe(x.lesson),'<span dir="ltr">'+safe(x.week)+'</span>',safe(x.evaluation||'غير مذكور'),stateTag(x.review_state)]));
 return title('صباح الخير · متابعة قسم ICT','العام الدراسي '+safe(y?.label||'لم يُحدد')+' · رؤية موحدة لآخر الدروس والتقييمات وما يحتاج قرارًا منك','<button data-action="refresh" class="soft">↻ تحديث البيانات</button>')+
 '<div class="cards">'+stats.map(s=>'<div class="stat"><div class="mini-icon">'+s[0]+'</div><div class="caption">'+s[1]+'</div><div class="number">'+s[2]+'</div><div class="hint">'+s[3]+'</div></div>').join('')+'</div>'+
 '<div class="grid-2">'+panel('أحدث مواقف المنهج','Week لا يعني Evaluation. كل خانة تُسجل مستقلة.'+(!App.demo?' آخر مزامنة '+new Date(App.lastSync).toLocaleTimeString('ar-EG'):''),
 table(['المدرس','الصف والفصل','آخر درس','Week','Evaluation','حالة المراجعة'],rows)+
 '<div class="toolbar"><button class="soft" data-page="progress">فتح متابعة المنهج ←</button></div>')+
 panel('مهام المدرس الأول','مراجعة الملفات، تدقيق الملاحظات والاعتماد قبل إنتاج الامتحان.',
 '<div class="timeline"><div>متابعة '+needs+' موقفًا غير معتمد أو يحتاج توضيحًا</div><div>فحص '+docNeeds+' ملفًا ينتظر المراجعة</div><div>التحقق من تغطية الدروس قبل اعتماد الامتحانات</div><div>سجل كامل لتعديلات كل سنة دون حذف أرشيفها</div></div>'+
 '<div class="btn-row"><button class="primary" data-page="documents">استلام الملفات</button><button class="soft" data-page="exams">استوديو الامتحان</button></div>')+'</div>'+
 notice('الأرقام المعروضة تخص '+(App.demo?'بيانات افتراضية للتجربة فقط.':'الحساب والمدرسة الحالية وفق صلاحياتك. المزامنة تتم عند فتح الصفحة ثم كل 22 ثانية تقريبًا عند الاتصال.'))+
 panel('الأدوات التي لم يكتمل تنفيذها','لا يتم إظهار وظائف صورية على أنها تعمل.','<span class="tag warn">OCR للـ PDF المصور: غير متاح بعد</span> <span class="tag warn">التدقيق الدلالي بالذكاء الاصطناعي: قيد التطوير</span> <span class="tag warn">ترحيل V6 التلقائي: غير متاح</span>');
}
function teachersView(){
 const rows=App.staff.map(s=>{
 const v=App.privateStaff.find(x=>x.staff_id===s.id)||{};
 return tr(['<strong>'+safe(s.name_ar)+'</strong><div class="muted small" dir="ltr">'+safe(s.name_en)+'</div>',safe(s.specialization||'—'),safe(s.employment_status||'غير محدد'),s.archived?'<span class="tag warn">مؤرشف</span>':'<span class="tag ok">نشط</span>',isHead()?safe(v.qualification||'—'):'محمي',isHead()?'<div class="actions"><button data-action="edit-staff" data-id="'+safe(s.id)+'">تعديل</button><button data-action="archive-staff" data-id="'+safe(s.id)+'">'+(s.archived?'إعادة تفعيل':'أرشفة')+'</button></div>':'—']);
 });
 const members=App.members.filter(m=>m.role==='teacher').map(m=>{const p=App.profiles.find(p=>p.id===m.user_id);return [m.user_id,p?.display_name||p?.email||m.user_id]});
 const newForm=canEdit()?panel('إضافة مدرس أو مدرسة','الاسم الرباعي مطلوب عربي وإنجليزي. البيانات الناقصة لا تُستكمل بالتخمين.',
 '<form data-form="staff" class="form"><input type="hidden" name="id" value=""><div class="fields">'+field('name_ar','الاسم الرباعي بالعربية','','text','required')+field('name_en','Full Name in English','','text','dir="ltr" required')+field('specialization','التخصص','ICT / Programming / AI')+field('years_experience','سنوات الخبرة','','number','min="0" max="65"')+
 pick('employment_status','الحالة الوظيفية',[['active','على رأس العمل'],['leave','إجازة'],['transferred','منقول'],['left','استقال / ترك العمل']],'active')+
 pick('user_id','ربط الحساب المدرسي',[['','بدون حساب مرتبط حاليًا'],...members],'')+
 field('phone','الموبايل (بيانات مقيدة)')+field('birthday','تاريخ الميلاد (مقيّد)','','date')+field('qualification','المؤهل الدراسي (مقيّد)')+field('university','الجامعة (مقيّد)')+'</div><button type="submit" class="primary">حفظ الملف الوظيفي</button></form>'):'';
 return title('ملفات المدرسين','إدارة مرنة: إضافة، تعديل، أرشفة، وإعادة تفعيل دون ضياع السنوات السابقة.')+
 newForm+panel('سجل الهيئة التعليمية','الملفات المؤرشفة تبقى محفوظة لتقارير الأعوام الماضية.',
 table(['الاسم','التخصص','الحالة الوظيفية','الأرشفة','المؤهل','إجراءات'],rows));
}
function yearsView(){
 const y=getYear();
 const form=canEdit()?panel('سنة دراسية جديدة','السنة الجديدة مستقلة عن سجلات السنوات السابقة.',
 '<form class="form" data-form="year"><div class="fields">'+field('label','العام الدراسي (مثال 2027/2028)','','text','required pattern="[0-9]{4}/[0-9]{4}"')+'</div><button class="primary" type="submit">إضافة سنة</button></form>'):'';
 const yearselect='<div class="toolbar"><label class="field"><span>عرض العام الدراسي</span><select id="yearSelect">'+opts(App.years,App.yearId,'id','label')+'</select></label></div>';
 const classForm=canEdit()&&y?panel('إضافة فصل وتكليف مدرس','احتفظ باسم المرحلة والفصل كما يظهران في جدول المدرسة.',
 '<form data-form="class" class="form"><div class="fields">'+field('grade','الصف / المرحلة','','text','placeholder="4th Primary / Prep 1" required')+field('section','الفصل','','text','placeholder="A" required')+'</div><button class="primary" type="submit">حفظ الفصل</button></form>'+
 '<form data-form="assignment" class="form" style="margin-top:20px"><div class="fields">'+pick('staff_id','المدرس',App.staff.filter(x=>!x.archived).map(x=>[x.id,x.name_ar]))+pick('class_id','الفصل',App.classes.filter(x=>x.year_id===App.yearId).map(x=>[x.id,x.grade+' – '+x.section]))+field('periods_per_week','حصص أسبوعية','','number','min="0" max="50"')+'</div><button type="submit" class="soft">إسناد الفصل للمدرس</button></form>'):'';
 const rows=App.classes.filter(c=>c.year_id===App.yearId).map(c=>tr([safe(c.grade),safe(c.section),safe(App.staff.find(s=>App.assignments.some(a=>a.class_id===c.id&&a.staff_id===s.id))?.name_ar||'لم يُسند'),safe(App.assignments.find(a=>a.class_id===c.id)?.periods_per_week??'—')]));
 return title('السنوات الدراسية والفصول','تحويل العام الدراسي لا ينقل الدرجات أو سجلات السنة الماضية تلقائيًا.')+
 panel('تحديد العام',null,yearselect+(y?'<span class="tag blue">السنة الحالية: '+safe(y.label)+'</span>':notice('لا توجد سنوات بعد. أضف أول سنة من النموذج.',true)))+form+classForm+panel('فصول العام المختار','',table(['الصف','الشعبة','المدرس','حصص أسبوعية'],rows));
}
function progressView(){
 const entries=App.progress.filter(x=>x.year_id===App.yearId);
 const ownStaff=App.member?.role==='teacher'?App.staff.filter(s=>s.user_id===App.user.id):App.staff.filter(s=>!s.archived);
 const assigned=App.member?.role==='teacher'?App.assignments.filter(a=>ownStaff.some(s=>s.id===a.staff_id)):App.assignments;
 const allowedCls=App.classes.filter(c=>c.year_id===App.yearId&&(App.member?.role!=='teacher'||assigned.some(a=>a.class_id===c.id)));
 const f=canSubmit()&&App.yearId?panel('تسجيل آخر حصة وموقف التقييم','البيانات المقترحة من رسائل واتساب لا تُحفظ إلا بعد مراجعتك لها.',
 '<form data-form="progress" id="progressForm" class="form">'+
 textarea('source_text','ألصق محادثة واتساب كاملة أو رسالة واحدة (اختياري)','','placeholder="مثال: G5 lesson 2 theme 2 week 6"')+
 '<button class="soft sm" type="button" data-action="parse-progress">تحليل محادثة واتساب كاملة — حسب المدرس والصف</button><div class="wa-analysis" id="parseFeedback" hidden></div>'+
 '<div class="fields">'+pick('staff_id','المدرس',[['','اختر المدرس بعد التحقق'],...ownStaff.map(s=>[s.id,s.name_ar])],'','required')+
 pick('class_id','الفصل',[['','اختر الشعبة بعد التحقق'],...allowedCls.map(c=>[c.id,c.grade+' – '+c.section])],'','required')+
 field('theme_unit','Theme / Unit','', 'text','required placeholder="Theme 2"')+
 field('lesson','Lesson','', 'text','required placeholder="Lesson 2"')+
 field('week','Week – الأسبوع','','number','required min="1" max="45"')+
 field('evaluation','Evaluation – رقم التقييم','','text','placeholder="7 أو لم يُذكر"')+
 field('entry_date','تاريخ الحصة',nowISO(),'date','required')+
 '</div>'+textarea('notes','ملاحظات ومناقشة أو ما حدث في الحصة')+
 '<button type="submit" class="primary">حفظ موقف المنهج للمراجعة</button></form>'):'';
 const rows=entries.map(x=>tr([safe(App.staff.find(s=>s.id===x.staff_id)?.name_ar||'—'),safe(x.grade)+' / '+safe(x.section),safe(x.theme_unit)+' – '+safe(x.lesson),safe(x.week),safe(x.evaluation||'غير مذكور'),safe(fmt(x.entry_date)),stateTag(x.review_state),
 isHead()?'<div class="actions">'+(x.review_state!=='approved'?'<button data-action="approve-progress" data-id="'+safe(x.id)+'">اعتماد</button>':'')+'<button data-action="view-progress" data-id="'+safe(x.id)+'">تفاصيل</button></div>':'<button class="soft sm" data-action="view-progress" data-id="'+safe(x.id)+'">تفاصيل</button>']));
 return title('موقف المنهج والتقييمات','سجل قابل للتحقق حسب المدرس والفصل وتاريخ الحصة. Week وEvaluation ليسا الحقل نفسه.')+
 (App.years.length?'<span class="tag blue">العام: '+safe(getYear()?.label)+'</span>':notice('أضف سنة دراسية أولًا.',true))+
 f+panel('تقرير موقف الفصول','المعلومات التي لم يذكرها المدرس تبقى «غير مذكور»، وليس رقمًا مفترضًا.',
 table(['المدرس','الصف / الفصل','Theme / Lesson','Week','Evaluation','التاريخ','الحالة',''],rows));
}

/* Keep chat interpretation as reviewed drafts. Never silently attach grade-wide progress to a class. */
const WhatsAppReview={analysis:null};
function showWhatsAppAnalysis(data){
  const box=$('parseFeedback');if(!box)return;
  const issues=r=>r.flags.concat(r.missing.map(x=>'غير مؤكد: '+x));
  const card=r=>'<section class="wa-entry">'+
    '<div class="wa-entry-head"><b>'+safe(r.sender)+'</b><span class="tag blue">'+safe(TonyWAParser.gradeLabel(r.grade))+'</span></div>'+
    '<p class="wa-small">'+(r.staffId?'مرسل معروف في قائمة المدرسين':'اسم المرسل غير مرتبط بملف مدرس')+' • مستوى الصف وليس فصلًا محددًا</p>'+
    '<div class="wa-values"><span>Theme: <b>'+safe(r.theme||'غير مؤكد')+'</b></span>'+
    '<span>Lesson: <b>'+safe(r.lesson||'غير مؤكد')+'</b></span>'+
    '<span>Week: <b>'+safe(r.week??'غير مذكور')+'</b></span>'+
    '<span>Evaluation: <b>'+safe(r.evaluation??'غير مذكور')+'</b></span></div>'+
    (r.plannedLesson?'<p class="wa-small">خطة الدرس التالي: '+safe(r.plannedLesson)+' (ليس درسًا تم تدريسه)</p>':'')+
    (issues(r).length?'<div class="wa-issues">'+issues(r).map(x=>'<p>• '+safe(x)+'</p>').join('')+'</div>':'')+
    (r.notes.length?'<p class="wa-small">ملاحظات: '+safe(r.notes.join(' | '))+'</p>':'')+
    '<details><summary>نصوص الرسائل المصدر</summary>'+r.source.map(x=>'<p class="wa-source">'+safe(x.date+' '+x.time+' — '+x.text)+'</p>').join('')+'</details>'+
    (canSubmit()?'<button type="button" class="soft sm" data-action="use-chat-row" data-id="'+safe(r.id)+'">نقل المقترح إلى نموذج المراجعة</button>':'')+'</section>';
  const directions=data.directives.length?'<div class="note"><b>تكليفات إدارية (ليست تقدم منهج):</b>'+data.directives.map(x=>'<p>'+safe(x.text)+'</p>').join('')+'</div>':'';
  const comments=data.comments.length?'<div class="note warn"><b>رسائل لم يمكن إسنادها بثقة:</b>'+data.comments.map(x=>'<p>'+safe(x.sender)+': '+safe(x.text)+' — '+safe(x.reason)+'</p>').join('')+'</div>':'';
  const absent=App.staff.filter(s=>!s.archived&&!data.items.some(x=>x.staffId===s.id));
  box.innerHTML='<div class="wa-heading"><b>نتائج منفصلة: '+data.items.length+' سجلات</b><span class="tag blue">'+data.totalMessages+' رسائل</span></div>'+
    '<p class="wa-small">لا يتم حفظ أي شيء تلقائيًا. رقم Week مستقل عن Evaluation، واسم الشعبة يحتاج تأكيدًا.</p>'+
    directions+'<div class="wa-grid">'+data.items.map(card).join('')+'</div>'+comments+
    (absent.length?'<p class="wa-small">لا يوجد رد مرتبط بالأسماء التالية في هذه المحادثة: '+absent.map(x=>safe(x.name_ar)).join('، ')+' — لا يعني ذلك عدم التدريس.</p>':'')+
    '<p class="wa-small">استخدم زر النقل لسجل واحد فقط، ثم اختر اسم المدرس والفصل وأكمل الحقول الناقصة قبل الحفظ.</p>';
  box.hidden=false;
}

function extractTeacherMessage(raw){
 const t=String(raw).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
 const m=(re)=>t.match(re)?.[1]||'';
 const lessonMatches=[...t.matchAll(/(?:\blesson\b|\blsn\b|الدرس)\s*[:\-]?\s*(\d+)/gi)];
 const unit=m(/(?:\btheme\b|\bthem\b|\bunit\b|الوحدة)\s*[:\-]?\s*(\d+)/i);
 const w=m(/(?:\bweek\b|\bwek\b|الأسبوع|\bweek)\s*[:\-]?\s*(\d{1,2})/i);
 const ev=m(/(?:\bevaluation\b|\bassessment\b|التقييم)\s*[:\-]?\s*(\d{1,2})/i);
 return {theme:unit?'Theme '+unit:'',lesson:lessonMatches.length===1?'Lesson '+lessonMatches[0][1]:'',week:w,evaluation:ev,flags:[...(lessonMatches.length>1?['الرسالة تحتوي على أكثر من رقم درس، يلزم تحديد الصف والفصل والدرس الصحيح.']:[]),...(!ev?['رقم التقييم غير مذكور بوضوح. لا يمكن افتراض أنه يساوي رقم الأسبوع.']:[])]};
}
async function onForm(kind,form){
 const d=dataOf(form);
 if(kind==='login'){return run(async()=>{await signIn(String(d.email).trim(),String(d.password))},'جارٍ تسجيل الدخول')}
 if(kind==='signup'){return run(async()=>{const r=await signUp(String(d.email).trim(),String(d.password),String(d.name).trim());App.view='login';flash('افتح بريدك الإلكتروني وأكّد التسجيل، ثم سجّل الدخول.');render()},'جارٍ إنشاء حساب')}
 if(kind==='recover'){return run(async()=>{await recover(String(d.email).trim());flash('إذا كان البريد مسجلًا، سيصلك رابط إعادة تعيين كلمة المرور.')},'جارٍ إرسال الرابط')}
 if(!App.demo&&!App.member)throw Error('لا توجد صلاحيات مدرسة.');
 if(kind==='staff'){
  if(!canEdit())return flash('هذا الإجراء للمدرس الأول فقط.',true);
  const ar=String(d.name_ar).trim(),en=String(d.name_en).trim();
  if(ar.split(/\s+/).length<4||en.split(/\s+/).length<4)return flash('يلزم إدخال اسم رباعي بالعربية واسم رباعي بالإنجليزية.',true);
  return run(async()=>{
    const patch={school_id:App.school.id,name_ar:ar,name_en:en,specialization:d.specialization||null,employment_status:d.employment_status,years_experience:d.years_experience?Number(d.years_experience):null,user_id:d.user_id||null,updated_by:App.user.id};
    let saved;
    if(App.demo){saved={id:d.id||'demo-'+Date.now(),...patch,version:1};App.staff=d.id?App.staff.map(x=>x.id===d.id?saved:x):[saved,...App.staff]}
    else{if(d.id){const original=App.staff.find(x=>x.id===d.id);saved=await update('staff',d.id,patch,original.version)}else saved=(await insert('staff',patch))?.[0]}
    if(saved && (d.phone||d.birthday||d.qualification||d.university)){
     const privatePatch={school_id:App.school.id,staff_id:saved.id,phone:d.phone||null,birthday:d.birthday||null,qualification:d.qualification||null,university:d.university||null,updated_by:App.user.id};
     if(App.demo){App.privateStaff=[...App.privateStaff.filter(x=>x.staff_id!==saved.id),privatePatch]}
     else{const existing=App.privateStaff.find(x=>x.staff_id===saved.id);if(existing)await update('staff_private',saved.id,privatePatch,existing.version,'staff_id');else await insert('staff_private',privatePatch)}
    }
   });
 }
 if(kind==='year'){
  if(!canEdit())return flash('هذا الإجراء للمدرس الأول فقط.',true);
  if(!/^\d{4}\/\d{4}$/.test(d.label))return flash('اكتب العام الدراسي بصيغة 2026/2027.',true);
  return run(async()=>{const row={school_id:App.school.id,label:d.label,is_current:App.years.length===0};if(App.demo){App.years.push({id:'demo-y-'+Date.now(),...row})}else await insert('academic_years',row)});
 }
 if(kind==='class'){
  if(!canEdit())return flash('هذا الإجراء للمدرس الأول.',true);
  return run(async()=>{const row={school_id:App.school.id,year_id:App.yearId,grade:String(d.grade).trim(),section:String(d.section).trim()};if(App.demo){App.classes.push({...row,id:'cl-'+Date.now()})}else await insert('classes',row)});
 }
 if(kind==='assignment'){
  if(!canEdit())return flash('هذا الإجراء للمدرس الأول.',true);
  if(!d.staff_id||!d.class_id)return flash('حدد المدرس والفصل.',true);
  return run(async()=>{const row={school_id:App.school.id,year_id:App.yearId,staff_id:d.staff_id,class_id:d.class_id,periods_per_week:Number(d.periods_per_week)||null};if(App.demo){App.assignments.push({...row,id:'as-'+Date.now()})}else await insert('assignments',row)});
 }
 if(kind==='progress'){
  if(!canSubmit())return flash('ليس لديك صلاحية تسجيل درس.',true);
  const c=App.classes.find(x=>x.id===d.class_id),staff=App.staff.find(x=>x.id===d.staff_id);
  if(!c||!staff)return flash('حدد فصلًا ومدرسًا صحيحين.',true);
  if(App.member?.role==='teacher'){
   if(staff.user_id!==App.user.id||!App.assignments.some(a=>a.staff_id===staff.id&&a.class_id===c.id))return flash('هذا الفصل غير مسند إلى حسابك.',true);
  }
  const flags=extractTeacherMessage(d.source_text||'').flags;
  return run(async()=>{
   const row={school_id:App.school.id,year_id:App.yearId,staff_id:staff.id,class_id:c.id,grade:c.grade,section:c.section,theme_unit:String(d.theme_unit).trim(),lesson:String(d.lesson).trim(),week:Number(d.week),evaluation:String(d.evaluation||'').trim()||null,entry_date:d.entry_date||nowISO(),notes:d.notes||null,source_text:d.source_text||null,flags,review_state:flags.length?'flagged':'submitted',submitted_by:App.user.id};
   if(App.demo)App.progress.unshift({id:'p-'+Date.now(),...row,version:1});else await insert('progress_entries',row);
  });
 }
 if(kind==='document')return saveDocument(d,form);
 if(kind==='question')return saveQuestion(d,form);
 if(kind==='meeting')return saveMeeting(d,form);
 if(kind==='branding')return saveBranding(d,form);
 if(kind==='invite')return saveInvitation(d,form);
 if(kind==='make-exam')return buildExam(d,form);
}
async function onAction(action,id){
 if(action==='run-school-import'||action==='reload-school-timetable')return onTeacherImportAction(action);
 if(action==='demo'){demoInit();return}
 if(action.startsWith('auth-')){App.view=action.slice(5);render();return}
 if(action==='refresh-account'){return bootstrap()}
 if(action==='refresh'){return run(async()=>{if(App.demo)return;await loadData()})}
 if(action==='parse-progress'){
   const form=$('progressForm'),raw=form?.querySelector('[name="source_text"]')?.value||'';
   if(!raw.trim())return flash('الصق نص المحادثة أولًا.',true);
   if(!window.TonyWAParser)return flash('محرك التحليل غير محمل. أعد فتح الصفحة.',true);
   WhatsAppReview.analysis=TonyWAParser.parseChat(raw,App.staff);
   showWhatsAppAnalysis(WhatsAppReview.analysis);
   if(!WhatsAppReview.analysis.items.length)flash('لا توجد معلومات منهج واضحة؛ راجع تنسيق الرسائل.',true);
   return;
  }
  if(action==='use-chat-row'){
   const x=WhatsAppReview.analysis?.items.find(z=>z.id===id),form=$('progressForm');
   if(!x||!form)return;
   const t=form.querySelector('[name="staff_id"]');if(t)t.value=x.staffId||'';
   const cl=form.querySelector('[name="class_id"]');if(cl)cl.value='';
   for(const [k,v] of Object.entries({theme_unit:x.theme,lesson:x.lesson,week:x.week,evaluation:x.evaluation})){
     const el=form.querySelector('[name="'+k+'"]');if(el)el.value=v??'';
   }
   const source=form.querySelector('[name="source_text"]');
   if(source)source.value=x.source.map(m=>'['+m.date+', '+m.time+'] '+x.sender+': '+m.text).join('\n');
   const notes=form.querySelector('[name="notes"]');
   if(notes)notes.value=['تقرير على مستوى الصف '+TonyWAParser.gradeLabel(x.grade),...x.flags,...x.notes].join('\n');
   flash('تم تجهيز المقترح. اختر المدرس والشعبة وتأكد من القيم المفقودة قبل الحفظ.');
   form.scrollIntoView({behavior:'smooth',block:'start'});return;
  }
  if(action==='edit-staff'){
  const s=App.staff.find(x=>x.id===id),v=App.privateStaff.find(x=>x.staff_id===id);
  if(!s)return;App.page='teachers';render();const form=document.querySelector('form[data-form="staff"]');if(!form)return;
  for(const [k,val] of Object.entries({...s,...v})){const input=form.elements.namedItem(k);if(input && (input instanceof HTMLInputElement || input instanceof HTMLSelectElement))input.value=val??''}
  form.querySelector('button[type="submit"]').textContent='حفظ تعديل الملف';form.scrollIntoView({behavior:'smooth'});return;
 }
 if(action==='archive-staff'){
  if(!canEdit())return flash('الصلاحية للمدرس الأول فقط.',true);
  const s=App.staff.find(x=>x.id===id);if(!s)return;
  if(!confirm(s.archived?'إعادة تفعيل الملف الوظيفي؟':'أرشفة المدرس مع الاحتفاظ بالسجل السنوي؟'))return;
  return run(async()=>{if(App.demo){s.archived=!s.archived;s.employment_status=s.archived?'left':'active';return}
    await update('staff',id,{archived:!s.archived,employment_status:s.archived?'active':'left',updated_by:App.user.id},s.version)});
 }
 if(action==='approve-progress'){
  if(!isHead())return flash('الاعتماد من اختصاص المدرس الأول.',true);
  const p=App.progress.find(x=>x.id===id);if(!p)return;
  if(!confirm('هل راجعت الرسالة والدرس ورقم التقييم فعلًا وتوافق على اعتماد هذا السجل؟'))return;
  return run(async()=>{await update('progress_entries',id,{review_state:'approved',review_note:'تم الاعتماد بعد مراجعة المدرس الأول',updated_by:App.user.id},p.version)});
 }
 if(action==='view-progress'){
  const p=App.progress.find(x=>x.id===id);if(!p)return;
  alert('نص المصدر الأصلي:\n'+(p.source_text||'لم يُرفق')+'\n\nملاحظات:\n'+(p.notes||'لا توجد')+'\n\nتعارضات:\n'+(p.flags||[]).join('\n'));return;
 }
 if(action==='download-doc')return downloadDocument(id);
 if(action==='approve-question')return approveQuestion(id);
 if(action==='approve-doc')return approveDocument(id);
 if(action==='approve-exam')return approveExam(id);
 if(action==='preview-exam')return previewSavedExam(id,false);
 if(action==='preview-answers')return previewSavedExam(id,true);
 if(action==='preview-branding')return previewBranding();
 if(action==='preview-meeting')return previewMeeting(id);
 if(action==='download-word')return exportWordPreview();
 if(action==='accept-invitations')return run(async()=>{const count=await callRpc('accept_invitations');flash('تمت مراجعة الدعوات: '+count);await bootstrap()});
}
document.addEventListener('change',e=>{if(e.target?.id==='yearSelect'){App.yearId=e.target.value;render()}});
