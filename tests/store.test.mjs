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
