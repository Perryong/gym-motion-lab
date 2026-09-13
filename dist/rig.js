import * as THREE from 'three';
import {displayOrder} from './exercises.js';
import {poseAt,solveArm} from './motion.js';
const V=a=>new THREE.Vector3(...a),Y=new THREE.Vector3(0,1,0);
export const durationFor=id=>id===12?4.8:[3,5,8,11,13,16].includes(id)?5.6:5;
export function makeSkeleton(){
 const bones=[],map={};
 function bone(name,parent,pos){const b=new THREE.Bone();b.name=name;b.position.set(...pos);if(parent)map[parent].add(b);map[name]=b;bones.push(b);return b;}
 bone('Hips',null,[0,0,0]);bone('Spine','Hips',[0,.26,0]);bone('Chest','Spine',[0,.27,0]);bone('ShoulderLine','Chest',[0,.27,0]);bone('Neck','ShoulderLine',[0,.075,0]);bone('Head','Neck',[0,.095,0]);
 for(const s of [-1,1]){const n=s<0?'L':'R';
  bone(n+'_UpperArm','ShoulderLine',[s*.35,0,0]);bone(n+'_Forearm',n+'_UpperArm',[s*.44,0,0]);bone(n+'_Hand',n+'_Forearm',[s*.44,0,0]);
  bone(n+'_GripPalm',n+'_Hand',[0,0,0]);
  bone(n+'_Thigh','Hips',[s*.17,0,0]);bone(n+'_Shin',n+'_Thigh',[0,-.54,0]);bone(n+'_Foot',n+'_Shin',[0,-.56,0]);
  for(const [i,f] of ['Index','Middle','Ring','Pinky'].entries()){
   bone(n+'_'+f+'1',n+'_GripPalm',[(i-1.5)*.026,.017,-.049]);bone(n+'_'+f+'2',n+'_'+f+'1',[0,.043,0]);bone(n+'_'+f+'3',n+'_'+f+'2',[0,.031,0]);
  }
  bone(n+'_Thumb1',n+'_GripPalm',[s*.064,-.025,-.033]);bone(n+'_Thumb2',n+'_Thumb1',[0,.036,0]);
 }
 return {bones,map};
}
function orient(bone,desired,space){
 const parentQ=bone.parent.getWorldQuaternion(new THREE.Quaternion());
 bone.quaternion.copy(parentQ.invert().multiply(space).multiply(desired));bone.updateMatrixWorld(true);
}
export function applyRigPose(group,map,id,phase){
 const p=poseAt(id,phase),center=V(p.arms(1).shoulder).add(V(p.arms(-1).shoulder)).multiplyScalar(.5),axis=center.clone().sub(V(p.hip)).normalize();
 const space=group.getWorldQuaternion(new THREE.Quaternion());
 map.Hips.position.set(...p.hip);map.Hips.quaternion.setFromUnitVectors(Y,axis);if(p.prone)map.Hips.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Y,Math.PI));
 group.updateMatrixWorld(true);
 for(const s of [-1,1]){const n=s<0?'L':'R',side=p.prone?-s:s,i=side<0?0:1;
  const relaxed=id===11&&s===-1,cableGrip=(id===11&&s===1)||id===16;
  // Seat the cable grip beyond the wrist, inside the palm and curled fingers.
  map[n+'_GripPalm'].position.set(0,cableGrip?.075:0,0);
  // Cable palms face inward. Put the thumb and index finger on the upper
  // edge of each mirrored hand, rather than rolling an outward-facing palm.
  map[n+'_Thumb1'].position.x=(cableGrip?-s:s)*.064;
  for(const [i,f] of ['Index','Middle','Ring','Pinky'].entries())map[n+'_'+f+'1'].position.x=(cableGrip?s:1)*(i-1.5)*.026;
  const {shoulder,hand,pole}=p.arms(side),elbow=solveArm(shoulder,hand,pole);
  // A shared elbow hinge frame fixes roll as well as direction. Independent
  // shortest-arc rotations can twist adjacent bones in opposite directions.
  const upper=V(elbow).sub(V(shoulder)).normalize(),fore=V(hand).sub(V(elbow)).normalize();
  const hinge=upper.clone().cross(fore).multiplyScalar(-s).normalize();
  for(const [name,direction] of [[n+'_UpperArm',upper],[n+'_Forearm',fore]]){
   const x=direction.clone().multiplyScalar(s),y=hinge.clone(),z=x.clone().cross(y).normalize();
   orient(map[name],new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),space);
  }
  const lateral=new THREE.Vector3(1,0,0).applyQuaternion(map.Hips.quaternion);
  for(const [name,a,b] of [[n+'_Thigh',[side*.17,...p.hip.slice(1)],p.knees[i]],[n+'_Shin',p.knees[i],p.ankles[i]]]){
   const y=V(a).sub(V(b)).normalize(),x=lateral.clone().addScaledVector(y,-lateral.dot(y)).normalize(),z=x.clone().cross(y).normalize();
   orient(map[name],new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),space);
  }
  const qFoot=new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.rotation,0,0));
  // Reverse the shoe facing without changing ankle height or toe contact.
  if(p.prone)qFoot.setFromEuler(new THREE.Euler(1.95,0,0)).premultiply(new THREE.Quaternion().setFromAxisAngle(Y,Math.PI));
  orient(map[n+'_Foot'],qFoot,space);
  let x=V([1,0,0]),y=V(hand).sub(V(elbow)).normalize();
  if([7,8,13].includes(id))x=V([0,1,0]);
  if([3,11,16,18].includes(id))x=V([0,1,0]);
  if(id===14||id===19)x=V([0,0,1]);
  if(p.prone&&id!==19){y=V([0,0,-1]);x=V([1,0,0]);}
  if(relaxed){
   x=V([0,0,1]).addScaledVector(y,-y.z).normalize();
  }else if(cableGrip){
   // Local +Z is the finger-curl/palm side: it must point inward.
   x=V([0,-s,0]).addScaledVector(y,s*y.y).normalize();
  }else{y.addScaledVector(x,-y.dot(x)).normalize();if(y.lengthSq()<.1)y=V([0,0,1]);}
  const z=x.clone().cross(y).normalize();y=z.clone().cross(x).normalize();
  const qHand=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
  orient(map[n+'_Hand'],qHand,space);
  const open=(p.prone&&id!==19)||(id===12&&phase%1>=.22&&phase%1<.83),plate=id===10;
  const curl=open?.06:plate?.3:1.13;
  for(const f of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++)map[n+'_'+f+j].rotation.set(curl*(j===1?.75:1),0,0);
  map[n+'_Thumb1'].rotation.set(open?.15:.85,0,s*-.65);map[n+'_Thumb2'].rotation.set(open?.1:1.0,0,0);
  if(cableGrip){
   // Match the C-shaped fingers to the handle barrel, then oppose the thumb.
   for(const f of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++)map[n+'_'+f+j].rotation.set([.85,.75,1.05][j-1],0,0);
   map[n+'_Thumb1'].rotation.set(.8,0,-s*.9);map[n+'_Thumb2'].rotation.set(.9,0,0);
  }else if(relaxed){
   for(const f of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++)map[n+'_'+f+j].rotation.set([.15,.30,.22][j-1],0,0);
   map[n+'_Thumb1'].rotation.set(.2,0,s*.15);map[n+'_Thumb2'].rotation.set(.25,0,0);
  }
 }
 group.updateMatrixWorld(true);return p;
}
export function createExerciseClips(group,map){
 return displayOrder.map(id=>{
  const duration=durationFor(id),times=[],tracks=[],samples=new Map(Object.values(map).map(b=>[b.name,{position:[],quaternion:[]}]));
  for(let f=0;f<=80;f++){
   const phase=f/80;times.push(phase*duration);applyRigPose(group,map,id,phase);
   for(const b of Object.values(map)){samples.get(b.name).position.push(...b.position.toArray());samples.get(b.name).quaternion.push(...b.quaternion.toArray());}
  }
  for(const b of Object.values(map)){
   const values=samples.get(b.name);if(b.name==='Hips'||b.name.endsWith('_GripPalm')||/_(Thumb|Index|Middle|Ring|Pinky)1$/.test(b.name))tracks.push(new THREE.VectorKeyframeTrack(b.name+'.position',times,values.position));
   tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',times,values.quaternion));
  }
  return new THREE.AnimationClip('Exercise_'+id,duration,tracks);
 });
}
