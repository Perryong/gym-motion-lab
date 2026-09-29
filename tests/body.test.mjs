import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const {exercises,displayOrder,groups,allIds,GROUP_META,groupFromHash}=await import('../dist/exercises.js');
const BODY=[20,21,22,23,24,25,26,27,28,29,30,31],ANKLE_H=.2;

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

const THREE=await import('../dist/vendor/three.module.js');
const {poseAt,solveArm,THIGH,SHIN,HIP}=await import('../dist/motion.js');
const {makeSkeleton,applyRigPose}=await import('../dist/rig.js');
const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
function rig(){const {map}=makeSkeleton(),group=new THREE.Group();group.add(map.Hips);return {group,map};}
const built=new Set(Object.keys(await import('../dist/motion-body.js').then(m=>m.BODY_IDS??{})).map(Number));
const ready=ids=>ids.filter(id=>built.has(id));

test('body poses keep FK shoulders, fixed limb lengths and reachable arms',()=>{
 for(const id of ready(BODY))for(let f=0;f<=40;f++){
  const p=poseAt(id,f/40),{group,map}=rig();applyRigPose(group,map,id,f/40);
  for(const s of [-1,1]){
   const n=s<0?'L':'R',bone=map[n+'_UpperArm'].getWorldPosition(new THREE.Vector3()).toArray();
   assert.ok(dist(bone,p.arms(s).shoulder)<1e-6,`FK shoulder ${id} ${f} ${n}`);
   const a=p.arms(s);assert.ok(dist(a.shoulder,a.hand)<=.88+1e-9,`unreachable hand ${id} ${f}`);
   const hand=map[n+'_Hand'].getWorldPosition(new THREE.Vector3()).toArray();assert.ok(dist(hand,a.hand)<1e-6,`hand contact ${id} ${f}`);
   const i=s<0?0:1,hip=[s*HIP,p.hip[1],p.hip[2]];
   assert.ok(Math.abs(dist(hip,p.knees[i])-THIGH)<1e-6,`thigh ${id} ${f}`);
   assert.ok(Math.abs(dist(p.knees[i],p.ankles[i])-SHIN)<1e-6,`shin ${id} ${f}`);
   const foot=map[n+'_Foot'].getWorldPosition(new THREE.Vector3()).toArray();assert.ok(dist(foot,p.ankles[i])<1e-6,`ankle contact ${id} ${f}`);
  }
 }
 assert.ok(built.has(20),'back squat implemented');
});

test('body clips loop without a jump',()=>{
 for(const id of ready(BODY)){const a=poseAt(id,0),b=poseAt(id,1);
  for(const s of [-1,1])assert.ok(dist(a.arms(s).hand,b.arms(s).hand)<1e-9,`hand loop ${id}`);
  assert.ok(dist(a.hip,b.hip)<1e-9,`hip loop ${id}`);a.ankles.forEach((x,i)=>assert.ok(dist(x,b.ankles[i])<1e-9,`ankle loop ${id}`));
 }
});

test('squats, deadlift and bridge keep their feet planted',()=>{
 for(const id of ready([20,21,23,24,26]))for(let f=1;f<=20;f++)
  poseAt(id,f/20).ankles.forEach((x,i)=>assert.ok(dist(x,poseAt(id,0).ankles[i])<1e-9,`foot slid ${id} ${f}`));
});

test('rig applies body spine bends, palm directions and foot modes',async()=>{
 // A synthetic pose that differs from every chest default: bent/twisted spine, sideways palms, raised heels.
 const {BODY_IDS}=await import('../dist/motion-body.js');
 BODY_IDS[99]=u=>({...BODY_IDS[20](u),spine:{Spine:[.2,0,.1],Chest:[.3,.1,.2],ShoulderLine:[-.1,0,.15]},footPitch:[.4,.5],hands:s=>({palm:[s,0,0],fingers:'open'})});
 for(const id of [...ready(BODY),99])for(const phase of [.25,.5]){
  const p=poseAt(id,phase),{group,map}=rig();applyRigPose(group,map,id,phase);
  for(const b of ['Spine','Chest','ShoulderLine']){const [flex=0,side=0,twist=0]=p.spine[b]??[],q=new THREE.Quaternion().setFromEuler(new THREE.Euler(flex,twist,side,'YXZ'));assert.ok(map[b].quaternion.angleTo(q)<1e-6,`spine ${b} ${id}`);}
  for(const s of [-1,1]){const n=s<0?'L':'R',q=map[n+'_Hand'].getWorldQuaternion(new THREE.Quaternion());
   const fingers=new THREE.Vector3(0,1,0).applyQuaternion(q),palm=new THREE.Vector3(...p.hands(s).palm);palm.addScaledVector(fingers,-palm.dot(fingers)).normalize();
   assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(q).dot(palm)>.999,`palm ${id} ${n}`);
   const foot=map[n+'_Foot'].getWorldQuaternion(new THREE.Quaternion()),want=p.feet==='shin'?map[n+'_Shin'].getWorldQuaternion(new THREE.Quaternion()):new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),p.footPitch[s<0?0:1]);
   assert.ok(foot.angleTo(want)<1e-6,`foot ${id} ${n}`);}
 }
 delete BODY_IDS[99];
});

test('all six leg exercises are implemented',()=>{for(const id of [20,21,22,23,24,25])assert.ok(built.has(id),`leg pose ${id}`);});

test('calf raise pivots about a fixed forefoot contact on the step',()=>{
 const contact=(p,i)=>{const a=p.footPitch[i],c=[0,-.2,.15];return [p.ankles[i][0],p.ankles[i][1]+c[1]*Math.cos(a)-c[2]*Math.sin(a),p.ankles[i][2]+c[1]*Math.sin(a)+c[2]*Math.cos(a)];};
 const base=poseAt(25,0);
 for(let f=0;f<=20;f++){const p=poseAt(25,f/20);for(const i of [0,1])assert.ok(dist(contact(p,i),contact(base,i))<1e-9,`forefoot slid ${f}`);}
 assert.ok(poseAt(25,.5).footPitch[0]>.3&&poseAt(25,0).footPitch[0]<-.2,'heels travel below and above the step');
});

test('walking lunge advances two steps then resets to the start',()=>{
 assert.ok(poseAt(22,.8).hip[2]>1.2,'hips travel forward');
 assert.ok(Math.abs(poseAt(22,.999).hip[2])<.01,'reset returns to start');
});

test('all six ab exercises are implemented',()=>{for(const id of [26,27,28,29,30,31])assert.ok(built.has(id),`ab pose ${id}`);});

test('crunch and twist spine bends stay within their stated ranges',()=>{
 const total=(p,k)=>['Spine','Chest','ShoulderLine'].reduce((n,b)=>n+(p.spine[b]?.[k]??0),0);
 for(let f=0;f<=40;f++){
  const c=poseAt(26,f/40),r=poseAt(29,f/40);
  assert.ok(total(c,0)>=0&&total(c,0)<=.65,`crunch flex ${f}`);
  assert.ok(Math.abs(total(r,2))<=.65,`twist ${f}`);
 }
 assert.ok(total(poseAt(26,.5),0)>.5,'crunch reaches its curl');
 assert.ok(total(poseAt(29,.25),2)>.4&&total(poseAt(29,.75),2)<-.4,'twist reaches both sides');
});

test('hanging knee raise keeps both hands on the bar',()=>{
 const a=poseAt(31,0);for(let f=1;f<=20;f++)for(const s of [-1,1])assert.ok(dist(poseAt(31,f/20).arms(s).hand,a.arms(s).hand)<1e-9);
 for(const i of [0,1])assert.ok(a.ankles[i][1]>ANKLE_H,'feet clear the floor while hanging');
});

test('new equipment sits in the hands',async()=>{
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js'),{Studio,GRIP}=await import('../dist/scene.js');
 const bytes=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url)),asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const s=Object.create(Studio.prototype);s.scene=new THREE.Scene();s.materials={};
 for(const name of ['skin','muscle','shorts','joint','shirt','hair','eye','shoe','metal','dark','chrome','lime','pad'])s.materials[name]=new THREE.MeshStandardMaterial();
 s.phase=0;s.highlight=false;s.createAthlete(asset);s.equipment=new THREE.Group();s.scene.add(s.equipment);s.camera=new THREE.PerspectiveCamera();s.controls={target:new THREE.Vector3(),update(){}};
 const palm=side=>s.athlete.map[(side<0?'L':'R')+'_Hand'].localToWorld(new THREE.Vector3(...GRIP));
 for(const id of [20,21,23,29,31])for(const phase of [0,.3,.6]){
  s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
  const mid=palm(-1).add(palm(1)).multiplyScalar(.5);
  if([20,23].includes(id))assert.ok(s.bar.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Vector3(0,mid.y,mid.z))<1e-6,`bar ${id}`);
  if(id===21)assert.ok(s.weights[0].getWorldPosition(new THREE.Vector3()).distanceTo(mid)<1e-6&&!s.weights[1].visible,'goblet dumbbell');
  if(id===29)assert.ok(s.plate.visible&&s.plate.getWorldPosition(new THREE.Vector3()).distanceTo(mid)<1e-6,'twist plate');
  if(id===31){const bar=s.pullBar.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(bar.y-mid.y)<1e-6&&Math.abs(bar.z-mid.z)<1e-6,'pull-up bar through palms');}
 }
});

test('muscle highlight follows the selected group',async()=>{
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js'),{Athlete}=await import('../dist/athlete.js');
 const b=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const a=new Athlete(gltf),lit=name=>a.meshes.map(m=>m.material).find(m=>m.name===name).emissive.getHex()!==0;
 a.setMuscles(true,'chest');assert.ok(lit('FocusChest')&&!lit('FocusLegs'));
 a.setMuscles(true,'legs');assert.ok(lit('FocusLegs')&&lit('FocusLegsSkin')&&!lit('FocusChest'));
 a.setMuscles(true,'abs');assert.ok(lit('FocusAbs')&&!lit('FocusLegs'));
 a.setMuscles(false,'abs');assert.ok(!lit('FocusAbs'));
});

test('floor and mat exercises keep the skin above the floor',async()=>{
 const {readFile}=await import('node:fs/promises'),{GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js'),{Athlete}=await import('../dist/athlete.js');
 const b=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url)),gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const a=new Athlete(gltf),m=a.meshes.find(x=>x.material.name==='Body'),p=m.geometry.attributes.position,v=new THREE.Vector3();
 for(const id of BODY)for(const phase of [0,.25,.5,.75]){
  a.update(id,phase);let low=Infinity;for(let i=0;i<p.count;i+=7){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);low=Math.min(low,v.y);}
  assert.ok(low>-.02,`skin below floor ${id} ${phase}: ${low}`);
 }
});
