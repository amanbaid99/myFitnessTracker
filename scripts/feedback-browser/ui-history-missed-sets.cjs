/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
 const failures=[],requests=[];page.on('pageerror',e=>failures.push(e.message));page.on('request',r=>{if(r.url().includes('/rest/v1/')||r.url().includes('/functions/v1/'))requests.push(r.url());});
 await page.goto('http://localhost:3004/demo/missed-sets?before=1');await page.screenshot({path:'docs/ui-evidence/history-missed-sets/before-390.png',fullPage:true});
 await page.goto('http://localhost:3004/demo/missed-sets');
 const press=page.getByRole('region',{name:'Dumbbell press',exact:true});
 await press.getByRole('button',{name:'Add missed set',exact:true}).click();
 const dialog=page.getByRole('dialog');await assert.equal(await dialog.getByLabel('Weight',{exact:true}).inputValue(),'22.5');
 await assert.equal(await dialog.getByLabel('Add-on weight',{exact:true}).inputValue(),'3.75');
 await dialog.getByText('Set 2 ·',{exact:false}).waitFor();
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`docs/ui-evidence/history-missed-sets/form-${width}.png`});}
 await page.setViewportSize({width:390,height:844});
 await context.setOffline(true);await dialog.getByRole('button',{name:'Save missed set',exact:true}).click();await dialog.getByRole('alert').filter({hasText:'needs a connection'}).waitFor();assert.equal(await dialog.getByLabel('Weight',{exact:true}).inputValue(),'22.5');await context.setOffline(false);
 await dialog.getByLabel('Reps',{exact:true}).fill('9');
 // Lose the first successful response, then retry the same UUID.
 let lost=false;
 await page.route('**/rest/v1/rpc/add_missed_set',async route=>{if(lost)return route.continue();lost=true;await route.fetch();await route.abort('failed');});
 await dialog.getByRole('button',{name:'Save missed set',exact:true}).click();await dialog.getByRole('alert').waitFor();
 await dialog.getByRole('button',{name:'Save missed set',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.getByText('Sample data · 6 working sets',{exact:true}).waitFor();
 await page.getByText('Your logged sets changed',{exact:true}).waitFor();
 assert.equal(await press.getByRole('button',{name:/Fix Dumbbell press set/}).count(),3);
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`docs/ui-evidence/history-missed-sets/after-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});
 const dips=page.getByRole('region',{name:'Assisted dips',exact:true});await dips.getByRole('button',{name:'Add missed set',exact:true}).click();await dialog.getByRole('button',{name:'Use bodyweight'}).click();assert.equal(await dialog.getByLabel('Assistance',{exact:true}).inputValue(),'0');await page.screenshot({path:'docs/ui-evidence/history-missed-sets/assistance-390.png'});await dialog.getByRole('button',{name:'Save missed set',exact:true}).click();await dialog.waitFor({state:'hidden'});await page.getByText('Sample data · 7 working sets',{exact:true}).waitFor();
 const plank=page.getByRole('region',{name:'Plank',exact:true});await plank.getByRole('button',{name:'Add missed set',exact:true}).click();await dialog.getByLabel('Seconds held',{exact:true}).fill('45');await dialog.getByLabel('Set type',{exact:true}).selectOption('warmup');await page.screenshot({path:'docs/ui-evidence/history-missed-sets/timed-warmup-390.png'});await dialog.getByRole('button',{name:'Save missed set',exact:true}).click();await dialog.waitFor({state:'hidden'});await plank.getByRole('button',{name:/Fix Plank set W1/}).waitFor();
 assert.equal(requests.filter(u=>u.includes('/functions/')).length,0);
 assert.deepEqual(failures,[]);fs.writeFileSync('docs/ui-evidence/history-missed-sets/browser-results.json',JSON.stringify({viewports:[320,390,430],checks:['gap order','editable prefills','offline retains input','lost-response retry inserts once','stale analysis banner','assistance to bodyweight','timed warmup excluded from working count'],pageErrors:failures},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
