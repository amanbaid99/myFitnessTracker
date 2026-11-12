/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const base=process.env.REVIEW_URL??'http://localhost:3005',folder=process.env.EVIDENCE_DIR??'docs/ui-evidence/home-training-overview';fs.mkdirSync(folder,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
 await context.addCookies([{name:'wt-theme',value:'beige.orange',url:base}]);page.on('pageerror',e=>errors.push(e.message));
 await context.route(/^https:\/\//,r=>{if(r.request().url().startsWith(base+'/'))return r.continue();if(r.request().url().includes('.supabase.co'))requests.push(r.request().url());return r.abort();});
 const shot=async(name,width)=>{assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow at ${width}`);await page.screenshot({path:`${folder}/production-${name}-${width}.png`});};
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await page.goto(base+'/demo');
  const overview=page.getByRole('region',{name:'Your training overview',exact:true});await overview.getByText(/In this sample, training is spread across all four weeks/).waitFor();assert.equal(await overview.getByRole('button').count(),0);assert.equal(await overview.getByText(/Your week so far|Next focus/).count(),0);await shot('home',width);
  const link=overview.getByRole('link',{name:'View training analysis',exact:true});assert.equal(await link.getAttribute('href'),'/demo/week#training-overview');await link.click();await page.locator('#training-overview').waitFor();assert(await page.locator('#training-overview').evaluate(el=>el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().top<innerHeight));await shot('detail',width);
  await page.getByRole('region',{name:'Longer-term analysis'}).locator('summary').click();await page.getByText('Repeated evidence.',{exact:true}).waitFor();await shot('evidence',width);
  await page.getByRole('link',{name:'Last week',exact:true}).click();await page.getByRole('heading',{name:'Last week',exact:true}).waitFor();assert.equal(await page.getByRole('region',{name:'Longer-term analysis'}).count(),1);
 }
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);console.log('PASS production: broader Home takeaway, direct four-week section navigation, evidence and existing weekly switching at 320/390/430, no account/provider requests or page errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
