import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GROUPS,catalogIds,exerciseById,isExerciseId,parseExerciseId,filterExercises} from '../dist/catalog.js';
import {LIBRARY} from '../dist/library.js';

test('six groups in display order',()=>{
 assert.deepEqual(GROUPS,[{key:'chest',label:'Chest'},{key:'back',label:'Back'},{key:'shoulders',label:'Shoulders'},{key:'arms',label:'Arms'},{key:'legs',label:'Legs'},{key:'core',label:'Core'}]);
});

test('the catalog lists the 30 3D exercises first, then the library, once each',()=>{
 assert.equal(catalogIds.length,30+LIBRARY.length);
 assert.equal(new Set(catalogIds).size,catalogIds.length);
 assert.ok(catalogIds.slice(0,30).every(Number.isInteger));
 assert.deepEqual(catalogIds.slice(30),LIBRARY.map(e=>e.id));
});

test('lookups return one shape for 3D and library exercises',()=>{
 const crunch=exerciseById(26);
 assert.equal(crunch.group,'core');assert.equal(crunch.has3d,true);assert.equal(crunch.target,'Rectus abdominis');
 assert.ok(Array.isArray(crunch.secondary)&&crunch.secondary.length>0);
 const lib=exerciseById(LIBRARY[0].id);
 assert.equal(lib.has3d,false);assert.equal(lib.name,LIBRARY[0].name);assert.deepEqual(lib.steps,LIBRARY[0].steps);
 for(const bad of [999,'L9999','4',null,undefined])assert.equal(exerciseById(bad),null,String(bad));
 assert.equal(isExerciseId(26),true);assert.equal(isExerciseId(LIBRARY[0].id),true);assert.equal(isExerciseId('26'),false);assert.equal(isExerciseId(10),false);
});

test('route text parses to a known exercise id or null',()=>{
 assert.equal(parseExerciseId('4'),4);
 assert.equal(parseExerciseId(LIBRARY[0].id),LIBRARY[0].id);
 for(const bad of ['L9999','Lfoo','','999','4.5','10',undefined])assert.equal(parseExerciseId(bad),null,String(bad));
});

test('filters by group, 3D and search',()=>{
 assert.equal(filterExercises({only3d:true}).length,30);
 const core=filterExercises({group:'core'});
 assert.ok(core.includes(26));assert.ok(core.every(id=>exerciseById(id).group==='core'));
 const lib=LIBRARY.find(e=>e.secondary.length),muscle=lib.secondary[0].toUpperCase();
 assert.ok(filterExercises({query:muscle}).includes(lib.id),`search "${muscle}" finds ${lib.id}`);
 assert.ok(filterExercises({group:'back',only3d:true}).length===0,'no 3D back exercises yet');
 assert.equal(filterExercises({}).length,catalogIds.length);
});
