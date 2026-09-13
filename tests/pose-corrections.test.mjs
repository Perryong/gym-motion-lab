import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js');
const {Studio}=await import('../dist/scene.js');
const {poseAt,solveArm}=await import('../dist/motion.js');
async function scene(){
 const bytes=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url));const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const s=Object.create(Studio.prototype);s.scene=new THREE.Scene();s.materials={};
 for(const name of ['skin','muscle','shorts','joint','shirt','hair','eye','shoe','metal','dark','chrome','lime','pad'])s.materials[name]=new THREE.MeshStandardMaterial();
 s.phase=0;s.createAthlete(asset);s.equipment=new THREE.Group();s.scene.add(s.equipment);s.camera=new THREE.PerspectiveCamera();s.controls={target:new THREE.Vector3(),update(){}};return s;
}
test('bench pads do not cut through the thigh surface',async()=>{
 const s=await scene();
 for(const id of [0,2,4,13,17]){
  s.setExercise(id);s.update(.4);s.scene.updateMatrixWorld(true);
  const pads=[];s.equipment.traverse(o=>{if(o.isMesh&&o.material===s.materials.pad&&o.geometry.type==='BoxGeometry'){o.geometry.computeBoundingBox();pads.push(o);}});
  const mesh=s.athlete.mesh,p=mesh.geometry.attributes.position;
  let inside=0;const hits=[];
  for(let i=0;i<p.count;i++)if(p.getY(i)<-.16&&p.getY(i)>-.56){
   const world=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
   for(const pad of pads){const local=pad.worldToLocal(world.clone()),box=pad.geometry.boundingBox.clone().expandByScalar(-.012);if(box.containsPoint(local)){inside++;if(hits.length<3)hits.push({world:world.toArray(),local:local.toArray(),pad:pad.position.toArray()});}}
  }
  assert.equal(inside,0,`thigh vertices inside bench: exercise ${id}: ${JSON.stringify(hits)}`);
 }
});
test('push-up elbows bend toward the hips and finish close to straight',()=>{
 for(const id of [6,9,15,19]){
  const p=poseAt(id,.56),a=p.arms(1),elbow=solveArm(a.shoulder,a.hand,a.pole);
  assert.ok(elbow[2]>a.shoulder[2]+.16,`elbow should track back ${id}`);
  assert.ok(Math.abs(elbow[0]-a.shoulder[0])<.25,`excess elbow flare ${id}`);
  const top=poseAt(id,0).arms(1),distance=Math.hypot(...top.hand.map((n,i)=>n-top.shoulder[i]));
  assert.ok(distance>.79&&distance<.88,`top arm extension ${id}: ${distance}`);
 }
});
test('push-up legs stay extended in line with the torso and shoes rest on their toes',async()=>{
 const s=await scene();
 for(const id of [6,9,15,19])for(const phase of [0,.25,.56,.8]){
  const p=poseAt(id,phase),hip=new THREE.Vector3(.17,...p.hip.slice(1)),knee=new THREE.Vector3(...p.knees[1]),ankle=new THREE.Vector3(...p.ankles[1]);
  const thigh=knee.clone().sub(hip).normalize(),shin=ankle.clone().sub(knee).normalize();
  assert.ok(thigh.dot(shin)>.995,`bent push-up knee ${id} ${phase}`);
  const torso=new THREE.Vector3(...p.arms(1).shoulder).sub(new THREE.Vector3(.35,...p.hip.slice(1))).normalize();
  assert.ok(thigh.dot(torso)<-.995,`hip/body alignment ${id} ${phase}`);
  s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
  const foot=s.athlete.map.R_Foot,toe=foot.localToWorld(new THREE.Vector3(0,-.05,.22)),heel=foot.localToWorld(new THREE.Vector3(0,-.05,-.10));
  assert.ok(toe.y<.06&&toe.y>0,`toe contact ${id}: ${toe.y}`);
  assert.ok(heel.y>toe.y+.20,`heel must be raised ${id}`);
  assert.ok(toe.z>heel.z,`shoe direction must face away from hands ${id}`);
  const sole=foot.localToWorld(new THREE.Vector3(0,-.05,.06)),laces=foot.localToWorld(new THREE.Vector3(0,.068,.06));
  assert.ok(sole.z>laces.z,`soles must face the rear ${id}`);
 }
});
test('cable fly wrists follow forearms with mirrored thumbs-up grips',async()=>{
 const s=await scene();
 for(const id of [11,16])for(const phase of [0,.25,.56,.8]){
  s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
  for(const side of id===11?[1]:[-1,1]){
   const bone=s.athlete.map[(side<0?'L':'R')+'_Hand'],q=bone.getWorldQuaternion(new THREE.Quaternion());
   const a=poseAt(id,phase).arms(side),elbow=solveArm(a.shoulder,a.hand,a.pole),fore=new THREE.Vector3(...a.hand).sub(new THREE.Vector3(...elbow)).normalize();
   assert.ok(new THREE.Vector3(0,1,0).applyQuaternion(q).dot(fore)>.999,`bent wrist ${id} ${side}`);
   const thumb=s.athlete.map[(side<0?'L':'R')+'_Thumb1'].getWorldPosition(new THREE.Vector3()),palm=s.athlete.map[(side<0?'L':'R')+'_GripPalm'].getWorldPosition(new THREE.Vector3());
   assert.ok(thumb.y>palm.y+.045,`inverted thumb ${id} ${side}`);
   const palmFacing=new THREE.Vector3(0,0,1).applyQuaternion(q);
   assert.ok(palmFacing.x*side<0,`palm must face inward, not outward: ${id} ${side}`);
  }
 }
});
test('cable handles sit inside the finger curl rather than passing through fingertips',async()=>{
 const s=await scene();
 for(const id of [11,16])for(const phase of [0,.3,.56]){
  s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
  for(const c of s.cables){
   const n=c.side<0?'L':'R',axis=new THREE.Vector3(0,1,0).applyQuaternion(c.grip.quaternion);
   for(const f of ['Index','Middle','Ring','Pinky'])for(const j of [2,3]){
    const point=s.athlete.map[n+'_'+f+j].getWorldPosition(new THREE.Vector3()).sub(c.grip.position);
    const radius=point.addScaledVector(axis,-point.dot(axis)).length();
    assert.ok(radius>.025&&radius<.046,`handle/finger contact ${id} ${n} ${f}${j}: ${radius}`);
   }
  }
 }
});
test('cable handle is held beyond the wrist and its strap turns toward cable tension',async()=>{
 const s=await scene();
 for(const id of [11,16])for(const phase of [0,.25,.56,.8]){
  s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
  for(const c of s.cables){
   const wrist=s.athlete.map[(c.side<0?'L':'R')+'_Hand'],local=wrist.worldToLocal(c.grip.position.clone());
   assert.ok(local.y>.075&&local.y<.11,'grip belongs inside palm beyond wrist');
   const end=c.line.localToWorld(new THREE.Vector3(0,.5,0)),axis=new THREE.Vector3(0,1,0).applyQuaternion(c.grip.quaternion);
   const pull=new THREE.Vector3(...c.anchor).sub(c.grip.position);pull.addScaledVector(axis,-pull.dot(axis)).normalize();
   assert.ok(end.clone().sub(c.grip.position).normalize().dot(pull)>.999,'strap follows projected cable direction');
  }
 }
});
test('single cable fly free hand hangs relaxed beside the thigh',async()=>{
 const s=await scene();s.setExercise(11);
 for(const phase of [0,.3,.56,.8]){
  s.update(phase);s.scene.updateMatrixWorld(true);
  const hand=s.athlete.map.L_Hand.getWorldPosition(new THREE.Vector3()),hip=s.athlete.map.Hips.getWorldPosition(new THREE.Vector3());
  assert.ok(hand.y<hip.y-.04,'free wrist should hang below the hip');
  assert.ok(Math.abs(hand.z-hip.z)<.06,'free hand should hang beside the thigh');
  assert.ok(s.athlete.map.L_Index2.rotation.x<.6,'free fingers should not clench');
 }
});
test('reference chest fly holds a split stance and sweeps below the shoulders',()=>{
 const start=poseAt(16,0);
 assert.ok(Math.abs(start.ankles[0][2]-start.ankles[1][2])>.5,'staggered feet');
 for(const phase of [0,.15,.3,.56,.8,1]){
  const p=poseAt(16,phase);assert.deepEqual(p.ankles,start.ankles,'planted split stance');
  for(const side of [-1,1]){
   const a=p.arms(side),elbow=solveArm(a.shoulder,a.hand,a.pole);
   assert.ok(a.hand[1]<a.shoulder[1]-.15,'hands sweep at lower chest level');
   const reach=new THREE.Vector3(...a.hand).distanceTo(new THREE.Vector3(...a.shoulder));
   assert.ok(Math.abs(reach-.85)<1e-6,'constant elbow bend');
   assert.ok(elbow.every(Number.isFinite));
  }
 }
});
test('the mid-forearm surface is not weighted to the independently rotated hand',async()=>{
 const s=await scene(),mesh=s.athlete.mesh,p=mesh.geometry.attributes.position,j=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))>.96&&Math.abs(p.getX(i))<1.13&&p.getY(i)>.70){
  for(let c=0;c<4;c++)if(mesh.skeleton.bones[j.getComponent(i,c)].name.endsWith('_Hand'))assert.ok(w.getComponent(i,c)<.01,'hand rotation must not collapse forearm');
 }
});
test('pressing forearms finish vertically above the elbows at the lower position',()=>{
 for(const id of [0,1,2,4,17])for(const side of [-1,1]){
  const p=poseAt(id,.56),a=p.arms(side),elbow=solveArm(a.shoulder,a.hand,a.pole);
  const direction=new THREE.Vector3(...a.hand).sub(new THREE.Vector3(...elbow)).normalize().applyAxisAngle(new THREE.Vector3(1,0,0),p.rotation);
  assert.ok(direction.y>.995,`wrist/elbow alignment ${id}`);
 }
});
test('forearm cross sections retain volume under gripping and push-up wrist rotation',async()=>{
 const s=await scene(),mesh=s.athlete.mesh,p=mesh.geometry.attributes.position;
 for(const side of [-1,1]){
  const points=[[side*1.04,.86,0],[side*1.04,.74,0],[side*1.04,.8,.07],[side*1.04,.8,-.07]].map(target=>{
   let closest=0,d=Infinity;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),next=v.distanceToSquared(new THREE.Vector3(...target));if(next<d){d=next;closest=i;}}return closest;
  });
  for(const id of [0,4,6,9,11,14,15,19])for(const phase of [0,.25,.56,.8]){
   s.setExercise(id);s.update(phase);s.scene.updateMatrixWorld(true);
   for(const [a,b] of [[points[0],points[1]],[points[2],points[3]]]){
    const rest=new THREE.Vector3().fromBufferAttribute(p,a).distanceTo(new THREE.Vector3().fromBufferAttribute(p,b));
    const posed=mesh.getVertexPosition(a,new THREE.Vector3()).distanceTo(mesh.getVertexPosition(b,new THREE.Vector3()));
    assert.ok(posed/rest>.92,`collapsed forearm ${id} ${phase}`);
   }
  }
 }
});
