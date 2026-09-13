import * as THREE from 'three';
import {GLTFLoader} from './vendor/loaders/GLTFLoader.js';
import {applyRigPose,durationFor} from './rig.js';
export const loadAthlete=()=>new GLTFLoader().loadAsync(new URL('./assets/athlete.glb',import.meta.url).href);
export class Athlete {
 constructor(gltf){
  this.group=gltf.scene;this.map={};this.group.traverse(o=>{if(o.isBone)this.map[o.name]=o;if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false;}});
  this.surface=this.group.getObjectByName('AthleteSurface');this.meshes=[];this.surface.traverse(o=>{if(o.isSkinnedMesh)this.meshes.push(o);});this.mesh=this.meshes[0];
  this.focusMaterial=this.meshes.map(o=>o.material).flat().find(m=>m.name==='FocusChest');this.baseColor=this.focusMaterial.color.clone();
  this.mixer=new THREE.AnimationMixer(this.group);this.clips=gltf.animations;this.id=-1;
 }
 update(id,phase){
  if(this.id!==id){this.mixer.stopAllAction();this.action=this.mixer.clipAction(this.clips.find(c=>c.name==='Exercise_'+id));this.action.setLoop(THREE.LoopRepeat,Infinity);this.action.play();this.id=id;}
  this.mixer.setTime((((phase%1)+1)%1)*durationFor(id));
  // Resolve exact equipment anchors after clip interpolation. Bone lengths never scale.
  const pose=applyRigPose(this.group,this.map,id,phase);this.meshes.forEach(m=>m.skeleton.update());return pose;
 }
 setMuscles(on){this.focusMaterial.color.copy(on?new THREE.Color(0xb5ed60):this.baseColor);this.focusMaterial.emissive.setHex(on?0x345609:0);this.focusMaterial.emissiveIntensity=on?.28:0;}
 dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.group);}
}
