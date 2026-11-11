'use strict';
/*
 * Private, owner-authorized manual import. SOURCE DATA IS NEVER EMBEDDED IN
 * THE PUBLIC GITHUB PAGES CODE. A private JSON file is selected by the owner.
 * Public app only has generic code and a parser for the schema.
 */
const TeacherImport={file:null,pack:null,report:null,working:false,timetable:null,loading:false,error:''};
const TIMETABLE_PREFIX='TONY_AI_ICT_TIMETABLE_PRIVATE_';
const weekDays=['Saturday','Monday','Tuesday','Wednesday','Thursday'];
const dayLabels={Saturday:'السبت',Monday:'الإثنين',Tuesday:'الثلاثاء',Wednesday:'الأربعاء',Thursday:'الخميس'};
function validateTeacherImport(pack){
 if(!pack||pack.schema!=='tony-ict-teacher-schedule-import-v1')throw Error('صيغة الاستيراد غير معروفة. استخدم ملف TONY AI الرسمي فقط.');
 if(!/^\d{4}\/\d{4}$/.test(pack.year||''))throw Error('السنة الدراسية غير صحيحة');
 for(const key of ['teachers','classes','timetable','grade_level_progress_reports','proposed_visits']){
  if(!Array.isArray(pack[key]))throw Error('جزء ناقص من الملف: '+key);
 }
 if(pack.teachers.length>50||pack.classes.length>500||pack.timetable.length>2000||pack.grade_level_progress_reports.length>300)throw Error('الملف أكبر من النطاق المسموح به');
 const keys=new Set();
 for(const t of pack.teachers){
  if(!/^[a-z0-9-]+$/.test(t.key||'')||!t.name_en||!t.name_ar||keys.has(t.key))throw Error('اسم مدرس أو معرف غير صالح أو مكرر');
  keys.add(t.key);
 }
 const sections=new Set();
 for(const c of pack.classes){
  if(!keys.has(c.teacher_key)||!c.grade||!c.section)throw Error('فصل دون مدرس أو مرحلة صحيحة');
  const key=c.grade.trim()+'::'+c.section.trim();
  if(sections.has(key))throw Error('فصل مكرر: '+key);
  sections.add(key);
 }
 for(const entry of pack.timetable){
  if(!keys.has(entry.teacher_key)||!weekDays.includes(entry.day)||!(entry.period===null||Number.isInteger(entry.period)&&entry.period>=1&&entry.period<=8))
    throw Error('خانة جدول غير صالحة');
 }
 return pack;
}
function renderSchoolPackInfo(pack){
 const yes=pack.timetable.filter(x=>x.under_13).length;
 const late=pack.timetable.filter(x=>!x.under_13).length;
 const tentative=pack.classes.filter(x=>!x.verified_class_assignment).length;
 return '<div class="cards">'+[
   ['المدرسات',pack.teachers.length],
   ['الفصول والشعب',pack.classes.length],
   ['حصص الجدول',pack.timetable.length],
   ['مواقف منهج مرحلية',pack.grade_level_progress_reports.length]
 ].map(([label,n])=>'<div class="stat"><div class="caption">'+safe(label)+'</div><div class="number">'+n+'</div></div>').join('')+'</div>'+
 '<div class="note"><b>تحليل المواعيد:</b> '+yes+' خانة مؤهلة مبدئيًا قبل الساعة 1 ظهرًا، و'+late+' خارج النطاق أو بحاجة لتأكيد الوقت. ساعات الجرس المدرسي مرجعية فقط وليست جميع المراحل متطابقة.</div>'+
 (tentative?'<div class="note warn">'+tentative+' فصلًا مستنتج المرحلة من تقارير المتابعة وليس من الجدول الصريح؛ استيرادها <b>موقوف افتراضيًا</b> حتى التأكيد.</div>':'')+
 table(['المدرسة','الاسم الإنجليزي','استكمال البيانات'],pack.teachers.map(t=>tr([safe(t.name_ar),safe(t.name_en),'<span class="tag warn">الاسم الرباعي غير مكتمل</span>'])));
}
function schoolImportView(){
 if(!isHead())return title('استيراد بيانات المدرسين السابقة','هذه العملية متاحة لحساب المدرس الأول فقط.')+notice('سجّل الدخول بحساب المدرس الأول المعتمد، ولا تنشر ملف الاستيراد على GitHub أو في رابط عام.',true);
 return title('استيراد المدرسين والجداول السابقة','استعادة البيانات التعليمية لسنة 2026/2027 من صور الجداول ورسائل المتابعة، مع مراجعة كل جزء قبل الحفظ.')+
 panel('اختيار ملف الاستيراد الخاص','حمّل الملف الخاص الذي جهزته لك، ثم اختره هنا من جهاز الكمبيوتر أو سامسونج.',
 '<label class="field"><span>ملف JSON الخاص بجدول المدرسة</span><input id="schoolImportFile" type="file" accept=".json,application/json"></label>'+
 '<div class="note warn"><b>الخصوصية:</b> ملف الأسماء والجداول لا يُضمَّن في كود الموقع العام. لا ترفعه إلى مستودع GitHub أو تشاركه علنًا.</div>')+
 (TeacherImport.pack?panel('معاينة البيانات قبل الحفظ','تمت قراءة الملف على جهازك فقط، ولم يُحفظ في قاعدة البيانات بعد.',
 '<div class="tag blue">السنة الدراسية: '+safe(TeacherImport.pack.year)+'</div>'+
 renderSchoolPackInfo(TeacherImport.pack)+
 '<label class="field" style="margin-top:16px"><span><input id="includeTentative" type="checkbox"> أوافق على إدخال فصول Prep 1/Prep 2 التي تحتاج تأكيد المرحلة (لا أنصح بالتحديد إلا بعد التأكد)</span></label>'+
 '<label class="field"><span><input id="includeTimetable" type="checkbox" checked> حفظ نسخة خاصة من الجداول وتقارير الموقف والزيارات المقترحة في مكتبة المدرسة السحابية</span></label>'+
 '<div class="note warn">لن تُحوّل رسائل الصف إلى «آخر درس مؤكد لكل شعبة»؛ ستظل تقارير مرحلية تحتاج تأكيدًا. زيارات المتابعة مقترحة وليست منفذة.</div>'+
 '<div class="toolbar"><button class="primary" id="confirmSchoolImport" data-action="run-school-import" '+(TeacherImport.working?'disabled':'')+'>بدء الاستيراد إلى حساب المدرسة</button></div>'):'')+
 (TeacherImport.error?notice(safe(TeacherImport.error),true):'')+
 (TeacherImport.report?panel('نتيجة الاستيراد',null,
 '<div class="note">'+safe(TeacherImport.report.summary)+'</div>'+
 (TeacherImport.report.errors.length?'<div class="note warn">تفاصيل تحتاج مراجعة:<ul>'+TeacherImport.report.errors.map(x=>'<li>'+safe(x)+'</li>').join('')+'</ul></div>':'')+
 '<button class="soft" data-page="timetable">عرض الجداول</button>'):'');
}
function importClassKey(grade,section){return String(grade||'').trim().toLocaleLowerCase()+'::'+String(section||'').trim().toLocaleLowerCase()}
function schoolImportReportMessage(o){
 const c=o.created;
 return 'تمت إضافة '+c.teachers+' ملف مدرس/مدرسة، و'+c.years+' سنة دراسية، و'+c.classes+' فصل، و'+c.assignments+' تكليف، و'+c.sourceDocuments+' حزمة جداول خاصة. تم تجاوز السجلات الموجودة من قبل بدون حذف أو تغيير. '+(o.errors.length?'بعض السجلات لم تُحفظ وتحتاج مراجعة.':'');
}
async function executeSchoolImport(){
 if(!isHead()||App.demo)throw Error('لا يمكن استيراد بيانات المدرسة من الوضع التجريبي أو حساب غير مخوّل.');
 if(!TeacherImport.pack||TeacherImport.working)throw Error('اختر ملف الاستيراد أولاً.');
 const pack=TeacherImport.pack;
 if(!confirm('سيتم إضافة المدرسين والفصول المؤكدة إلى قاعدة بيانات المدرسة، وحفظ الجداول في ملف خاص عند تحديد الاختيار. هل راجعت الأسماء والمصادر؟'))return;
 TeacherImport.working=true;
 TeacherImport.report={created:{years:0,teachers:0,classes:0,assignments:0,sourceDocuments:0},skipped:[],errors:[],summary:''};
 const report=TeacherImport.report;
 syncLabel('جارٍ استيراد بيانات المدرسة','');
 const includeTentative=!!document.getElementById('includeTentative')?.checked;
 const includeTimetable=!!document.getElementById('includeTimetable')?.checked;
 try{
  await ensureSession();
  const yearExisting=App.years.find(y=>y.label===pack.year);
  let year=yearExisting;
  if(!year){
   try{
    const inserted=await insert('academic_years',{school_id:App.school.id,label:pack.year,is_current:App.years.length===0});
    year=inserted?.[0];if(!year?.id)throw Error('تعذر استرجاع رقم السنة من الخادم');
    report.created.years++;
   }catch(e){throw Error('السنة الدراسية: '+e.message)}
  }
  const schoolId=App.school.id;
  const teachersByKey={};
  const freshStaff=[...App.staff];
  for(const teacher of pack.teachers){
   try{
    let match=freshStaff.find(x=>String(x.name_en||'').trim().toLowerCase()===teacher.name_en.trim().toLowerCase());
    if(match){report.skipped.push('مدرس موجود: '+teacher.name_en)}
    else{
     const row={school_id:schoolId,name_ar:String(teacher.name_ar).trim(),name_en:String(teacher.name_en).trim(),
        specialization:teacher.specialization||'ICT',employment_status:'active',years_experience:null,updated_by:App.user.id};
     const inserted=await insert('staff',row);
     match=inserted?.[0];if(!match?.id)throw Error('لم يُرجع الخادم رقم ملف المدرس');
     freshStaff.push(match);report.created.teachers++;
    }
    teachersByKey[teacher.key]=match;
   }catch(e){report.errors.push('المدرس '+teacher.name_en+': '+e.message)}
  }
  const freshClasses=[...App.classes],freshAssignments=[...App.assignments];
  for(const sec of pack.classes){
   if(!sec.verified_class_assignment&&!includeTentative){report.skipped.push('شعبة غير مؤكدة: '+sec.grade+' '+sec.section);continue}
   const teacher=teachersByKey[sec.teacher_key];if(!teacher){report.errors.push('لا يوجد ملف مدرس للشعبة '+sec.grade+' '+sec.section);continue}
   let cl=freshClasses.find(x=>x.year_id===year.id&&importClassKey(x.grade,x.section)===importClassKey(sec.grade,sec.section));
   if(!cl){
    try{
     const created=await insert('classes',{school_id:schoolId,year_id:year.id,grade:sec.grade,section:sec.section});
     cl=created?.[0];if(!cl?.id)throw Error('لم يُرجع الخادم رقم الفصل');
     freshClasses.push(cl);report.created.classes++;
    }catch(e){report.errors.push('الشعبة '+sec.grade+' '+sec.section+': '+e.message);continue}
   }
   const existingAssign=freshAssignments.find(a=>a.class_id===cl.id&&a.year_id===year.id);
   if(existingAssign){
    if(existingAssign.staff_id!==teacher.id)report.errors.push('تعارض تكليف: '+sec.grade+' '+sec.section+' مسند لمدرس آخر؛ لم يتم تغييره.');
    else report.skipped.push('تكليف موجود: '+sec.grade+' '+sec.section);
    continue;
   }
   try{
    const created=await insert('assignments',{school_id:schoolId,year_id:year.id,class_id:cl.id,staff_id:teacher.id,periods_per_week:null});
    if(!created?.[0]?.id)throw Error('تعذر استرجاع رقم التكليف');
    freshAssignments.push(created[0]);report.created.assignments++;
   }catch(e){report.errors.push('تكليف '+sec.grade+' '+sec.section+': '+e.message)}
  }
  if(includeTimetable){
   const titleValue=TIMETABLE_PREFIX+pack.year.replace('/','_');
   if(App.documents.some(d=>d.title===titleValue)){
    report.skipped.push('حزمة الجداول موجودة في المكتبة؛ لم يتم استبدالها بدون مراجعة');
   }else{
    try{
     if(typeof sendFile!=='function')throw Error('ميزة مكتبة الملفات غير متاحة');
     const serialized=JSON.stringify(pack);
     const file=new File([serialized],titleValue+'.txt',{type:'text/plain'});
     const uploaded=await sendFile(file);
     await insert('documents',{school_id:schoolId,year_id:year.id,title:titleValue,
       source_type:'other',grade:null,week:null,storage_path:uploaded.path,mime_type:uploaded.mime,
       size_bytes:uploaded.size,status:'pending',uploaded_by:App.user.id});
     report.created.sourceDocuments++;
     TeacherImport.timetable=pack;
    }catch(e){report.errors.push('حفظ الجدول الخاص على السحابة: '+e.message)}
   }
  }
  // Grade-wide WhatsApp replies are NOT inserted as per-class confirmed progress.
  await loadData({silent:true});
  report.summary=schoolImportReportMessage(report);
  flash(report.summary,report.errors.length>0);
  syncLabel(report.errors.length?'بعض السجلات تحتاج مراجعة':'تم استيراد البيانات',''+(report.errors.length?'bad':'ok'));
 }catch(e){
  report.errors.push(e.message);
  report.summary=schoolImportReportMessage(report);
  flash('لم يكتمل الاستيراد: '+e.message,true);
  syncLabel('استيراد غير مكتمل','bad');
 }finally{
  TeacherImport.working=false;
  render();
 }
}
async function loadTimetableCloud(){
 if(App.demo)return;
 if(!App.member||TeacherImport.loading)return;
 const doc=(App.documents||[]).filter(d=>String(d.title||'').startsWith(TIMETABLE_PREFIX)).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0];
 if(!doc)return;
 if(TeacherImport.timetable?.year===doc.title.slice(TIMETABLE_PREFIX.length).replace('_','/'))return;
 TeacherImport.loading=true;
 try{
  const uri=await signedFile(doc.storage_path);
  const r=await fetch(uri,{cache:'no-store'});
  if(!r.ok)throw Error('لم أتمكن من تنزيل نسخة الجدول الخاصة ('+r.status+')');
  const raw=await r.text();
  if(raw.length>2*1024*1024)throw Error('ملف الجدول أكبر من المسموح');
  TeacherImport.timetable=validateTeacherImport(JSON.parse(raw));
  TeacherImport.error='';
 }catch(e){TeacherImport.error='تعذر فتح ملف الجداول: '+e.message}
 finally{TeacherImport.loading=false;if(App.page==='timetable')render()}
}
function timetableView(){
 if(!App.member&&!App.demo)return notice('يرجى تسجيل الدخول لمشاهدة الجداول.',true);
 const pack=TeacherImport.timetable||TeacherImport.pack;
 const body=pack?table(['اليوم','المدرسة','الفصل','الحصة','وقت مرجعي','قبل 1 ظهرًا','ملاحظات'],
  [...pack.timetable].sort((a,b)=>weekDays.indexOf(a.day)-weekDays.indexOf(b.day)||Number(a.period||99)-Number(b.period||99))
  .map(t=>{
   const teacher=pack.teachers.find(x=>x.key===t.teacher_key);
   const timing=t.time_start_reference&&t.time_end_reference?
      safe(t.time_start_reference)+'–'+safe(t.time_end_reference):'غير محدد';
   const status=t.period==null?'<span class="tag warn">الوقت غير محدد</span>':t.under_13?'<span class="tag ok">مؤهل مبدئيًا</span>':'<span class="tag danger">بعد الواحدة</span>';
   return tr([safe(dayLabels[t.day]||t.day),safe(teacher?.name_ar||t.teacher_key),
        safe(t.grade)+' / '+safe(t.section),t.period===null?'استراحة':safe(t.period),
        timing,status,safe(t.notes||'—')]);
  })):empty(TeacherImport.loading?'جارٍ فتح الجداول الخاصة…':'لم يتم استيراد ملف جداول المدرسة بعد.');
 const progress=pack?table(['المدرسة','المرحلة','Theme / Unit','Lesson','Week','Evaluation','حالة البيانات'],
  pack.grade_level_progress_reports.map(p=>{
   const teacher=pack.teachers.find(x=>x.key===p.teacher_key);
   return tr([safe(teacher?.name_ar||p.teacher_key),safe(p.grade),
   safe(p.theme_unit||'غير محدد'),safe(p.lesson||'يحتاج توضيحًا'),safe(p.week??'غير مذكور'),safe(p.evaluation??'غير مذكور'),
   '<span class="tag warn">رد عام — تأكيد كل فصل مطلوب</span>']);
  })):'';
 const visits=pack?table(['الكود','التاريخ','المدرسة','الفصل','الحصة','الملاحظة','الحالة'],
  pack.proposed_visits.map(v=>tr([safe(v.code),safe(v.date),
   safe(pack.teachers.find(t=>t.key===v.teacher_key)?.name_ar||v.teacher_key),
   safe(v.grade)+' / '+safe(v.section),safe(v.period),safe(v.purpose),
   '<span class="tag warn">مقترحة فقط</span>']))):'';
 return title('جداول المدرسين وموقف المنهج','المواعيد من الجداول المصورة، وبعض المراحل والأوقات المرجعية تحتاج تأكيدًا. الزيارات ليست منفذة.',
 '<button class="soft" data-action="reload-school-timetable">↻ تحديث الجداول الخاصة</button>')+
 (TeacherImport.error?notice(safe(TeacherImport.error),true):'')+
 notice('حد دخول الحصص لمتابعة المدرس الأول: <b>تنتهي الحصة في موعد أقصاه 1:00 ظهرًا</b>. الحصص 7 و8 خارج الزيارات الصفية المباشرة، ويمكن متابعة أوراقها دون احتساب ذلك زيارة. أوقات الجرس مرجعية وليست موحّدة تلقائيًا لكل المراحل.',true)+
 panel('الجدول التعليمي',pack?'بنود الجدول محفوظة كمصدر مستقل ولا تدل على أن جميع الحصص نُفذت.':'',body)+
 (pack?panel('مواقف المنهج المبلّغ عنها','لم تُوزع تلقائيًا على الفصول باعتبارها تقدمًا مؤكدًا؛ يلزم إقرار منفصل لكل شعبة.',progress)+
 panel('خطة زيارات المدرس الأول','تواريخ مقترحة من المسودة القديمة؛ يلزم مراجعة تعارضها مع جدولك والامتحانات.',visits):
 panel('لا توجد جداول معتمدة',null,
 '<div class="note">لإضافة سجلات صور الجداول السابقة، افتح استيراد المدرسين، اختر ملف TONY AI الخاص، وراجع البيانات قبل الحفظ.</div><button data-page="import" class="primary">الانتقال للاستيراد</button>'));
}
document.addEventListener('change',async e=>{
 if(e.target?.id!=='schoolImportFile')return;
 TeacherImport.pack=null;TeacherImport.error='';TeacherImport.report=null;
 const file=e.target.files?.[0];if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('الملف أكبر من 2MB');
  TeacherImport.pack=validateTeacherImport(JSON.parse(await file.text()));
  TeacherImport.file=file;
  flash('تم فحص الملف — اقرأ المعاينة ثم قرر الاستيراد.');
 }catch(err){TeacherImport.error=err.message;flash(err.message,true)}
 render();
});
function onTeacherImportAction(action){
 if(action==='run-school-import')return executeSchoolImport();
 if(action==='reload-school-timetable'){
   TeacherImport.timetable=null;
   TeacherImport.error='';
   return loadTimetableCloud();
 }
}
