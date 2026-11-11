/* eslint-disable @typescript-eslint/no-require-imports */
// Local PostgREST + real migrations + the actual Edge handler logic. Provider is a fixture.
require('tsx/cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {analyzeWorkout,loadWorkout,readRows}=require('../../supabase/functions/analyze-workout/analyze.ts');
const {loadAnalysisContext}=require('../../supabase/functions/analyze-workout/context.ts');
const {analysisWeek}=require('../../lib/analysis-week.ts');
const base='http://127.0.0.1:55434',owner='77777777-7777-4777-8777-777777777777',workout='77777777-0000-4000-8000-000000000011';
const claims=Buffer.from(JSON.stringify({role:'service_role',exp:Math.floor(Date.now()/1000)+600})).toString('base64url'),header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const token=header+'.'+claims+'.'+crypto.createHmac('sha256','local-analysis-test-signing-key-with-at-least-32-characters').update(header+'.'+claims).digest('base64url');
const env={SUPABASE_URL:base,SUPABASE_SERVICE_ROLE_KEY:token,OPENROUTER_API_KEY:'local-provider-fixture'};
const prompts=[];const detail={highlights:['Bench increased from 80kg to 82.5kg for ten reps.'],watch:'More sessions are needed for a trend.',nextFocus:'Repeat the next planned target.'};
const transport=async(url,init)=>{
 if(String(url).startsWith('https://openrouter.ai/')){prompts.push(JSON.parse(init.body));return Response.json({model:'fixture',choices:[{message:{content:JSON.stringify({title:'Bench moving steadily',summary:'A heavier repeat set is a useful signal, with further sessions needed.',analysis:detail,longerTerm:{title:'A useful baseline',summary:'Repeated sessions give a reference for future weeks.',...detail}})}}]});}
 assert(String(url).startsWith(base+'/rest/v1/'),'Unexpected nonlocal request');const response=await fetch(String(url).replace(base+'/rest/v1/',base+'/'),init);if(!response.ok){const copy=response.clone();throw Error(`${String(url)} ${response.status} ${await copy.text()}`);}return response;
};
(async()=>{
 const data=await loadWorkout(env,transport,workout);assert.equal(data.dayName,'Renamed press');assert.equal(data.bodyWeightKg,70);assert.equal(data.last['Bench Press'][0].weightKg,80);assert.equal(data.bestBefore['Bench Press'],80);
 const context=await loadAnalysisContext(path=>readRows(env,transport,path),owner,analysisWeek(data.startedAt));
 assert.equal(context.basis.sessions,2);assert.equal(context.basis.comparableLifts,1);assert(context.text.includes('1825 kg x reps'));assert(!context.text.includes('Private lift'));assert(context.text.includes('saved goal 5'));
 const messages=[];assert.equal(await analyzeWorkout(env,transport,workout,(...args)=>messages.push(args)),'saved');assert.equal(prompts.length,2);assert(!JSON.stringify(prompts).includes('trainer@example.test'));assert(!JSON.stringify(prompts).includes(owner));assert(prompts[1].messages[1].content.includes('Goal-qualifying sessions: 1'));
 const saved=await readRows(env,transport,`insights?user_id=eq.${owner}&select=kind,details`);assert.equal(saved.length,2);assert(saved.every(r=>r.details.analysisVersion===2));assert(saved.find(r=>r.kind==='weekly_review').details.longerTerm);assert(saved.find(r=>r.kind==='workout_review').details.analysis);
 console.log('PASS actual local PostgREST: owner-scoped SQL history/metrics, earlier-only session comparisons, dated weight, quick-log goal rule, two model requests, private-text redaction and persisted session/weekly/four-week details. No hosted data/provider requests.');
})().catch(e=>{console.error(e);process.exit(1)});
