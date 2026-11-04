/* eslint-disable @typescript-eslint/no-require-imports */
const crypto=require('node:crypto'),fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
// Local-only fixture route, created for this run and removed on exit.
const fixtureDirectory='app/demo/tmp-consistency',fixturePath=fixtureDirectory+'/page.tsx';
if(fs.existsSync(fixturePath))throw new Error('Remove the prior local fixture before running this harness.');
fs.mkdirSync(fixtureDirectory,{recursive:true});
fs.copyFileSync('scripts/feedback-browser/fixtures/consistency-preview.tsx',fixturePath);
process.on('exit',()=>{fs.unlinkSync(fixturePath);fs.rmdirSync(fixtureDirectory);});
const secret=fs.readFileSync('/tmp/repd-feedback-test-secret','utf8');
const ids={coach:'44444444-4444-4444-4444-444444444444',client:'55555555-5555-5555-5555-555555555555',other:'66666666-6666-6666-6666-666666666666'};
const base='http://localhost:3003';
const b64=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
function token(role){const now=Math.floor(Date.now()/1000),input=b64({alg:'HS256',typ:'JWT'})+'.'+b64({iss:'http://127.0.0.1:55435/auth/v1',sub:ids[role],aud:'authenticated',role:'authenticated',iat:now,exp:now+43200,email:`fixture-${role}@example.invalid`});return input+'.'+crypto.createHmac('sha256',secret).update(input).digest('base64url');}
(async()=>{const browser=await chromium.launch();const errors=[];
async function pageFor(role){const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Kolkata'});const now=Math.floor(Date.now()/1000),session={access_token:token(role),refresh_token:'local-test-refresh',token_type:'bearer',expires_in:43200,expires_at:now+43200,user:{id:ids[role],email:`fixture-${role}@example.invalid`}};await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+b64(session),domain:'localhost',path:'/'},{name:'wt-theme',value:'beige.orange',domain:'localhost',path:'/'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));return page;}
const client=await pageFor('client');
// The dev route watcher needs to discover a newly created fixture.
for(let attempt=0;attempt<10;attempt++){
 const response=await client.goto(base+'/demo/tmp-consistency',{waitUntil:'domcontentloaded'});
 if(response.ok())break;
 if(attempt===9)throw new Error('Local fixture route was not discovered');
 await client.waitForTimeout(250);
}

const folder='docs/ui-evidence/phase-2-consistency';fs.mkdirSync(folder,{recursive:true});
const snap=async(name,width=390)=>{await client.setViewportSize({width,height:844});await client.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});assert(await client.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+name);};
for(const state of ['populated','empty','above','unknown','unavailable']) {
 await client.goto(base+'/demo/tmp-consistency?state='+state,{waitUntil:'domcontentloaded'});await client.getByRole('tab',{name:'Consistency',exact:true}).click();
 assert.equal(await client.getByRole('region',{name:'Progress summary'}).count(),0);
 if(['populated','empty','above'].includes(state))assert.equal(await client.getByRole('progressbar').getAttribute('aria-valuenow'),state==='populated'?'40':state==='above'?'100':'0');else assert.equal(await client.getByRole('progressbar').count(),0);
 await snap('after-'+state);
 if(state==='populated'){
  for(const width of [320,430])await snap('after-'+state,width);
  await client.getByText('Recent weeks and targets',{exact:true}).focus();await client.keyboard.press('Enter');await client.getByText('Earlier targets were not always recorded. Those weeks show completed workouts only.',{exact:true}).waitFor();assert.equal(await client.getByText(/Earlier targets were not always recorded/).count(),1);await client.getByText('1 workout',{exact:true}).waitFor();await snap('after-history');
  await client.getByText('12-week activity calendar',{exact:true}).focus();await client.keyboard.press('Enter');await client.getByRole('img',{name:/training days over the last 12 weeks/}).waitFor();await snap('after-calendar',320);
  await client.getByText("Set this week's target",{exact:true}).click();await client.getByLabel('Planned workouts').fill('6');await client.getByRole('button',{name:'Save weekly target'}).click();await client.getByText('2 of 6 workouts',{exact:true}).waitFor();
 }
}
await client.goto(base+'/demo/tmp-consistency?state=write',{waitUntil:'domcontentloaded'});await client.getByRole('tab',{name:'Consistency'}).click();await client.getByText("Set this week's target",{exact:true}).click();await client.getByLabel('Planned workouts').fill('6');
let release;await client.route('**/rest/v1/weekly_targets*',async route=>{await new Promise(resolve=>{release=resolve});await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic unavailable service'})});});
await client.getByRole('button',{name:'Save weekly target'}).click();await client.getByRole('button',{name:'Saving…',exact:true}).waitFor();await snap('after-saving');release();await client.getByText("Could not save this week's target. Try again online.").waitFor();await snap('after-save-error');await client.unroute('**/rest/v1/weekly_targets*');
await client.context().setOffline(true);await client.getByRole('button',{name:'Save weekly target'}).click();await client.getByRole('button',{name:'Save weekly target'}).waitFor({state:'visible'});await client.getByText("Could not save this week's target. Try again online.").waitFor();await snap('after-offline-error');assert(await client.getByText('2 of 5 workouts',{exact:true}).isVisible());await client.context().setOffline(false);
await client.getByRole('tab',{name:'Strength'}).click();await client.getByLabel('Search exercises',{exact:true}).fill('press');await client.getByLabel('Strength period').selectOption('4');await client.getByRole('tab',{name:'Strength'}).focus();await client.keyboard.press('End');assert.equal(await client.getByRole('tab',{name:'Consistency'}).getAttribute('aria-selected'),'true');await client.keyboard.press('Home');assert.equal(await client.getByLabel('Search exercises',{exact:true}).inputValue(),'press');assert.equal(await client.getByLabel('Strength period').inputValue(),'4');
await client.getByRole('tab',{name:'Consistency'}).click();await client.setViewportSize({width:320,height:844});await client.evaluate(()=>document.documentElement.style.fontSize='32px');await client.getByText('12-week activity calendar',{exact:true}).click();await snap('after-large-text',320);await client.evaluate(()=>document.documentElement.style.fontSize='');
for(const theme of ['dark','light','beige']){await client.evaluate(theme=>document.documentElement.setAttribute('data-base',theme),theme);await snap('after-theme-'+theme);}
assert.deepEqual(errors,[]);console.log('PASS consistency: populated, empty, above target, unknown, unavailable, keyboard history/calendar/tabs, retained Strength filters, target editing, pending/error/offline, large text, three themes and widths');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
