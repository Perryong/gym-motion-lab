import {test} from 'node:test';
import assert from 'node:assert/strict';
import {poseAt,THIGH,SHIN,HIP} from '../dist/motion.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('the same athlete keeps fixed thigh, shin and torso lengths in all 20 exercises',()=>{
 for(let id=0;id<20;id++)for(let f=0;f<=40;f++){
  const p=poseAt(id,f/40),center=p.arms(1).shoulder.map((n,i)=>(n+p.arms(-1).shoulder[i])/2);
  assert.ok(Math.abs(distance(center,p.hip)-.8)<1e-6,`torso ${id} ${f}`);
  for(let i=0;i<2;i++){
   const hip=[(i?1:-1)*HIP,p.hip[1],p.hip[2]];
   assert.ok(Math.abs(distance(hip,p.knees[i])-THIGH)<1e-6,`thigh ${id} ${f}`);
   assert.ok(Math.abs(distance(p.knees[i],p.ankles[i])-SHIN)<1e-6,`shin ${id} ${f}`);
  }
 }
});
