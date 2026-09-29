import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {exercises,displayOrder,groups,allIds,GROUP_META,groupFromHash}=await import('../dist/exercises.js');
const BODY=[20,21,22,23,24,25,26,27,28,29,30,31];

test('legs and abs groups hold six exercises each with complete copy',()=>{
 assert.deepEqual(groups.chest,displayOrder);
 assert.deepEqual(groups.legs,[20,21,22,23,24,25]);
 assert.deepEqual(groups.abs,[26,27,28,29,30,31]);
 assert.deepEqual(allIds,[...displayOrder,...BODY]);
 for(const id of allIds){const e=exercises[id];assert.ok(e,`missing ${id}`);assert.ok(['chest','legs','abs'].includes(e.group));}
 for(const id of BODY){const e=exercises[id];
  for(const key of ['name','short','equipment','type','focus','secondary','desc','cue','avoid'])assert.ok(typeof e[key]==='string'&&e[key].length>2,`${id} ${key}`);
  assert.equal(e.steps.length,3);assert.equal(e.breath.length,2);assert.equal(e.stance.length,2);
  assert.equal(e.labels[0][0],0);for(let i=1;i<e.labels.length;i++)assert.ok(e.labels[i][0]>e.labels[i-1][0]&&e.labels[i][0]<1);
 }
 for(const g of ['chest','legs','abs'])assert.ok(GROUP_META[g].title&&GROUP_META[g].link[0].startsWith('https://'));
});

test('group hash parsing is case-insensitive and falls back to chest',()=>{
 assert.equal(groupFromHash('#legs'),'legs');assert.equal(groupFromHash('#Legs'),'legs');assert.equal(groupFromHash('ABS'),'abs');
 for(const h of ['','#','#back','#toString',undefined,null])assert.equal(groupFromHash(h),'chest');
});
