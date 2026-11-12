/* eslint-disable @typescript-eslint/no-require-imports */
// Run with NODE_OPTIONS=--conditions=react-server against the throwaway clone only.
require('tsx/cjs');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {getRoutines,getExerciseLibrary,getWorkoutSets,getAssistedProgress}=require('../../lib/data.ts');
const {getPreviousSessions}=require('../../lib/previous-sessions.ts');
const base='http://127.0.0.1:55438',owner='aaaaaaaa-0000-4000-8000-000000000001',exercise='aaaaaaaa-0000-4000-8000-000000000004',workout='aaaaaaaa-0000-4000-8000-000000000007';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const input=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role:'authenticated',sub:owner,exp:2000000000}),token=input+'.'+crypto.createHmac('sha256','local-assisted-test-signing-key-at-least-32-characters').update(input).digest('base64url');
const db=createClient(base,token,{auth:{persistSession:false},global:{fetch:(url,init)=>{assert(String(url).startsWith(base+'/rest/v1/'));return fetch(String(url).replace('/rest/v1/','/'),init);}}});
(async()=>{const [routines,library,sets,previous,progress]=await Promise.all([getRoutines(db,'aaaaaaaa-0000-4000-8000-000000000002'),getExerciseLibrary(db),getWorkoutSets(db,workout),getPreviousSessions(db,[exercise],workout),getAssistedProgress(db)]);assert.equal(routines[0].exercises[0].exercise.loadMode,'standard');assert(library.length);assert(sets.length);assert.equal(sets[0].assistanceKg,null);assert.equal(previous.get(exercise)[0].assistanceKg,null);assert.deepEqual(progress,[]);console.log('PASS actual previous-schema PostgREST: routines, alternates/library, workout sets, previous sessions and missing-assisted-view fallback. No hosted requests.');})().catch(e=>{console.error(e);process.exit(1)});
