/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const p=await context.newPage(),errors=[],requests=[];
  p.on('pageerror',e=>errors.push(e.message));
  await context.route(/^https:\/\//,route=>{if(route.request().url().includes('.supabase.co'))requests.push(route.request().url());return route.abort();});
  const base=process.env.REVIEW_URL??'http://localhost:3005';
  const theme=()=>p.evaluate(()=>{document.documentElement.dataset.base='beige';document.documentElement.dataset.accent='orange';document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';});
  const shot=async(name,width)=>{assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${width}`);await p.screenshot({path:`docs/ui-evidence/custom-workout/production-${name}-${width}.png`});};
  for(const width of [320,390,430]){
   await p.setViewportSize({width,height:844});await p.goto(`${base}/demo`);await theme();const custom=p.getByRole('link',{name:'Custom workout today',exact:true});await custom.scrollIntoViewIfNeeded();assert((await custom.boundingBox()).height>=44);await shot('home',width);await custom.click();
   const d=p.getByRole('dialog');await d.getByRole('heading',{name:'Custom workout today',exact:true}).waitFor();await theme();await shot('setup',width);
   await d.getByRole('button',{name:'Dumbbells only Dumbbells + bodyweight',exact:true}).click();await d.getByLabel('Focus',{exact:true}).selectOption('full_body');await d.getByRole('button',{name:'Create a draft with AI',exact:true}).click();await d.getByRole('heading',{name:'Review workout',exact:true}).waitFor();assert.equal(await d.locator('ol>li').count(),5);await shot('review',width);
   await d.getByRole('button',{name:'Save a version for later',exact:true}).click();await d.getByLabel(/Save as a new plan/).check();await d.getByRole('button',{name:'Save new plan',exact:true}).click();await d.getByText(/as an inactive plan/).waitFor();
   await d.getByRole('button',{name:'Start this workout today',exact:true}).click();await p.getByRole('heading',{name:'Full body example',exact:true}).waitFor();await p.getByLabel(/^Set 1 weight/).first().fill('10');await p.getByRole('button',{name:'Log set 1',exact:true}).first().click();await shot('logger',width);
  }
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
  console.log('PASS production build: Home entry, choices, review, local save, real demo logger and logging at 320/390/430; no Supabase/AI requests or page errors.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
