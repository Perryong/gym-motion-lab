import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';
import {groupFor,shortName,buildLibrary} from '../scripts/build-library.mjs';

const GROUPS=['chest','back','shoulders','arms','legs','core'];
const EQUIPMENT=['barbell','dumbbell','cable','leverage machine','smith machine','kettlebell','body weight'];
const entry=(id,over={})=>({id,name:'dumbbell curl',body_part:'upper arms',equipment:'dumbbell',target:'biceps',secondary_muscles:['forearms'],instruction_steps:{en:['Stand tall.','Curl the weights.']},...over});

test('body parts map to the six groups',()=>{
 for(const [bp,g] of [['chest','chest'],['back','back'],['shoulders','shoulders'],['upper arms','arms'],['lower arms','arms'],['upper legs','legs'],['lower legs','legs'],['waist','core'],['cardio',null],['neck',null]])assert.equal(groupFor(bp),g,bp);
});

test('short names drop the leading equipment word',()=>{
 assert.equal(shortName('dumbbell lateral raise'),'Lateral raise');
 assert.equal(shortName('barbell bench press'),'Bench press');
 assert.equal(shortName('push-up'),'Push-up');
});

test('short names keep the equipment when dropping it would clash',()=>{
 const two=[entry('0001',{name:'barbell bent over row'}),entry('0002',{name:'dumbbell bent over row'}),entry('0003',{name:'cable seated row'})];
 assert.deepEqual(buildLibrary(two,{include:['0001','0002','0003'],duplicates:{}}).map(e=>e.short),['Barbell bent over row','Dumbbell bent over row','Seated row']);
});

test('the build refuses entries that break the library rules',()=>{
 const data=[entry('0001'),entry('0002',{equipment:'band'}),entry('0003',{body_part:'cardio'}),entry('0004',{instruction_steps:{en:[]}})];
 const build=(include,duplicates={})=>()=>buildLibrary(data,{include,duplicates});
 assert.throws(build(['9999']),/missing/);
 assert.throws(build(['0002']),/equipment/);
 assert.throws(build(['0003']),/group/);
 assert.throws(build(['0004']),/steps/);
 assert.throws(build(['0001'],{'0001':4}),/duplicate/);
 assert.throws(build(['0001'],{'0005':40}),/3D/);
 assert.deepEqual(buildLibrary(data,{include:['0001'],duplicates:{}}),[{id:'L0001',name:'Dumbbell curl',short:'Curl',group:'arms',equipment:'dumbbell',target:'biceps',secondary:['forearms'],steps:['Stand tall.','Curl the weights.']}]);
});

test('the generated library follows the spec',async()=>{
 const {LIBRARY,LIBRARY_SOURCE}=await import('../dist/library.js');
 const ids=JSON.parse(await readFile(new URL('../scripts/library-ids.json',import.meta.url),'utf8'));
 assert.deepEqual(LIBRARY_SOURCE,{repo:'hasaneyldrm/exercises-dataset',commit:'7455efae41b3',license:'MIT'});
 assert.ok(LIBRARY.length>=130&&LIBRARY.length<=170,`${LIBRARY.length} entries`);
 assert.equal(new Set(LIBRARY.map(e=>e.id)).size,LIBRARY.length,'unique ids');
 const counts={chest:18,back:0,shoulders:0,arms:0,legs:6,core:6};
 for(const e of LIBRARY){
  assert.match(e.id,/^L\d{4}$/);
  for(const k of ['name','short','target'])assert.ok(typeof e[k]==='string'&&e[k].length>1,`${e.id} ${k}`);
  assert.ok(Array.isArray(e.steps)&&e.steps.length&&e.steps.every(s=>typeof s==='string'&&s.length>3),`${e.id} steps`);
  assert.ok(Array.isArray(e.secondary),`${e.id} secondary`);
  assert.ok(GROUPS.includes(e.group),`${e.id} group ${e.group}`);
  assert.ok(EQUIPMENT.includes(e.equipment),`${e.id} equipment ${e.equipment}`);
  assert.ok(!/https?:|\.gif|\.jpe?g/i.test(JSON.stringify(e)),`${e.id} has a media reference`);
  counts[e.group]++;
 }
 for(const g of GROUPS)assert.ok(counts[g]>=15,`${g} has ${counts[g]}`);
 for(const d of Object.keys(ids.duplicates))assert.ok(!LIBRARY.some(e=>e.id==='L'+d),`duplicate ${d} emitted`);
 const shorts=LIBRARY.map(e=>e.short),clash=shorts.filter((s,i)=>shorts.indexOf(s)!==i);
 assert.deepEqual(clash,[],'short names must tell exercises apart');
});
