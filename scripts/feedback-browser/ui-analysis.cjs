/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const folder=process.env.EVIDENCE_DIR??'docs/ui-evidence/analysis-depth';fs.mkdirSync(folder,{recursive:true});
const base=process.env.REVIEW_URL??'http://localhost:3004';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true});try{
 const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});await c.addCookies([{name:'wt-theme',value:'beige.orange',url:base}]);const p=await c.newPage(),errors=[],posts=[];
 p.on('pageerror',e=>errors.push(e.message));
 let homeState='empty',mode='error',generated=false;
 await c.route('**/*.supabase.co/**',r=>{
  const u=r.request().url();
  if(u.includes('/functions/')){posts.push(r.request().postDataJSON());return r.fulfill({status:mode==='error'?503:202,contentType:'application/json',body:JSON.stringify(mode==='error'?{error:'Synthetic unavailable'}:{analyzing:'55555555-5555-4555-8555-555555555555'})});}
  if(u.includes('/insights'))return r.fulfill({status:homeState==='error'?503:200,contentType:'application/json',body:JSON.stringify(generated?[{title:'Updated evidence',summary:'Bench held steady.',details:{analysisVersion:2,generatedAt:new Date().toISOString(),coveredThrough:new Date().toISOString()}}]:[])});
  return r.fulfill({status:200,contentType:'application/json',body:'[]'});
 });
 const visit=async state=>{await p.goto(`${base}/demo/tmp-analysis?state=${state}`);await p.waitForTimeout(250);await p.evaluate(()=>{document.documentElement.dataset.base='beige';document.documentElement.dataset.accent='orange';});};
 const shot=async(name,width=390)=>{assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow at ${width}`);await p.screenshot({path:`${folder}/${name}-${width}.png`});};
 let beforeHeight,afterHeight;
 for(const width of [320,390,430]){
  await p.setViewportSize({width,height:844});await visit('before-home');await p.getByText('Next focus:',{exact:true}).waitFor();if(width===390)beforeHeight=(await p.locator('section[aria-label="Current week analysis"]').boundingBox()).height;await shot('before-home',width);
  await visit('home');assert.equal(await p.getByText('Next focus:',{exact:true}).count(),0);assert.equal(await p.getByRole('button',{name:'Refresh analysis',exact:true}).count(),0);if(width===390)afterHeight=(await p.locator('section[aria-label="Current week analysis"]').boundingBox()).height;await shot('after-home',width);
  await visit('before-week');await shot('before-week',width);
  await visit('ready');await p.getByRole('heading',{name:'What the data shows',exact:true}).waitFor();await shot('after-week',width);
  const broader=p.getByRole('region',{name:'Longer-term analysis'});await broader.locator('summary').click();await broader.getByText('Repeated evidence.',{exact:true}).waitFor();await broader.scrollIntoViewIfNeeded();await shot('four-weeks',width);
  await visit('workout');await shot('workout-collapsed',width);await p.locator('summary').filter({hasText:'Evidence and next focus'}).click();await p.getByRole('heading',{name:'Next focus',exact:true}).waitFor();await shot('workout',width);
 }
 assert(afterHeight<beforeHeight,'Home did not become smaller');assert.equal(posts.length,0,'Home or demo caused an automatic AI request');
 await p.setViewportSize({width:390,height:844});for(const state of ['empty','pending','error','legacy']){await visit(state);await shot(state);}
 for(const state of ['home-empty','home-pending','home-error']){homeState=state==='home-error'?'error':'empty';await visit(state);if(state==='home-error')await p.getByRole('alert').waitFor();assert.equal(await p.locator('section[aria-label="Current week analysis"]').getByRole('button').count(),0);await shot(state);}
 homeState='empty';await visit('ready');await p.getByRole('button',{name:'Refresh analysis',exact:true}).click();await p.getByRole('alert').filter({hasText:"Couldn't start the analysis"}).waitFor();await shot('refresh-error');assert.deepEqual(posts.at(-1),{workoutId:'55555555-5555-4555-8555-555555555555',weekly:true});
 await c.setOffline(true);await p.getByRole('button',{name:'Refresh analysis',exact:true}).click();await p.getByRole('alert').filter({hasText:"You're offline"}).waitFor();await shot('offline');await c.setOffline(false);
 await visit('ready');await p.clock.install();await p.clock.setSystemTime(new Date(Date.now()+10*60_000));mode='success';await p.getByRole('button',{name:'Refresh analysis',exact:true}).click();await p.getByRole('button',{name:'Updating analysis…',exact:true}).waitFor();assert(await p.getByRole('button',{name:'Updating analysis…',exact:true}).isDisabled());await shot('updating');generated=true;await p.clock.runFor(11_000);await p.getByRole('status').filter({hasText:'Analysis updated.'}).waitFor();await shot('updated');
 await p.clock.resume();await visit('ready');await p.setViewportSize({width:320,height:844});await p.evaluate(()=>document.documentElement.style.fontSize='32px');await shot('large-text',320);await p.getByRole('region',{name:'Longer-term analysis'}).locator('summary').focus();assert(await p.getByRole('region',{name:'Longer-term analysis'}).locator('summary').evaluate(el=>el===document.activeElement));await p.keyboard.press('Enter');assert(await p.getByRole('region',{name:'Longer-term analysis'}).locator('details').getAttribute('open')!==null);await p.evaluate(()=>document.documentElement.style.fontSize='');
 for(const theme of ['light','dark','beige']){await p.setViewportSize({width:390,height:844});await p.evaluate(t=>document.documentElement.dataset.base=t,theme);await shot('theme-'+theme);}
 assert.deepEqual(errors,[]);fs.writeFileSync(`${folder}/measurements.json`,JSON.stringify({beforeHomeHeight:beforeHeight,afterHomeHeight:afterHeight,widths:[320,390,430],pageErrors:errors.length},null,2));console.log('PASS: smaller reading-only Home; weekly/four-week/daily detail; legacy/empty/pending/error/offline; explicit refresh/polling; 320/390/430, larger text, keyboard and themes.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
