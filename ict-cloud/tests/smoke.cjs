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
  await page.getByRole('button',{name:/استخراج مقترحات/}).click();
  const ev=await page.locator('#progressForm [name="evaluation"]').inputValue();
  const wk=await page.locator('#progressForm [name="week"]').inputValue();
  if(ev || wk!=='6')throw Error('Week/Evaluation parser failed: '+wk+'/'+ev);
  await page.locator('#sideNav [data-page="exams"]').click();
  await page.locator('form[data-form="make-exam"] button[type="submit"]').click();
  await page.locator('[data-action="preview-exam"]').first().waitFor({timeout:10000});
  await page.locator('[data-action="preview-exam"]').first().click();
  await page.locator('#previewDialog[open]').waitFor({timeout:10000});
  await page.screenshot({path:process.env.GITHUB_WORKSPACE+'/ict-cloud-preview.png',fullPage:false});
  const frame=page.frameLocator('#printFrame');
  await frame.getByText('DRAFT',{exact:true}).first().waitFor({timeout:10000});
  await page.locator('#closePreview').click();
  await page.locator('#sideNav [data-page="teachers"]').click();
  await page.getByRole('heading',{name:'ملفات المدرسين'}).waitFor({timeout:10000});
  // mobile smoke
  await page.setViewportSize({width:390,height:844});
  await page.locator('#mobileNav [data-page="dashboard"]').click();
  await page.screenshot({path:process.env.GITHUB_WORKSPACE+'/ict-cloud-mobile.png',fullPage:true});
  if(errors.length)throw Error('Browser JavaScript errors: '+errors.join('; '));
  console.log('PASS: login/demo state, teacher/progress tabs, distinct Week/Evaluation, approved-bank exam draft, A4 preview, mobile UI');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exit(1)});
