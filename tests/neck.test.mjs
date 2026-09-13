import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js');
const {displayOrder}=await import('../dist/exercises.js');
const {Athlete}=await import('../dist/athlete.js');
test('short neck and the real skinned neck surface stay connected through every exercise',async()=>{
 const b=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const athlete=new Athlete(gltf),mesh=athlete.mesh,position=mesh.geometry.attributes.position;
 const neckVertices=[];for(let i=0;i<position.count;i++)if(position.getY(i)>.82&&position.getY(i)<.97&&Math.abs(position.getX(i))<.1)neckVertices.push(i);
 assert.ok(neckVertices.length>30);
 for(const id of displayOrder)for(let f=0;f<=40;f++){
  athlete.update(id,f/40);const center=athlete.map.ShoulderLine.getWorldPosition(new THREE.Vector3()),head=athlete.map.Head.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(center.distanceTo(head)-.17)<1e-6,'fixed short head connection');
  const line=new THREE.Line3(center,head);
  for(const i of neckVertices){
   const vertex=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld),nearest=line.closestPointToPoint(vertex,true,new THREE.Vector3());
   assert.ok(vertex.distanceTo(nearest)<.16,`neck surface disconnected ${id} ${f}`);
  }
 }
});
