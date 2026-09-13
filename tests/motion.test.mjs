import {test} from 'node:test';
import assert from 'node:assert/strict';
import {poseAt,solveArm} from '../dist/motion.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('all nine motions keep finite joints and anatomically connected arms throughout each repetition',()=>{
 for(let id=0;id<9;id++) for(let f=0;f<=100;f++) {
  const p=poseAt(id,f/100);
  for(const side of [-1,1]){
   const {shoulder,hand,pole}=p.arms(side); const elbow=solveArm(shoulder,hand,pole);
   assert.ok([...shoulder,...hand,...elbow].every(Number.isFinite));
   assert.ok(Math.abs(distance(shoulder,elbow)-.44)<1e-6,`upper arm ${id}`);
   assert.ok(Math.abs(distance(hand,elbow)-.44)<1e-6,`forearm ${id}`);
  }
 }
});
test('push-up hands and feet stay planted while torso moves',()=>{
 const a=poseAt(6,0),b=poseAt(6,.5);
 assert.deepEqual(a.arms(1).hand,b.arms(1).hand);
 assert.deepEqual(a.ankles,b.ankles);
 assert.notDeepEqual(a.hip,b.hip);
});
test('every exercise loops continuously',()=>{
 for(let id=0;id<9;id++) assert.deepEqual(poseAt(id,0).arms(1),poseAt(id,1).arms(1));
});

test('reference expansion includes 18 exercises with connected arm motion',async()=>{
 const {exercises,displayOrder}=await import('../dist/exercises.js');
 assert.equal(displayOrder.length,18);
 assert.ok(!displayOrder.includes(10)&&!displayOrder.includes(12));
 assert.equal(exercises.filter(Boolean).length,18);
 for(const id of displayOrder)for(let f=0;f<=100;f++){
  const p=poseAt(id,f/100);
  for(const s of [-1,1]){
   const a=p.arms(s),elbow=solveArm(a.shoulder,a.hand,a.pole);
   assert.ok(Math.abs(distance(a.shoulder,elbow)-.44)<1e-6,`shoulder ${id} ${f}`);
   assert.ok(Math.abs(distance(a.hand,elbow)-.44)<1e-6,`hand ${id} ${f}`);
  }
 }
});
test('new push-up variants have stationary hands and feet',()=>{
 for(const id of [9,15,19]){
  const a=poseAt(id,0),b=poseAt(id,.5);
  assert.deepEqual(a.arms(1).hand,b.arms(1).hand);
  assert.deepEqual(a.ankles,b.ankles);
  assert.notDeepEqual(a.hip,b.hip);
 }
});
