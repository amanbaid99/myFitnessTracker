/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const stage=process.argv[2]||'after',directory='app/demo/tmp-strength',fixture=directory+'/page.tsx',folder='docs/ui-evidence/phase-2-strength';
assert(!fs.existsSync(fixture),'A local fixture already exists');fs.mkdirSync(directory,{recursive:true});fs.copyFileSync('scripts/feedback-browser/fixtures/strength-preview.tsx',fixture);fs.mkdirSync(folder,{recursive:true});
process.on('exit',()=>{fs.unlinkSync(fixture);fs.rmdirSync(directory);});
(async()=>{const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
await context.addCookies([{name:'wt-theme',value:'beige.orange',domain:'localhost',path:'/'}]);
async function visit(state='populated',units='kg'){for(let i=0;i<10;i++){const response=await page.goto(`http://localhost:3003/demo/tmp-strength?state=${state}&units=${units}&now=${encodeURIComponent(new Date().toISOString())}`,{waitUntil:'domcontentloaded'});if(response.ok())break;await page.waitForTimeout(250);}await page.getByRole('heading',{name:'Strength trends',exact:true}).waitFor();}
async function snap(name,width=390){await page.setViewportSize({width,height:844});await page.screenshot({path:`${folder}/${stage}-${name}-${width}.png`,fullPage:true});if(stage==='after')assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow: ${name} ${width}`);}
await visit();for(const width of [390,320,430])await snap('populated',width);
if(stage==='after'){
 await page.setViewportSize({width:390,height:844});
 const bench=page.getByRole('link').filter({hasText:'Bench Press'});assert.equal(await bench.getAttribute('href'),'/demo/progress/sample-0');assert((await bench.boundingBox()).y<650,'Exercise list buried');
 await page.getByText('One session; trend not available',{exact:true}).waitFor();
 await page.getByLabel('Search exercises',{exact:true}).fill('Bench');await page.getByLabel('Strength period').selectOption('4');await page.getByLabel('Sort exercises').selectOption('change');await page.getByRole('tab',{name:'Strength'}).focus();await page.keyboard.press('End');await page.keyboard.press('Home');assert.equal(await page.getByLabel('Search exercises',{exact:true}).inputValue(),'Bench');assert.equal(await page.getByLabel('Strength period').inputValue(),'4');assert.equal(await page.getByLabel('Sort exercises').inputValue(),'change');assert.equal(await page.getByRole('link').filter({hasText:'Bench Press'}).count(),1);await snap('filtered');
 await page.getByLabel('Search exercises',{exact:true}).fill('No matching exercise');await page.getByText('No matching sessions.',{exact:false}).waitFor();await snap('no-matches');await page.getByRole('button',{name:'Show all exercises',exact:true}).click();assert.equal(await page.getByLabel('Strength period').inputValue(),'all');await page.getByRole('link').filter({hasText:'Older sessions only'}).waitFor();
 await page.getByText('About strength trends',{exact:true}).focus();await page.keyboard.press('Enter');await page.getByText(/a missing estimate is not zero progress/).waitFor();await snap('method');
 await page.getByText('Training overview',{exact:true}).click();await page.getByRole('region',{name:'Progress summary'}).waitFor();await snap('overview');await page.getByText('Weekly volume reports',{exact:true}).click();await page.getByText('Weekly reports are not available yet.',{exact:false}).waitFor();await bench.waitFor();await snap('optional-report-error');
 await context.setOffline(true);await page.getByLabel('Sort exercises').selectOption('name');await page.getByLabel('Search exercises',{exact:true}).fill('Bench');await bench.waitFor();await snap('offline-filter');await context.setOffline(false);
 await visit('empty');await snap('empty');
 await visit('populated','lb');await snap('pounds');assert((await page.locator('body').innerText()).includes('lb'));
 await page.setViewportSize({width:320,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await page.getByText('Training overview',{exact:true}).click();await snap('large-text',320);await page.evaluate(()=>document.documentElement.style.fontSize='');
 for(const theme of ['dark','light','beige']){await page.evaluate(theme=>document.documentElement.setAttribute('data-base',theme),theme);await snap('theme-'+theme);}
 await visit();await page.getByRole('link').filter({hasText:'Bench Press'}).click();await page.waitForURL('**/demo/progress/sample-0');await page.getByRole('heading',{name:'Estimated 1RM per session',exact:true}).waitFor();assert(!(await page.locator('body').innerText()).includes('404'));
}
if(stage==='after'){
 const pendingContext=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),pending=await pendingContext.newPage();
 await pending.goto('http://localhost:3003/demo/tmp-strength',{waitUntil:'domcontentloaded'});await pending.getByRole('tablist').waitFor();await pending.screenshot({path:`${folder}/after-before-hydration-390.png`,fullPage:true});await pendingContext.close();
}
assert.deepEqual(errors,[]);await browser.close();console.log(`PASS ${stage}: strength layouts, states and interactions`);})().catch(error=>{console.error(error);process.exit(1)});
