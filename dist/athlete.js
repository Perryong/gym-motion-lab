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
// Back, shoulder and arm highlights are not baked into athlete.glb, so split them out of the skin
// and shirt here. Each triangle goes by its bind-pose centroid (T-pose: +Z is the front, arms
// along ±X) and the bone that moves its first vertex.
const REGIONS=[
 ['FocusBack',(m,b,[x,y,z])=>(m==='Outfit'&&/^(Spine|Chest|ShoulderLine)$/.test(b)&&z<0&&y>.25)||(m==='Body'&&b==='ShoulderLine'&&z<0&&Math.abs(x)<.25)],
 ['FocusShoulders',(m,b,[x,y])=>m==='Body'&&((/UpperArm$/.test(b)&&Math.abs(x)<.55)||(b==='ShoulderLine'&&Math.abs(x)>=.25&&y>.7))],
 ['FocusArms',(m,b,[x])=>m==='Body'&&((/UpperArm$/.test(b)&&Math.abs(x)>=.55)||/Forearm$/.test(b))]];
function splitRegions(meshes){
 for(const mesh of [...meshes]){const name=mesh.material.name;if(name!=='Body'&&name!=='Outfit')continue;
  const g=mesh.geometry,P=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=g.index,keep=[],out=REGIONS.map(()=>[]);
  const bone=i=>{let b=0,w=-1;for(let k=0;k<4;k++)if(sw.getComponent(i,k)>w){w=sw.getComponent(i,k);b=si.getComponent(i,k);}return mesh.skeleton.bones[b].name;};
  for(let t=0;t<ix.count;t+=3){const tri=[ix.getX(t),ix.getX(t+1),ix.getX(t+2)],c=[0,1,2].map(d=>tri.reduce((n,i)=>n+P.getComponent(i,d),0)/3);
   const r=REGIONS.findIndex(([,test])=>test(name,bone(tri[0]),c));(r<0?keep:out[r]).push(...tri);}
  const withIndex=list=>{const geo=new THREE.BufferGeometry();for(const [k,v] of Object.entries(g.attributes))geo.setAttribute(k,v);geo.setIndex(list);return geo;};
  mesh.geometry=withIndex(keep);
  out.forEach((list,r)=>{if(!list.length)return;const material=mesh.material.clone();material.name=REGIONS[r][0];
   const part=new THREE.SkinnedMesh(withIndex(list),material);part.name=mesh.name+'_'+material.name;Object.assign(part,{castShadow:true,receiveShadow:true,frustumCulled:false});
   part.bind(mesh.skeleton,mesh.bindMatrix);part.position.copy(mesh.position);part.quaternion.copy(mesh.quaternion);part.scale.copy(mesh.scale);mesh.parent.add(part);meshes.push(part);});}
}
export class Athlete {
 constructor(gltf){
  this.group=gltf.scene;this.map={};this.group.traverse(o=>{if(o.isBone)this.map[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false;}});
  this.surface=this.group.getObjectByName('AthleteSurface');this.meshes=[];this.surface.traverse(o=>{if(o.isSkinnedMesh)this.meshes.push(o);});this.mesh=this.meshes[0];
  splitRegions(this.meshes);
  // Highlight materials per body group; each keeps its own base colour.
  this.focus={};for(const m of new Set(this.meshes.map(o=>o.material).flat())){const g={FocusChest:'chest',FocusLegs:'legs',FocusLegsSkin:'legs',FocusAbs:'abs',FocusBack:'back',FocusShoulders:'shoulders',FocusArms:'arms'}[m.name];if(g){(this.focus[g]??=[]).push(m);m.userData.base=m.color.clone();}}
  this.mixer=new THREE.AnimationMixer(this.group);this.clips=gltf.animations;this.id=-1;
 }
 update(id,phase){
  if(this.id!==id){
   this.mixer.stopAllAction();
   // Exercises added after the model was baked have no clip; applyRigPose below poses them live.
   const clip=this.clips.find(c=>c.name==='Exercise_'+id);
   this.action=clip?this.mixer.clipAction(clip):null;
   if(this.action){this.action.setLoop(THREE.LoopRepeat,Infinity);this.action.play();}
   this.id=id;
  }
  if(this.action)this.mixer.setTime((((phase%1)+1)%1)*durationFor(id));
  // Resolve exact equipment anchors after clip interpolation. Bone lengths never scale.
  const pose=applyRigPose(this.group,this.map,id,phase);this.meshes.forEach(m=>m.skeleton.update());return pose;
 }
 setMuscles(on,group='chest'){for(const [g,list] of Object.entries(this.focus))for(const m of list){const lit=on&&g===group;m.color.copy(lit?new THREE.Color(0xb5ed60):m.userData.base);m.emissive.setHex(lit?0x345609:0);m.emissiveIntensity=lit?.28:0;}}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.group);}
}
