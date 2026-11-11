'use strict';
/* TONY AI ICT – deterministic, provenance-preserving WhatsApp conversation parser.
   NEVER silently write progress or infer Evaluation from Week.
   Staff matching uses the active school's roster; no student/staff data ships in source. */
(function(root){
  function num(s){return String(s||'').replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))}
  function norm(s){return num(s).normalize('NFKC').toLowerCase().replace(/[أإآ]/g,'ا').replace(/[ى]/g,'ي').replace(/[\u064b-\u065f\u0670]/g,'').replace(/\b(?:teacher|mr|mrs|miss|ms)\b/g,'').replace(/^(?:مس|استاذة|الاستاذة|الاستاذ|أستاذة|أستاذ)\s+/,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ')}
  function splitChat(input){
    const lines=String(input||'').replace(/\r\n?/g,'\n').split('\n');
    const list=[];let message=null;
    const head=/^\s*\[([0-9٠-٩]{1,2}\/[0-9٠-٩]{1,2}),\s*([^\]]+)\]\s*([^:：\n]{2,90})\s*[:：]\s*(.*)$/u;
    const plain=/^\s*([0-9٠-٩]{1,2}\/[0-9٠-٩]{1,2}\/[0-9]{2,4}),?\s+([0-9]{1,2}:[0-9]{2}(?:\s*[AP]M)?)\s*-\s*([^:：\n]{2,90})\s*[:：]\s*(.*)$/iu;
    for(const line of lines){
      const m=line.match(head)||line.match(plain);
      if(m){
        if(message)list.push(message);
        message={date:num(m[1]),time:m[2].trim(),sender:m[3].trim(),body:m[4].trim()};
      }else if(message){message.body+=(message.body?'\n':'')+line;}
      else if(line.trim()){message={date:'',time:'',sender:'',body:line.trim()};}
    }
    if(message)list.push(message);
    return list;
  }
  const gradeRules=[
    {re:/\b(?:grade|g)\s*([456])\b/gi,grade:m=>'P'+m[1]},
    {re:/\b(?:prep|prp)\s*([123])\b/gi,grade:m=>'PREP'+m[1]},
    {re:/\b([456])(?:th|st|nd|rd)\s*(?:prim|primary)\b/gi,grade:m=>'P'+m[1]},
    {re:/رابع[ة]?\s*ابتدائي/gi,grade:()=> 'P4'},
    {re:/خامس[ة]?\s*ابتدائي/gi,grade:()=> 'P5'},
    {re:/سادس[ة]?\s*ابتدائي/gi,grade:()=> 'P6'},
    {re:/سنة\s+سادس[ة]?/gi,grade:()=> 'P6'},
    {re:/اول[ىی]\s+اعدادي/gi,grade:()=> 'PREP1'},
    {re:/ثاني[ة]?\s+اعدادي/gi,grade:()=> 'PREP2'},
    {re:/ثالث[ة]?\s+اعدادي/gi,grade:()=> 'PREP3'}
  ];
  function grades(s){
    const t=num(s).replace(/[أإآ]/g,'ا').replace(/[ى]/g,'ي');
    const found=[];for(const rule of gradeRules){rule.re.lastIndex=0;for(const match of t.matchAll(rule.re)){found.push({start:match.index,end:match.index+match[0].length,grade:rule.grade(match)});}}
    found.sort((a,b)=>a.start-b.start||b.end-a.end);
    return found.filter((m,i,a)=>!a.some((v,j)=>j<i&&m.start<v.end));
  }
  function pieces(text){
    const markers=grades(text);if(!markers.length)return [];
    return markers.map((m,i)=>({grade:m.grade,text:text.slice(m.start,i+1<markers.length?markers[i+1].start:text.length).trim()}));
  }
  const ords={'الاول':1,'الاولى':1,'الثاني':2,'الثانية':2,'الثالث':3,'الثالثة':3,'الرابع':4,'الرابعة':4,'الخامس':5,'الخامسة':5,'السادس':6,'السادسة':6,'السابع':7,'السابعة':7,'الثامن':8,'الثامنة':8,'التاسع':9,'العاشر':10};
  function values(text,regex){return [...num(text).matchAll(regex)].map(m=>({value:Number(m[1]),at:m.index})).filter(x=>Number.isInteger(x.value));}
  function facts(src){
    const t=num(src).replace(/[أإآ]/g,'ا');
    const ls=values(t,/\b(?:lesson|lsn)\s*[:\-]?\s*(\d{1,2})|\b(?:الدرس|درس)\s*[:\-]?\s*(\d{1,2})/gi).map(x=>x.value);
    // Match Arabic lessons separately because the second capture differs.
    const ar=[...t.matchAll(/(?:الدرس|درس)\s*(\d{1,2})/gi)].map(m=>({value:Number(m[1]),at:m.index}));
    const en=values(t,/\b(?:lesson|lsn)\s*[:\-]?\s*(\d{1,2})/gi);
    const lessons=[...en,...ar].sort((a,b)=>a.at-b.at);
    const themes=values(t,/\b(?:theme|them|unit)\s*[:\-]?\s*(\d{1,2})/gi).concat(values(t,/(?:الوحدة|الثيم)\s*[:\-]?\s*(\d{1,2})/gi));
    const weeks=values(t,/\b(?:week|wek|wk)\s*[:\-]?\s*(\d{1,2})/gi).concat(values(t,/(?:الاسبوع|اسبوع)\s*[:\-]?\s*(\d{1,2})/gi));
    const evaluations=[];
    const evRe=/(?:\b(?:evaluation|assessment|eval)\b|التقييم|تقييم)\s*(?:رقم\s*)?([0-9]{1,2}|الاولى?|الثاني|الثانية|الثالث|الثالثة|الرابع|الرابعة|الخامس|الخامسة|السادس|السادسة|السابع|السابعة|الثامن|الثامنة|التاسع|العاشر)(?=\s|$|[،,؛.;!؟])/gi;
    for(const m of t.matchAll(evRe)){const k=norm(m[1]);const v=/^\d+$/.test(k)?Number(k):ords[k];if(Number.isInteger(v))evaluations.push(v);}
    const flags=[];
    const unique=a=>[...new Set(a.map(x=>x.value??x))];
    const th=unique(themes),wk=unique(weeks),ev=[...new Set(evaluations)];
    const forecastAt=t.search(/بكرة|بكره|غدا|غدًا|tomorrow/i);
    const planned=forecastAt>=0?lessons.find(x=>x.at>forecastAt):null;
    const currentLessons=forecastAt>=0?lessons.filter(x=>x.at<forecastAt):lessons;
    if(unique(currentLessons).length>1|| (planned&&currentLessons.length&&planned.value!==currentLessons[0].value)){
      flags.push('أكثر من درس مذكور، وبينهما درس حالي أو خطة للحصة المقبلة. يجب تأكيد الدرس المنتهي قبل الاعتماد.');
    }
    if(th.length>1)flags.push('أكثر من Theme / Unit في النص؛ يلزم التحقق.');
    if(wk.length>1)flags.push('أكثر من Week؛ يلزم التحقق.');
    if(ev.length>1)flags.push('أكثر من رقم Evaluation؛ يلزم التحقق.');
    const difference=/فرق.*(?:فصل|سادسة|درس|التقييم)|(?:فصل|سادسة).*فرق.*(?:درس|التقييم)/i.test(t);
    if(difference)flags.push('توجد فروق بين فصول الصف في الدرس أو التقييم، والشعبة المختلفة غير محددة.');
    return {
      theme:th.length===1?'Theme '+th[0]:null,
      lesson:unique(currentLessons).length===1&&!flags.some(x=>x.startsWith('أكثر من درس'))?'Lesson '+currentLessons[0].value:null,
      plannedLesson:planned?'Lesson '+planned.value:null,
      week:wk.length===1?wk[0]:null,
      evaluation:ev.length===1?ev[0]:null,
      notes:[],flags,
      hasMetrics:!!(lessons.length||themes.length||weeks.length||evaluations.length),
      difference
    };
  }
  function staffMatch(sender,staff){
    const sn=norm(sender);if(!sn)return null;
    const st=(staff||[]).filter(s=>[s.name_ar,s.name_en].some(n=>{
      const name=norm(n);if(!name)return false;
      if(name===sn||name.includes(sn+' ')||name.endsWith(' '+sn))return true;
      const stoks=sn.split(' ').filter(x=>x.length>1);
      return stoks.length>=2&&stoks.every(tok=>name.split(' ').includes(tok));
    }));
    return st.length===1?st[0]:null;
  }
  function gradeLabel(g){return({P4:'رابعة ابتدائي',P5:'خامسة ابتدائي',P6:'سادسة ابتدائي',PREP1:'أولى إعدادي',PREP2:'ثانية إعدادي',PREP3:'ثالثة إعدادي'})[g]||g}
  function parseChat(raw,staff=[]){
    const messages=splitChat(raw),byKey=new Map(),directives=[],comments=[],seen=new Set();
    let count=0;
    const directive=(text)=>/محتاج\s+مراجعة|مراجعة\s+الشهر.*(?:ورد|word)|هستلم\s+المراجعة|عاوز\s+موقف\s+جميع|التقييم\s+الخامس.*(?:الثامن|8)/i.test(text);
    for(const msg of messages){
      const sender=msg.sender||'مرسل غير محدد',key=norm(sender);
      if(directive(msg.body)){directives.push({sender,text:msg.body,date:msg.date,time:msg.time});continue}
      const chunks=pieces(msg.body);
      let current=[];
      if(chunks.length){current=chunks.map(x=>({...x,sender}));}
      else{
        // A follow-up without grade can only update one unambiguous sender/grade record.
        const candidate=[...byKey.values()].filter(x=>norm(x.sender)===key);
        if(candidate.length===1)current=[{grade:candidate[0].grade,text:msg.body,sender}];
        else{comments.push({sender,text:msg.body,reason:candidate.length>1?'رسالة متابعة بلا تحديد الصف؛ لا يمكن إسنادها لصف بعينه.':'لا يوجد صف معروف لهذا المرسل في المحادثة.'});continue}
      }
      for(const part of current){
        const f=facts(part.text),id=key+'::'+part.grade;
        if(!byKey.has(id))byKey.set(id,{
          id:'r'+(++count),sender:msg.sender||'مرسل غير محدد',
          staffId:staffMatch(msg.sender,staff)?.id||null,grade:part.grade,
          theme:null,lesson:null,plannedLesson:null,week:null,evaluation:null,
          flags:[],source:[],notes:[],updated:msg.date+' '+msg.time
        });
        const row=byKey.get(id);
        for(const field of ['theme','lesson','plannedLesson','week','evaluation']){
          if(f[field]===null||f[field]===undefined)continue;
          if(row[field]!==null&&row[field]!==f[field]){row.flags.push('وردت قيمتان مختلفتان للحقل '+field+'؛ يلزم التأكد.');row[field]=null;}
          else row[field]=f[field];
        }
        row.flags.push(...f.flags);
        row.source.push({date:msg.date,time:msg.time,text:part.text});
        if(!f.hasMetrics)row.notes.push(part.text);
        if(f.flags.some(x=>x.startsWith('أكثر من درس')))row.lesson=null;
        row.updated=msg.date+' '+msg.time;
        seen.add(key);
      }
    }
    const items=[...byKey.values()].map(row=>{
      row.flags=[...new Set(row.flags)];
      row.missing=['theme','lesson','week','evaluation'].filter(x=>row[x]===null);
      row.needsReview=!!row.flags.length||!!row.missing.length||!row.staffId;
      return row;
    });
    return {items,directives,comments,totalMessages:messages.length,unlinkedStaff:items.filter(x=>!x.staffId).length};
  }
  root.TonyWAParser={parseChat,splitChat,gradeLabel,staffMatch};
  if(typeof module==='object'&&module.exports)module.exports=root.TonyWAParser;
})(typeof window!=='undefined'?window:globalThis);
