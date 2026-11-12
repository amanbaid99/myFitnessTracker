/* eslint-disable @typescript-eslint/no-require-imports */
// Local synthetic PostgREST only. Fixture route must never be published.
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const base=process.env.BROWSER_BASE||'http://localhost:3004';assert(new URL(base).hostname==='localhost','Local browser only');
const dir='docs/ui-evidence/assisted-bodyweight';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];const c=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await c.route('**/*',r=>['localhost','127.0.0.1'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
 await c.addCookies([{name:'wt-theme',value:'beige.orange',url:base}]);
 const page=await c.newPage();page.on('pageerror',e=>errors.push(e.message));
const capture=async options=>{await page.evaluate(()=>scrollTo(0,0));await page.addStyleTag({content:'nextjs-portal{display:none}'});await page.screenshot(options);};
 const go=async(query='')=>{await page.goto(base+'/demo/tmp-assisted'+query,{waitUntil:'networkidle'});};
 const noOverflow=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow');
 await go('?view=before');await capture({path:dir+'/before-390.png',fullPage:true});
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>sessionStorage.clear());await go();await noOverflow();
  assert.equal(await page.getByRole('button',{name:/^Log set [1-5]$/}).count(),5);
  await page.getByRole('button',{name:'Skip preparation for now'}).click();
  await page.getByRole('button',{name:'Skip warm-up',exact:true}).click();
  await page.getByRole('textbox',{name:/^Set 2 assistance/}).fill('15');await page.getByRole('textbox',{name:/^Set 2 reps/}).fill('9');await page.getByRole('textbox',{name:/^Set 2 reps/}).blur();
  await page.getByRole('button',{name:'Use bodyweight',exact:true}).nth(0).click();
  await capture({path:`${dir}/after-${width}.png`,fullPage:true});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.getByRole('textbox',{name:/^Set 1 assistance/}).inputValue(),'0');assert.equal(await page.getByRole('textbox',{name:/^Set 2 assistance/}).inputValue(),'15');
 }
 // Both planned editing and temporary creation use explicit tracking and units.
 await page.setViewportSize({width:390,height:844});await go('?view=plan');await page.getByRole('button',{name:/Assisted dips/}).first().click();await page.getByRole('dialog').waitFor();assert.equal(await page.getByLabel('Load tracking').inputValue(),'assisted');await capture({path:dir+'/planned-edit-390.png',fullPage:true});await page.getByRole('button',{name:'Close',exact:true}).click();
 await go('?units=lb');assert.equal(Number(await page.getByRole('textbox',{name:/^Set 3 assistance/}).inputValue()),22); // formatter may omit decimal
 await noOverflow();await capture({path:dir+'/pounds-390.png',fullPage:true});
 await go();await page.getByRole('button',{name:'Add exercise',exact:true}).click();await page.getByRole('textbox',{name:'Search or type a new exercise'}).fill('Temporary assisted pull-up');await page.getByRole('button',{name:'Add new exercise'}).click();await page.getByLabel('Load tracking').selectOption('assisted');await page.getByLabel('Starting assistance',{exact:true}).fill('25');await page.getByLabel('Assistance step',{exact:true}).fill('5');await noOverflow();await capture({path:dir+'/temporary-add-390.png',fullPage:true});
 assert.equal(errors.length,0,errors.join('\n'));console.log('PASS layout, all rows, visible warmups, per-set values, refresh, planned mode, temporary mode, pounds and console');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
