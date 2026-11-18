/* eslint-disable @typescript-eslint/no-require-imports */
// Synthetic local API fixture only. Never point this script at a hosted app.
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert');
const base='http://localhost:3004',api='http://127.0.0.1:55447',folder='docs/ui-evidence/optional-days';
const token=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const id=n=>`18180000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
async function rows(table){const r=await fetch(api+'/rest/v1/'+table,{headers:{apikey:token,authorization:'Bearer '+token}});assert(r.ok);return r.json();}
(async()=>{assert(process.env.NEXT_PUBLIC_SUPABASE_URL===api);const b=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
const c=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage(),errors=[],external=[];
p.on('pageerror',e=>errors.push(e.message));await c.route('**/*',r=>{const u=r.request().url();if(u.startsWith(base+'/')||u.startsWith(api+'/'))return r.continue();external.push(u);return r.abort();});
await c.addCookies([{name:'sb-127-auth-token',url:base,value:'base64-'+Buffer.from(JSON.stringify({access_token:token,refresh_token:'synthetic-local-only',expires_at:2000000000,expires_in:3600,token_type:'bearer',user:{id:id(1),aud:'authenticated',email:'optional-fixture@example.test'}})).toString('base64url')},{name:'wt-theme',value:'beige.orange',url:base}]);
await p.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important}';document.head.append(style);});});
async function shot(name,width=390){await p.setViewportSize({width,height:844});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');await p.screenshot({path:`${folder}/${name}-${width}.png`,fullPage:true});}

await p.goto(base+'/');await p.getByRole('heading',{name:'Pull',exact:true}).waitFor();assert.equal(await p.locator('summary').filter({hasText:'Optional workouts'}).count(),0);await shot('legacy-home');
await p.goto(base+'/plans/'+id(2));await p.getByRole('button',{name:'Add a day',exact:true}).click();const form=p.getByRole('form',{name:'Add a day'});await form.getByLabel('Day name',{exact:true}).fill('Unsupported optional extra');await form.getByRole('checkbox',{name:/Optional day/}).check();await form.getByRole('button',{name:'Add day',exact:true}).click();await form.getByRole('alert').filter({hasText:'still being installed'}).waitFor();assert.equal(await form.getByLabel('Day name',{exact:true}).inputValue(),'Unsupported optional extra');assert(await form.getByRole('checkbox',{name:/Optional day/}).isChecked());assert.equal((await rows('routines?select=id')).length,3);await shot('legacy-install-message');assert.deepEqual(errors,[]);console.log('PASS real old-schema Home rotation reads, independent missing-column fallback and failed optional creation with retained inputs/no accidental regular day.');await c.close();}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
