import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GROUPS,catalogIds,exerciseById,isExerciseId,parseExerciseId,filterExercises,routeFor,ALIASES,resolveExerciseId} from '../dist/catalog.js';
import {LIBRARY} from '../dist/library.js';
import {allIds,groups} from '../dist/exercises.js';

test('six groups in display order',()=>{
 assert.deepEqual(GROUPS,[{key:'chest',label:'Chest'},{key:'back',label:'Back'},{key:'shoulders',label:'Shoulders'},{key:'arms',label:'Arms'},{key:'legs',label:'Legs'},{key:'core',label:'Core'}]);
});

test('the catalog lists the 30 3D exercises first, then the library, once each',()=>{
 assert.equal(catalogIds.length,allIds.length+LIBRARY.length);
 assert.equal(new Set(catalogIds).size,catalogIds.length);
 assert.ok(catalogIds.slice(0,allIds.length).every(Number.isInteger));
 assert.deepEqual(catalogIds.slice(allIds.length),LIBRARY.map(e=>e.id));
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
 assert.equal(filterExercises({only3d:true}).length,allIds.length);
 assert.equal(exerciseById(32).group,'back');assert.ok(exerciseById(32).has3d);
 const core=filterExercises({group:'core'});
 assert.ok(core.includes(26));assert.ok(core.every(id=>exerciseById(id).group==='core'));
 const lib=LIBRARY.find(e=>e.secondary.length),muscle=lib.secondary[0].toUpperCase();
 assert.ok(filterExercises({query:muscle}).includes(lib.id),`search "${muscle}" finds ${lib.id}`);
 assert.deepEqual(filterExercises({group:'back',only3d:true}),groups.back);
 assert.equal(filterExercises({}).length,catalogIds.length);
});

test('routes keep old links working and send bad exercise ids to the list',()=>{
 const lib=LIBRARY[0].id;
 for(const [hash,want] of [['#abs',['exercises','core']],['#chest',['exercises','chest']],['#legs',['exercises','legs']],['#exercises/back',['exercises','back']],['#exercises/abs',['exercises','core']],['#exercises/chest',['exercises','chest']],['#exercises/nope',['exercises']],
  ['#exercise/L9999',['exercises']],['#exercise/Lfoo',['exercises']],['#exercise/4',['exercise',4]],['#exercise/'+lib,['exercise',lib]],
  ['',['home']],['#nonsense',['home']],['#home',['home']],['#stats',['stats']],['#plan',['plan']],['#workout',['workout']],['#exercises',['exercises']]])
  assert.deepEqual(routeFor(hash),want,hash);
});

test('replaced library ids resolve to their 3D exercises',()=>{
 assert.deepEqual(ALIASES,{L0027:33,L0861:34,L0426:35,L0334:36,L0378:37,L0294:38,L0313:39,L0201:40});
 for(const [from,to] of Object.entries(ALIASES))assert.equal(resolveExerciseId(from),to);
 assert.deepEqual(routeFor('#exercise/L0201'),['exercise',40]);
 assert.equal(resolveExerciseId('L0027'),33);assert.equal(resolveExerciseId('L0861'),34);assert.equal(resolveExerciseId(4),4);assert.equal(resolveExerciseId('L9999'),'L9999');
 assert.deepEqual(routeFor('#exercise/L0861'),['exercise',34]);assert.deepEqual(routeFor('#exercise/L0027'),['exercise',33]);
 assert.equal(parseExerciseId('L0027'),33);
});

test('library exercises show muscle and equipment names in sentence case',()=>{
 for(const id of catalogIds.filter(id=>typeof id==='string')){const e=exerciseById(id);
  for(const text of [e.target,e.equipment,...e.secondary])assert.equal(text[0],text[0].toUpperCase(),`${id} "${text}"`);}
});
