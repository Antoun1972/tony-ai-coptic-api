'use strict';
const { chromium } = require('playwright');
const http = require('node:http'), fs=require('node:fs'), path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,'')||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});res.end(data)});
});
(async()=>{
 await new Promise(r=>server.listen(4173,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},locale:'ar-EG'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'تجربة الواجهة ببيانات افتراضية فقط'}).click();
  await page.locator('h1').filter({hasText:'صباح الخير'}).waitFor({timeout:10000});
  await page.screenshot({path:process.env.GITHUB_WORKSPACE+'/ict-cloud-dashboard.png',fullPage:true});
  await page.locator('#sideNav [data-page="progress"]').click();
  await page.getByText('موقف المنهج والتقييمات',{exact:false}).first().waitFor();
  await page.locator('[name="source_text"]').fill('G5 lesson 2 theme 2 week 6');
  await page.getByRole('button',{name:/تحليل محادثة واتساب كاملة/}).click();
  await page.locator('#parseFeedback .wa-entry').first().waitFor({timeout:10000});
  const summary=await page.locator('#parseFeedback').innerText();
  if(!summary.includes('Week:') || !summary.includes('6') || !summary.includes('Evaluation:'))
    throw Error('Batch parser did not produce a review card');
  await page.locator('#parseFeedback [data-action="use-chat-row"]').first().click();
  const ev=await page.locator('#progressForm [name="evaluation"]').inputValue();
  const wk=await page.locator('#progressForm [name="week"]').inputValue();
  const section=await page.locator('#progressForm [name="class_id"]').inputValue();
  if(ev || wk!=='6' || section)throw Error('Week/Evaluation or explicit section confirmation failed: '+wk+'/'+ev+'/'+section);
  await page.locator('#sideNav [data-page="exams"]').click();
  await page.locator('form[data-form="make-exam"] button[type="submit"]').click();
  await page.locator('[data-action="preview-exam"]').first().waitFor({timeout:10000});
  await page.locator('[data-action="preview-exam"]').first().click();
  await page.locator('#previewDialog[open]').waitFor({timeout:10000});
  const frame=page.frameLocator('#printFrame');
  await frame.getByText('DRAFT',{exact:true}).first().waitFor({timeout:10000});
  await frame.getByText('ICT Monthly Exam',{exact:false}).first().waitFor({timeout:10000});
  await page.screenshot({path:process.env.GITHUB_WORKSPACE+'/ict-cloud-preview.png',fullPage:false});
  await page.locator('#closePreview').click();
  await page.locator('#sideNav [data-page="teachers"]').click();
  await page.getByRole('heading',{name:'ملفات المدرسين'}).waitFor({timeout:10000});
  // mobile smoke
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobileNav [data-page="dashboard"]').click();
  const width=await page.evaluate(()=>({viewport:window.innerWidth,root:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  if(width.root>width.viewport+2 || width.body>width.viewport+2)throw Error('Mobile page overflows horizontally: '+JSON.stringify(width));
  await page.screenshot({path:process.env.GITHUB_WORKSPACE+'/ict-cloud-mobile.png',fullPage:true});
  // Mock the authorized cloud REST client to verify query URL generation and member roster.
  // This is isolated fictional data, not a real school-user credential.
  const roster=await page.evaluate(async()=>{
    const originalApi=window.api;
    const requestPaths=[];
    try{
      App.demo=false;
      App.session={access_token:'mock-jwt',expires_at:Math.floor(Date.now()/1000)+3600};
      App.school={id:'fictional-school',name:'TEST ONLY'};
      App.user={id:'fictional-user',email:'mock@example.test'};
      App.member={role:'head',status:'active',school_id:'fictional-school'};
      App.yearId=null;
      window.api=async(url)=>{
        requestPaths.push(url);
        if(url.includes('/rest/v1/memberships?'))return [{id:'mem-1',user_id:'fictional-user',role:'head',status:'active',school_id:'fictional-school'}];
        if(url.includes('/rest/v1/profiles?'))return [{id:'fictional-user',display_name:'Test Senior Teacher',email:'mock@example.test'}];
        return [];
      };
      await loadData({silent:true});
      App.page='members';
      render();
      return {count:App.members.length,profileCount:App.profiles.length,requestPaths,shown:document.getElementById('main').innerText.includes('Test Senior Teacher')};
    }finally{window.api=originalApi}
  });
  if(roster.count!==1 || roster.profileCount!==1 || !roster.shown)throw Error('Authorized member list failed: '+JSON.stringify(roster));
  if(roster.requestPaths.some(u=>u.includes('??')))throw Error('Double query marker in REST requests: '+JSON.stringify(roster.requestPaths));
  console.log('PASS: authorized member roster and properly normalized PostgREST query strings');
  // Check the private-import UI using synthetic, fictional data only.
  // Real school teacher records are never committed into public GitHub Pages assets.
  const migrationTest=await page.evaluate(()=>{
    const pack={
      schema:'tony-ict-teacher-schedule-import-v1',year:'2026/2027',
      teachers:[{key:'dummy-1',name_ar:'مدرس تجريبي',name_en:'Fictional Demo Teacher'}],
      classes:[{grade:'4th Primary',section:'A',teacher_key:'dummy-1',verified_class_assignment:true}],
      timetable:[{teacher_key:'dummy-1',day:'Monday',period:4,grade:'4th Primary',section:'A',under_13:true,time_start_reference:'10:05',time_end_reference:'10:45'}],
      grade_level_progress_reports:[{teacher_key:'dummy-1',grade:'4th Primary',theme_unit:'Theme 2',lesson:'Lesson 2',week:null,evaluation:null}],
      proposed_visits:[{code:'V-DEMO',date:'2026-11-12',teacher_key:'dummy-1',period:4,grade:'4th Primary',section:'A',purpose:'Fictional demo',status:'proposed_not_conducted'}]
    };
    validateTeacherImport(pack);
    let badRejected=false;
    try{validateTeacherImport({...pack,teachers:[{...pack.teachers[0],key:'not valid'}]})}
    catch{badRejected=true}
    TeacherImport.pack=pack;
    App.page='import';render();
    const importShown=document.getElementById('main').textContent.includes('Fictional Demo Teacher');
    TeacherImport.timetable=pack;
    App.page='timetable';render();
    const timetableShown=document.getElementById('main').textContent.includes('مدرس تجريبي');
    const pendingShown=document.getElementById('main').textContent.includes('مقترحة فقط');
    return {importShown,timetableShown,pendingShown,badRejected};
  });
  if(!Object.values(migrationTest).every(Boolean))throw Error('Private school timetable import regression failed: '+JSON.stringify(migrationTest));
  console.log('PASS: private import file validation, head-only review preview, timetable and proposed-visit display');
  if(errors.length)throw Error('Browser JavaScript errors: '+errors.join('; '));
  console.log('PASS: login/demo state, teacher/progress tabs, distinct Week/Evaluation, approved-bank exam draft, A4 preview, mobile UI');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
