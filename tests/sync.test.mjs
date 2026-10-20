import assert from 'node:assert/strict';
import {test,mock} from 'node:test';
import {normalize} from '../dist/store.js';
import {SCHEMA,toUserDoc,toWorkoutDoc,workoutId,fromCloud,hasGuestData,mergeGuest,chunks,debounced,cloudMessage} from '../dist/sync.js';

const workout=(started,id=4)=>({day:'mon',name:'',started,finished:started+3600e3,entries:[{id,sets:[{kg:60,reps:10,done:true}]}]});
const state=(extra={})=>normalize(JSON.stringify({plan:{},weights:[],history:[],...extra}));
const full=()=>state({
 plan:{mon:{name:'Push',items:[{id:4,sets:3,reps:10}]}},
 history:[workout(1000),workout(2000,21)],
 weights:[{date:'2026-10-01',kg:80}],goal:75,
 active:{day:'mon',name:'Push',started:3000,index:0,entries:[{id:4,sets:[{kg:60,reps:10,done:false}]}]},
});

test('user documents carry the schema and update time, not history',()=>{
 const doc=toUserDoc(full(),42);
 assert.equal(doc.schema,SCHEMA);assert.equal(SCHEMA,1);assert.equal(doc.updated,42);
 assert.deepEqual(Object.keys(doc).sort(),['active','goal','plan','schema','updated','weights']);
});

test('round trip through normalize',()=>{
 const s=full();
 assert.deepEqual(normalize(fromCloud(toUserDoc(s),s.history.map(toWorkoutDoc))),s);
});

test('workout ids are the start time',()=>{
 assert.equal(workoutId(workout(1234)),'1234');
});

test('malformed cloud data falls back like localStorage',()=>{
 assert.deepEqual(normalize(fromCloud(null,[])),normalize(null));
 assert.deepEqual(normalize(fromCloud({plan:'x',weights:[{date:'bad',kg:5}]},[{started:'x'},null])),
  normalize(JSON.stringify({plan:'x',weights:[{date:'bad',kg:5}],history:[{started:'x'}]})));
});

test('history is sorted by start time',()=>{
 assert.deepEqual(normalize(fromCloud(null,[workout(3),workout(1)])).history.map(h=>h.started),[1,3]);
});

test('merge adds only guest workouts the account lacks',()=>{
 const {state:s,newWorkouts}=mergeGuest(state({history:[workout(100),workout(200)]}),state({history:[workout(200),workout(300)]}));
 assert.deepEqual(s.history.map(h=>h.started),[100,200,300]);
 assert.deepEqual(newWorkouts.map(h=>h.started),[300]);
});

test('merge keeps account weigh-ins on the same date',()=>{
 const {state:s,newWeights}=mergeGuest(state({weights:[{date:'2026-10-01',kg:80}]}),state({weights:[{date:'2026-10-01',kg:79},{date:'2026-10-02',kg:78}]}));
 assert.deepEqual(s.weights,[{date:'2026-10-01',kg:80},{date:'2026-10-02',kg:78}]);
 assert.equal(newWeights,1);
});

test('merge fills plan, goal and active workout only when the account has none',()=>{
 const guest=full();
 const empty=mergeGuest(state(),guest).state;
 assert.deepEqual(empty.plan,guest.plan);assert.equal(empty.goal,75);assert.deepEqual(empty.active,guest.active);
 const account=state({plan:{fri:{items:[{id:21}]}},goal:90});
 const kept=mergeGuest(account,guest).state;
 assert.deepEqual(kept.plan,account.plan);assert.equal(kept.goal,90);assert.deepEqual(kept.active,guest.active);
});

test('guest data means workouts or weigh-ins',()=>{
 assert.equal(hasGuestData(normalize(null)),false);
 assert.equal(hasGuestData(state({weights:[{date:'2026-10-01',kg:80}]})),true);
 assert.equal(hasGuestData(state({history:[workout(1)]})),true);
});

test('chunks split at 450',()=>{
 assert.deepEqual(chunks(Array(1000).fill(0)).map(c=>c.length),[450,450,100]);
 assert.deepEqual(chunks([]),[]);
});

test('debounced coalesces and flushes',async()=>{
 mock.timers.enable({apis:['setTimeout']});
 try{
  const calls=[],d=debounced(async x=>{calls.push(x);},1000,()=>{});
  d.call(1);d.call(2);d.call(3);assert.equal(d.pending,true);
  mock.timers.tick(999);assert.deepEqual(calls,[]);
  mock.timers.tick(1);assert.deepEqual(calls,[3]);assert.equal(d.pending,false);
  d.call(4);await d.flush();assert.deepEqual(calls,[3,4]);
  mock.timers.tick(1000);assert.deepEqual(calls,[3,4],'a flushed call does not fire again');
  await d.flush();assert.deepEqual(calls,[3,4],'nothing pending, nothing called');
 }finally{mock.timers.reset();}
});

test('debounced reports errors without throwing',async()=>{
 const errors=[],d=debounced(async()=>{throw new Error('denied');},1000,e=>errors.push(e.message));
 d.call(1);await d.flush();
 assert.deepEqual(errors,['denied']);
});

test('cloud errors in plain words',()=>{
 const m=code=>cloudMessage({code});
 assert.equal(m('auth/invalid-email'),'That email address looks wrong.');
 for(const c of ['auth/invalid-action-code','auth/expired-action-code'])assert.equal(m(c),'This sign-in link has expired or was already used. Send a new one.');
 assert.equal(m('auth/too-many-requests'),'Too many attempts. Try again in a few minutes.');
 for(const c of ['auth/network-request-failed','unavailable'])assert.equal(m(c),'You are offline. Try again when connected.');
 assert.equal(m('permission-denied'),'Your account could not be saved. Your changes stay on this screen.');
 assert.equal(m('weird'),'Something went wrong. Try again.');
 assert.equal(cloudMessage(null),'Something went wrong. Try again.');
});
