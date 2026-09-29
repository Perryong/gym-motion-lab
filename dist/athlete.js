import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {applyRigPose,durationFor} from './rig.js';
const asset=name=>new URL('./assets/'+name,import.meta.url).href;
// PBR maps for the body and outfit atlases (see scripts/export-charter-blender.py).
async function textures(){
 const loader=new THREE.TextureLoader(),maps={};
 await Promise.all(['body','outfit'].flatMap(part=>['baseColor','normal','metallicRoughness'].map(async kind=>{
  const t=await loader.loadAsync(asset(`athlete-${part}-${kind}.jpg`));t.flipY=false;t.anisotropy=4;if(kind==='baseColor')t.colorSpace=THREE.SRGBColorSpace;(maps[part]??={})[kind]=t;
 })));
 return maps;
}
export async function loadAthlete(){
 const [gltf,maps]=await Promise.all([new GLTFLoader().loadAsync(asset('athlete.glb')),textures()]);
 gltf.scene.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){const t=maps[['Body','FocusLegsSkin'].includes(m.name)?'body':'outfit'];
  Object.assign(m,{map:t.baseColor,normalMap:t.normal,roughnessMap:t.metallicRoughness,metalnessMap:t.metallicRoughness,roughness:1,metalness:1});m.needsUpdate=true;}});
 return gltf;
}
export class Athlete {
 constructor(gltf){
  this.group=gltf.scene;this.map={};this.group.traverse(o=>{if(o.isBone)this.map[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false;}});
  this.surface=this.group.getObjectByName('AthleteSurface');this.meshes=[];this.surface.traverse(o=>{if(o.isSkinnedMesh)this.meshes.push(o);});this.mesh=this.meshes[0];
  // Highlight materials per body group; each keeps its own base colour.
  this.focus={};for(const m of new Set(this.meshes.map(o=>o.material).flat())){const g={FocusChest:'chest',FocusLegs:'legs',FocusLegsSkin:'legs',FocusAbs:'abs'}[m.name];if(g){(this.focus[g]??=[]).push(m);m.userData.base=m.color.clone();}}
  this.mixer=new THREE.AnimationMixer(this.group);this.clips=gltf.animations;this.id=-1;
 }
 update(id,phase){
  if(this.id!==id){this.mixer.stopAllAction();this.action=this.mixer.clipAction(this.clips.find(c=>c.name==='Exercise_'+id));this.action.setLoop(THREE.LoopRepeat,Infinity);this.action.play();this.id=id;}
  this.mixer.setTime((((phase%1)+1)%1)*durationFor(id));
  // Resolve exact equipment anchors after clip interpolation. Bone lengths never scale.
  const pose=applyRigPose(this.group,this.map,id,phase);this.meshes.forEach(m=>m.skeleton.update());return pose;
 }
 setMuscles(on,group='chest'){for(const [g,list] of Object.entries(this.focus))for(const m of list){const lit=on&&g===group;m.color.copy(lit?new THREE.Color(0xb5ed60):m.userData.base);m.emissive.setHex(lit?0x345609:0);m.emissiveIntensity=lit?.28:0;}}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.group);}
}
