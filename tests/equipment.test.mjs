import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const THREE=await import('../dist/vendor/three.module.js');
const {Studio}=await import('../dist/scene.js');
const {exercises,displayOrder}=await import('../dist/exercises.js');
const {poseAt}=await import('../dist/motion.js');
const {readFile}=await import('node:fs/promises');
const {GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js');
const bytes=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url));
const asset=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
function scene(){
 const s=Object.create(Studio.prototype);s.scene=new THREE.Scene();s.materials={};
 for(const name of ['skin','muscle','shorts','joint','shirt','hair','eye','shoe','metal','dark','chrome','lime','pad'])s.materials[name]=new THREE.MeshStandardMaterial();
 s.phase=0;s.highlight=false;s.createAthlete(asset);s.equipment=new THREE.Group();s.scene.add(s.equipment);
 s.camera=new THREE.PerspectiveCamera();s.controls={target:new THREE.Vector3(),update(){}};
 return s;
}
test('all 18 real scenes build and animate with finite geometry and attached equipment',()=>{
 assert.equal(new Set(displayOrder).size,exercises.filter(Boolean).length);
 const s=scene();
 for(const id of displayOrder){
  s.setExercise(id);
  for(const phase of [0,.125,.25,.5,.65,.875,1]){
   s.update(phase);s.scene.updateMatrixWorld(true);
   s.scene.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite),`nonfinite transform exercise ${id}`));
   const p=poseAt(id,phase);
   for(const side of [-1,1]){
    const name=(p.prone?-side:side)<0?'L':'R';
    const expected=s.root.localToWorld(new THREE.Vector3(...p.arms(side).hand));
    const actual=s.athlete.map[name+'_Hand'].getWorldPosition(new THREE.Vector3());
    assert.ok(actual.distanceTo(expected)<1e-6,`rig grip contact ${id} ${phase}: ${actual.distanceTo(expected)}`);
    const ankle=s.root.localToWorld(new THREE.Vector3(...p.ankles[side<0?0:1]));
    assert.ok(s.athlete.map[name+'_Foot'].getWorldPosition(new THREE.Vector3()).distanceTo(ankle)<1e-6,`rig ankle contact ${id} ${phase}`);
   }
   for(const c of s.cables){const bone=s.athlete.map[(c.side<0?'L':'R')+'_GripPalm'],hand=bone.localToWorld(new THREE.Vector3(0,.013,-.006));assert.ok(hand.distanceTo(c.grip.position)<1e-8);}
   for(const c of s.machineArms){const hand=s.root.localToWorld(new THREE.Vector3(...p.arms(c.side).hand));assert.ok(hand.distanceTo(c.grip.position)<1e-8);}
   for(let i=0;i<2;i++)if(s.weights[i].visible&&id!==5)assert.ok(s.weights[i].position.distanceTo(new THREE.Vector3(...p.arms(i===0?-1:1).hand))<1e-8);
  }
  assert.equal(s.cables.length,id===11?1:id===16?2:0);
  assert.equal(s.rings.length,id===19?2:0);
  assert.equal(s.bar.visible,[4,17].includes(id));
 }
});
