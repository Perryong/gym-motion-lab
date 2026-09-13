import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
test('the published athlete asset has a continuous skinned body and all 18 named clips',async()=>{
 const {GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js');
 const b=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url));
 const gltf=await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const surface=gltf.scene.getObjectByName('AthleteSurface'),meshes=[];surface?.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});const mesh=meshes[0];
 assert.ok(mesh?.isSkinnedMesh,'athlete must deform with a skeleton');
 assert.equal(gltf.animations.length,18);
 assert.ok(mesh.skeleton.bones.some(b=>b.name==='Neck'));
 assert.ok(mesh.skeleton.bones.some(b=>b.name==='R_Index1'));
 const weight=mesh.geometry.getAttribute('skinWeight');
 for(let i=0;i<weight.count;i++)assert.ok(Math.abs(weight.getX(i)+weight.getY(i)+weight.getZ(i)+weight.getW(i)-1)<1e-5);
 const edge=new Map(),idx=meshes.flatMap(m=>Array.from(m.geometry.index.array));
 for(let i=0;i<idx.length;i+=3)for(let j=0;j<3;j++){
  const a=idx[i+j],b=idx[i+(j+1)%3],key=a<b?`${a}:${b}`:`${b}:${a}`;
  edge.set(key,(edge.get(key)||0)+1);
 }
 assert.ok([...edge.values()].every(n=>n===2),'surface must have no open seams');
});
