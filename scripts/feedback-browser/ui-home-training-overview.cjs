/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
require('tsx/cjs');const {analysisWeek,previousWeek}=require('../../lib/analysis-week.ts');
const week=analysisWeek(new Date().toISOString()),last=previousWeek(week),base=process.env.REVIEW_URL??'http://localhost:3004';
const folder='docs/ui-evidence/home-training-overview';fs.mkdirSync(folder,{recursive:true});
const report={title:'Repeatable progress',summary:'Repeated lifts are improving across four weeks. Your training rhythm has stayed steady.',highlights:['Bench reps held steady.'],watch:'The current week is incomplete.',nextFocus:'Use the next planned target.'};
const row=(start,rich=true)=>({period_start:start,title:'Weekly title',summary:'WEEKLY_ONLY_CONTENT',details:{coveredThrough:new Date().toISOString(),...(rich?{longerTerm:report}:{})}});
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium'});try{
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage(),errors=[],posts=[];let mode='rich';
 await c.addCookies([{name:'wt-theme',value:'beige.orange',url:base}]);p.on('pageerror',e=>errors.push(e.message));
 await c.route('**/*.supabase.co/**',r=>{if(r.request().method()==='POST')posts.push(r.request().url());let rows=mode==='legacy'?[row(week.start,false)]:mode==='last'?[row(week.start,false),row(last.start)]:mode==='empty'||mode==='error'?[]:[row(week.start)];return r.fulfill({status:mode==='error'?503:200,contentType:'application/json',body:JSON.stringify(rows)});});
 const visit=async state=>{await p.goto(`${base}/demo/tmp-training-overview?state=${state}`);await p.waitForTimeout(200);};
 const region=()=>p.getByRole('region',{name:'Your training overview',exact:true});
 const shot=async(name,w)=>{assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${w}`);await p.screenshot({path:`${folder}/${name}-${w}.png`});};const sizes=[];
 for(const w of [320,390,430]){
  await p.setViewportSize({width:w,height:844});await visit('before');const before=(await p.locator('[aria-label="Current week analysis"]').boundingBox()).height;await shot('before',w);
  await visit('ready');await region().getByText(/In this sample, training is spread across all four weeks/).waitFor();const after=(await region().boundingBox()).height;assert(after<=before,`card grew at ${w}: ${after}>${before}`);sizes.push({width:w,before,after});await shot('after',w);
  assert.equal(await region().getByRole('button').count(),0);assert.equal(await region().getByText(/Next focus|Your week so far|WEEKLY_ONLY_CONTENT/).count(),0);const link=region().getByRole('link',{name:'View training analysis',exact:true});assert((await link.boundingBox()).height>=44);assert.equal(await link.getAttribute('href'),'/demo/week#training-overview');
  const start=await p.getByRole('button',{name:'Start workout',exact:true}).boundingBox();await p.getByRole('button',{name:'Start workout',exact:true}).click();const resume=await p.getByRole('button',{name:'Resume workout',exact:true}).boundingBox();assert.equal(start.y,resume.y);assert.equal(start.height,resume.height);
  await link.click();await p.locator('#training-overview').waitFor();assert(await p.locator('#training-overview').evaluate(el=>el.getBoundingClientRect().top>=0&&el.getBoundingClientRect().top<innerHeight));await shot('detail',w);
 }
 await p.setViewportSize({width:390,height:844});
 for(const state of ['legacy','last','empty','error']){mode=state;await visit(state);await region().getByRole('link',{name:'View training analysis',exact:true}).waitFor();assert.equal(await p.getByText('WEEKLY_ONLY_CONTENT',{exact:true}).count(),0);if(state==='last'){await region().getByText(report.summary,{exact:true}).waitFor();assert.equal(await region().getByRole('link').getAttribute('href'),'/demo/week?week=last#training-overview');}if(state==='legacy'){await region().getByText(/refresh your broader overview/).waitFor();assert.equal(await region().getByRole('link').getAttribute('href'),'/demo/week');}if(state==='error')await region().getByRole('alert').waitFor();await shot(state,390);}
 mode='empty';await visit('pending');await p.clock.install();mode='rich';await p.clock.runFor(11_000);await region().getByText(report.summary,{exact:true}).waitFor();await shot('polled',390);await p.clock.resume();await c.setOffline(true);await shot('offline-saved',390);await c.setOffline(false);
 await visit('long');await p.setViewportSize({width:320,height:844});await shot('long-text',320);await p.evaluate(()=>document.documentElement.style.fontSize='32px');await shot('large-text',320);await region().getByRole('link').focus();assert(await region().getByRole('link').evaluate(el=>el===document.activeElement));await p.evaluate(()=>document.documentElement.style.fontSize='');
 await p.setViewportSize({width:390,height:844});await visit('ready');for(const theme of ['light','dark','beige']){await p.evaluate(t=>document.documentElement.dataset.base=t,theme);await shot('theme-'+theme,390);}
 assert.deepEqual(posts,[]);assert.deepEqual(errors,[]);fs.writeFileSync(`${folder}/measurements.json`,JSON.stringify(sizes,null,2));console.log('PASS: true four-week content, compact 320/390/430 layout, matching report anchor, legacy/fallback/empty/error/polling/offline, retained Start/Resume position, large text, keyboard, themes, no AI/write requests or page errors.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
