import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DAYS,dayKey,normalize,addToPlan,removeFromPlan,startWorkout,finishWorkout,lastKg} from '../dist/store.js';

test('empty or corrupt storage gives an empty week',()=>{
 for(const raw of [null,'','{bad',JSON.stringify({plan:5,history:'x'})]){
  const s=normalize(raw);
  assert.deepEqual(Object.keys(s.plan),DAYS);
  assert.ok(DAYS.every(d=>s.plan[d].items.length===0));
  assert.deepEqual(s.history,[]);assert.equal(s.active,null);
 }
});

test('stored data keeps valid exercises and drops unknown ids',()=>{
 const s=normalize(JSON.stringify({plan:{mon:{name:'Push',items:[{id:4,sets:3,reps:10},{id:999,sets:3,reps:10},{id:0,sets:-2,reps:'x'}]}}}));
 assert.equal(s.plan.mon.name,'Push');
 assert.deepEqual(s.plan.mon.items.map(i=>i.id),[4,0]);
 assert.deepEqual(s.plan.mon.items[1],{id:0,sets:3,reps:10});
});

test('sunday maps to sun and monday to mon',()=>{
 assert.equal(dayKey(new Date(2026,9,11)),'sun');
 assert.equal(dayKey(new Date(2026,9,12)),'mon');
});

test('plan edits add and remove exercises',()=>{
 const s=normalize(null);
 addToPlan(s,'wed',20);addToPlan(s,'wed',21);removeFromPlan(s,'wed',0);
 assert.deepEqual(s.plan.wed.items,[{id:21,sets:3,reps:10}]);
 assert.throws(()=>addToPlan(s,'wed',999));
});

test('a workout prefills weight from history and stores only done sets',()=>{
 const s=normalize(null);addToPlan(s,'mon',4);addToPlan(s,'mon',9);
 s.history.push({day:'mon',name:'',started:1,finished:2,entries:[{id:4,sets:[{kg:20,reps:8,done:true},{kg:22.5,reps:6,done:true}]}]});
 assert.equal(lastKg(s.history,4),22.5);
 startWorkout(s,'mon',10);
 assert.deepEqual(s.active.entries[0].sets[0],{kg:22.5,reps:10,done:false});
 assert.equal(s.active.entries[1].sets[0].kg,null);
 s.active.entries[0].sets[1].done=true;
 finishWorkout(s,20);
 assert.equal(s.active,null);assert.equal(s.history.length,2);
 assert.deepEqual(s.history[1].entries,[{id:4,sets:[{kg:22.5,reps:10,done:true}]}]);
});

test('finishing with nothing done discards the workout',()=>{
 const s=normalize(null);addToPlan(s,'fri',22);startWorkout(s,'fri',1);finishWorkout(s,2);
 assert.equal(s.active,null);assert.equal(s.history.length,0);
});

test('an empty day cannot start a workout',()=>{
 assert.throws(()=>startWorkout(normalize(null),'tue',1));
});

test('body weight logs one entry per day and validates range',async()=>{
 const {logWeight,setGoal}=await import('../dist/store.js');
 const s=normalize(null);
 assert.deepEqual(s.weights,[]);assert.equal(s.goal,null);
 logWeight(s,'2026-10-10',78.44);logWeight(s,'2026-10-01',79);logWeight(s,'2026-10-10',78.2);
 assert.deepEqual(s.weights,[{date:'2026-10-01',kg:79},{date:'2026-10-10',kg:78.2}]);
 assert.throws(()=>logWeight(s,'2026-10-11',5));assert.throws(()=>logWeight(s,'yesterday',70));
 setGoal(s,77);assert.equal(s.goal,77);setGoal(s,null);assert.equal(s.goal,null);assert.throws(()=>setGoal(s,1000));
});

test('stored weights are validated and deduplicated',()=>{
 const s=normalize(JSON.stringify({goal:'x',weights:[{date:'2026-10-02',kg:80},{date:'bad',kg:70},{date:'2026-10-01',kg:999},{date:'2026-10-02',kg:79.5},{date:'2026-09-30',kg:81}]}));
 assert.deepEqual(s.weights,[{date:'2026-09-30',kg:81},{date:'2026-10-02',kg:79.5}]);
 assert.equal(s.goal,null);
});

test('a backup round-trips the whole state',async()=>{
 const {exportBackup,readBackup,logWeight}=await import('../dist/store.js');
 const s=normalize(null);addToPlan(s,'mon',4);s.plan.mon.name='Push';logWeight(s,'2026-10-01',80);s.goal=77;
 s.history.push({day:'mon',name:'Push',started:1,finished:2,entries:[{id:4,sets:[{kg:60,reps:10,done:true}]}]});
 const text=exportBackup(s,Date.UTC(2026,9,13));
 const file=JSON.parse(text);assert.equal(file.app,'form-gym');assert.equal(file.version,1);assert.equal(file.exported,'2026-10-13T00:00:00.000Z');
 assert.deepEqual(readBackup(text),s);
});

test('restoring rejects files that are not FORM backups and cleans bad data',async()=>{
 const {readBackup}=await import('../dist/store.js');
 for(const bad of ['','not json','{}',JSON.stringify({app:'other',version:1,data:{}}),JSON.stringify({app:'form-gym',version:2,data:{}})])assert.throws(()=>readBackup(bad),/backup/i);
 const s=readBackup(JSON.stringify({app:'form-gym',version:1,data:{plan:{mon:{items:[{id:999},{id:4}]}},weights:[{date:'nope',kg:70}]}}));
 assert.deepEqual(s.plan.mon.items.map(i=>i.id),[4]);assert.deepEqual(s.weights,[]);
});

test('library exercise ids are kept in plans, history, workouts and backups',async()=>{
 const {LIBRARY}=await import('../dist/library.js'),{readBackup,exportBackup}=await import('../dist/store.js');
 const lib=LIBRARY[0].id,s=normalize(null);
 addToPlan(s,'mon',lib);assert.deepEqual(s.plan.mon.items,[{id:lib,sets:3,reps:10}]);
 const raw=JSON.stringify({plan:{tue:{items:[{id:lib},{id:'L9999'},{id:4}]}},history:[{day:'tue',started:1,finished:2,entries:[{id:lib,sets:[{kg:10,reps:8,done:true}]},{id:'L9999',sets:[]}]}],active:{day:'tue',entries:[{id:lib,sets:[{kg:null,reps:8,done:false}]}]}});
 const n=normalize(raw);
 assert.deepEqual(n.plan.tue.items.map(i=>i.id),[lib,4]);
 assert.deepEqual(n.history[0].entries.map(e=>e.id),[lib]);
 assert.deepEqual(n.active.entries.map(e=>e.id),[lib]);
 assert.deepEqual(readBackup(exportBackup(n)).plan.tue.items.map(i=>i.id),[lib,4]);
});

test('old saved data with only 3D exercise ids loads unchanged',()=>{
 const old={plan:{mon:{name:'Push',items:[{id:4,sets:3,reps:10},{id:26,sets:2,reps:15}]},tue:{name:'',items:[]},wed:{name:'',items:[]},thu:{name:'',items:[]},fri:{name:'',items:[]},sat:{name:'',items:[]},sun:{name:'',items:[]}},
  history:[{day:'mon',name:'Push',started:1,finished:2,entries:[{id:4,sets:[{kg:60,reps:10,done:true}]}]}],active:null,weights:[{date:'2026-10-01',kg:80}],goal:77};
 assert.deepEqual(normalize(JSON.stringify(old)),old);
});

test('saved data and backups with replaced library ids carry over to the 3D exercises',async()=>{
 const {readBackup,exportBackup}=await import('../dist/store.js');
 const raw={plan:{mon:{name:'Pull',items:[{id:'L0027',sets:4,reps:8},{id:'L0861',sets:3,reps:12}]}},
  history:[{day:'mon',name:'Pull',started:1,finished:2,entries:[{id:'L0027',sets:[{kg:50,reps:8,done:true}]},{id:'L0861',sets:[{kg:40,reps:12,done:true}]}]}],
  active:{day:'mon',entries:[{id:'L0861',sets:[{kg:40,reps:12,done:false}]}]}};
 const n=normalize(JSON.stringify(raw));
 assert.deepEqual(n.plan.mon.items,[{id:33,sets:4,reps:8},{id:34,sets:3,reps:12}]);
 assert.deepEqual(n.history[0].entries,[{id:33,sets:[{kg:50,reps:8,done:true}]},{id:34,sets:[{kg:40,reps:12,done:true}]}]);
 assert.deepEqual(n.active.entries.map(e=>e.id),[34]);
 assert.deepEqual(readBackup(JSON.stringify({app:'form-gym',version:1,data:raw})).history[0].entries.map(e=>e.id),[33,34]);
});

test('saved shoulder and arm library entries carry over to their 3D exercises',async()=>{
 const {readBackup}=await import('../dist/store.js');
 const raw={plan:{tue:{name:'Arms',items:[{id:'L0294',sets:3,reps:10},{id:'L0201',sets:3,reps:12},{id:'L0426',sets:4,reps:8}]}},
  history:[{day:'tue',name:'Arms',started:1,finished:2,entries:[{id:'L0294',sets:[{kg:12,reps:10,done:true},{kg:12,reps:9,done:true}]},{id:'L0334',sets:[{kg:8,reps:12,done:true}]}]}]};
 const n=normalize(JSON.stringify(raw));
 assert.deepEqual(n.plan.tue.items.map(i=>i.id),[38,40,35]);
 assert.deepEqual(n.history[0].entries,[{id:38,sets:[{kg:12,reps:10,done:true},{kg:12,reps:9,done:true}]},{id:36,sets:[{kg:8,reps:12,done:true}]}]);
 assert.deepEqual(readBackup(JSON.stringify({app:'form-gym',version:1,data:raw})).plan.tue.items.map(i=>i.id),[38,40,35]);
});
