/* eslint-disable @typescript-eslint/no-require-imports */
// Synthetic local API fixture only. Never point this script at a hosted app.
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert'),fs=require('fs');
const base='http://localhost:3004',api='http://127.0.0.1:55445',folder='docs/ui-evidence/optional-days';
const token=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const id=n=>`18180000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
async function rows(table){const r=await fetch(api+'/rest/v1/'+table,{headers:{apikey:token,authorization:'Bearer '+token}});assert(r.ok);return r.json();}
(async()=>{assert(process.env.NEXT_PUBLIC_SUPABASE_URL===api);const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage(),errors=[],external=[];
p.on('pageerror',e=>errors.push(e.message));await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith(base+'/')||u.startsWith(api+'/'))return r.continue();external.push(u);return r.abort();});
await c.addCookies([{name:'sb-127-auth-token',url:base,value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'synthetic-local-only',expires_at:2000000000,expires_in:3600,token_type:'bearer',user:{id:id(1),aud:'authenticated',email:'optional-fixture@example.test'}})).toString('base64url')},{name:'wt-theme',value:'beige.orange',url:base}]);
await p.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important}';document.head.append(style);});});
async function shot(name,width=390){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');await p.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});}
await p.goto(base+'/');await p.getByRole('heading',{name:'Pull',exact:true}).waitFor();
await p.locator('summary').filter({hasText:'Optional workouts'}).click();for(const w of [320,390,430])await shot('home',w);
await p.getByRole('button',{name:'Start optional Bodyweight extras',exact:true}).click();await p.waitForURL(/\/workout\//);const workout=p.url().split('/').at(-1);
await p.goto(base+'/');await p.getByRole('link',{name:'Resume workout',exact:true}).waitFor();await shot('resume');await p.getByRole('link',{name:'Resume workout',exact:true}).click();await p.waitForURL('**/workout/'+workout);
await p.getByRole('heading',{name:'Bodyweight extras',exact:true}).waitFor();await p.waitForLoadState('networkidle');const skip=p.getByRole('button',{name:'Skip preparation for now',exact:true});if(await skip.isVisible())await skip.click();
await p.getByRole('button',{name:'Log set 1',exact:true}).waitFor();await c.setOffline(true);await p.getByRole('button',{name:'Log set 1',exact:true}).click();await p.getByRole('button',{name:'Undo set 1',exact:true}).waitFor();await c.setOffline(false);await p.waitForTimeout(500);await p.reload();await p.getByRole('button',{name:'Undo set 1',exact:true}).waitFor();
await p.getByRole('button',{name:'Finish',exact:true}).click();await p.getByRole('button',{name:'Save workout',exact:true}).click();await p.waitForURL('**/history/'+workout);await p.locator('#logged-sets').waitFor();await shot('saved-history');
const [saved]=await rows('workouts?id=eq.'+workout+'&select=counts_for_rotation,ended_at');assert(saved.ended_at);assert.equal(saved.counts_for_rotation,false);
await p.goto(base+'/');await p.getByRole('heading',{name:'Pull',exact:true}).waitFor();await shot('rotation-preserved');
assert.equal((await rows('plans?id=eq.'+id(2)+'&select=days_per_week'))[0].days_per_week,3);
await p.goto(base+'/routines');const optionalDay=p.locator('details').filter({has:p.getByRole('heading',{name:'Bodyweight extras Optional',exact:true})});await optionalDay.locator('summary').click();await optionalDay.getByRole('button',{name:'Start Bodyweight extras',exact:true}).waitFor();await shot('plan');
await p.goto(base+'/plans/'+id(2));await p.getByRole('button',{name:'Add a day',exact:true}).click();const form=p.getByRole('form',{name:'Add a day',exact:true});const name='Cardio whenever I have extra time and energy';await form.getByLabel('Day name',{exact:true}).fill(name);await form.getByRole('checkbox',{name:/Optional day/}).check();
let fail=true;await p.route('**/rest/v1/routines?*',async r=>{if(r.request().method()==='POST'&&fail){fail=false;return r.fulfill({status:403,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({code:'42501',message:'permission denied'})});}return r.continue();});
await form.getByRole('button',{name:'Add day',exact:true}).click();await form.getByRole('alert').waitFor();assert.equal(await form.getByLabel('Day name',{exact:true}).inputValue(),name);assert(await form.getByRole('checkbox',{name:/Optional day/}).isChecked());await shot('retained-error');
await form.getByRole('button',{name:'Add day',exact:true}).click();await form.waitFor({state:'hidden'});await p.getByText(name,{exact:true}).waitFor();
const added=await rows('routines?name=eq.'+encodeURIComponent(name)+'&select=id,is_optional');assert.equal(added.length,1);assert.equal(added[0].is_optional,true);
const section=p.getByText(name,{exact:true}).locator('xpath=ancestor::section[1]');await section.locator('summary').filter({hasText:'Day options'}).click();await section.getByRole('checkbox',{name:/Optional day/}).uncheck();await section.getByText('Optional',{exact:true}).waitFor({state:'hidden'});await section.getByRole('checkbox',{name:/Optional day/}).check();await section.getByText('Optional',{exact:true}).waitFor();
for(const w of [320,390,430])await shot('editor',w);
await p.goto(base+'/');await p.getByRole('heading',{name:'Pull',exact:true}).waitFor();await p.locator('summary').filter({hasText:'Optional workouts'}).click();await p.getByRole('button',{name:'Start optional '+name,exact:true}).waitFor();assert(await p.getByRole('button',{name:'Start optional '+name,exact:true}).isDisabled());
assert.equal((await rows('plans?id=eq.'+id(2)+'&select=days_per_week'))[0].days_per_week,3);
assert.deepEqual(errors,[]);assert(external.every(u=>!u.includes('supabase.co')),'hosted backend attempted');fs.writeFileSync(folder+'/browser-results.json',JSON.stringify({viewports:[320,390,430],pageErrors:errors,checks:['real signed-in Home and plan editor','regular anchor beyond 200 extras','manual optional start and resume','offline one-tap logging, reconnection, refresh and finish','History saved with rotation exemption','same next regular day','add optional day with retained error inputs','existing-day optional toggles','empty optional Start disabled','weekly goal unchanged']},null,2));console.log('PASS optional-day signed-in local browser/API flow.');
await c.close();}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
