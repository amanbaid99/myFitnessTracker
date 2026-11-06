/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const titles=['Today keeps the important things together','See what your workout worked','Log sets in a familiar order','Replace one exercise','Progress starts with charts','Review and edit a plan clearly'];
const targets=['section[aria-label="Current week analysis"]','section[aria-label="Workout body map"]','[data-guide="tip:log-set"]','details:has(button[aria-label^="Replace exercise"]) > summary','a[aria-label="Explore training volume"]','details[aria-label^="Day 1"]'];
(async()=>{const b=await chromium.launch({headless:true});try{
 const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage(),requests=[],errors=[];
 await c.route(/^https:\/\//,r=>{if(r.request().url().includes('.supabase.co'))requests.push(r.request().url());return r.abort();});p.on('pageerror',e=>errors.push(e.message));
 const base=process.env.REVIEW_URL??'http://localhost:3004';
 const shot=async(name,width)=>{assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${name}`);await p.screenshot({path:`docs/ui-evidence/custom-workout/${name}-${width}.png`});};
 if(!process.env.SKIP_INVITE){
  for(const width of [320,390,430]){await p.setViewportSize({width,height:844});await p.goto(`${base}/demo/tmp-tour-v2`);const invite=p.getByRole('dialog',{name:"See what's changed",exact:true});await invite.waitFor();await shot('tour-v2-invite',width);await invite.getByRole('button',{name:'Skip',exact:true}).click();await p.getByRole('status').filter({hasText:'Skipped sample tour'}).waitFor();}
 }
 for(const width of [320,390,430]){
  await p.setViewportSize({width,height:844});await p.goto(`${base}/demo?updateTour=nov-3-5-2026-v2&tourPreview=1&tourStep=0`);
  for(let i=0;i<6;i++){
   const d=p.getByRole('dialog');await d.getByText(titles[i],{exact:true}).waitFor();await p.locator(targets[i]).first().waitFor({state:'visible'});const box=await d.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=844,`tour bubble offscreen ${i+1} at ${width}`);
   for(const button of await d.getByRole('button').all()){const rect=await button.boundingBox();assert(rect.height>=44&&rect.width>=44);}
   await shot(`tour-v2-step-${i+1}`,width);
   if(i===1){await d.getByRole('button',{name:'Previous',exact:true}).click();await p.getByRole('dialog').getByText(titles[0],{exact:true}).waitFor();await p.getByRole('dialog').getByRole('button',{name:'Next',exact:true}).click();await p.getByRole('dialog').getByText(titles[1],{exact:true}).waitFor();}
   await p.getByRole('dialog').getByRole('button',{name:i===5?'Done':'Next',exact:true}).click();
  }
  await p.waitForURL(`${base}/demo`);assert.equal(await p.getByRole('dialog').count(),0);
 }
 await p.goto(`${base}/demo?updateTour=nov-3-5-2026-v2&tourStep=0`);await p.getByRole('dialog').getByText("What's new",{exact:true}).waitFor();assert.equal(await p.getByText("What's new · Preview",{exact:true}).count(),0);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);console.log('PASS preserved published v2 tour: six spotlight steps, all targets, Previous/Next/Done, invitation Skip, 320/390/430, no writes or page errors.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
