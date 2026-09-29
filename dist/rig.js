import * as THREE from 'three';
import {allIds} from './exercises.js';
import {poseAt,solveArm,THIGH,SHIN,HIP} from './motion.js';
// Hand-local joint positions (fingers along +Y, palm toward +Z) and hand bind
// rotations measured from the athlete model by scripts/export-charter-blender.py.
export const FINGERS={R_Index:[[-.0331,.1573,.0051],[-.03,.2027,.0136],[-.027,.2446,.0243]],R_Middle:[[0,.1556,0],[.0041,.2041,.0067],[.0083,.2529,.0144]],R_Ring:[[.032,.1538,.0004],[.0382,.1986,.0067],[.0441,.2415,.0127]],R_Pinky:[[.0644,.1345,.0051],[.0694,.1811,.0099],[.0736,.2201,.0147]],R_Thumb:[[-.0648,.0956,.0472],[-.0844,.1368,.0687]],L_Index:[[.0323,.1586,.0032],[.0292,.2041,.0086],[.0263,.2467,.014]],L_Middle:[[0,.1572,-0],[-.005,.2084,-.0007],[-.0101,.2561,.0031]],L_Ring:[[-.0344,.1557,.0005],[-.0373,.1999,-.0015],[-.0406,.2442,.0002]],L_Pinky:[[-.0618,.1359,.0032],[-.0698,.1833,.0037],[-.0762,.222,.003]],L_Thumb:[[.0603,.0977,.0531],[.079,.1439,.072]]};
// Per-finger curl wrapping a handle centred at scene.js GRIP (fitted so every
// middle and end knuckle clears the barrel without floating off it).
const GRIP_CURL={Index:[.4,.75,.83],Middle:[.55,.75,.83],Ring:[.55,.55,.6],Pinky:[.3,.4,.44]};
export const HAND_BIND={R:[.4817,.4567,-.5257,.532],L:[.4966,-.4153,.561,.5159]};
const V=a=>new THREE.Vector3(...a),Y=new THREE.Vector3(0,1,0),X=new THREE.Vector3(1,0,0);
export const durationFor=id=>({12:4.8,22:7,27:6,30:7})[id]??([3,5,8,11,13,16].includes(id)?5.6:5);
export function makeSkeleton(){
 const bones=[],map={};
 function bone(name,parent,pos){const b=new THREE.Bone();b.name=name;b.position.set(...pos);if(parent)map[parent].add(b);map[name]=b;bones.push(b);return b;}
 bone('Hips',null,[0,0,0]);bone('Spine','Hips',[0,.26,0]);bone('Chest','Spine',[0,.27,0]);bone('ShoulderLine','Chest',[0,.27,0]);bone('Neck','ShoulderLine',[0,.075,0]);bone('Head','Neck',[0,.095,0]);
 for(const s of [-1,1]){const n=s<0?'L':'R';
  bone(n+'_UpperArm','ShoulderLine',[s*.35,0,0]);bone(n+'_Forearm',n+'_UpperArm',[s*.44,0,0]);bone(n+'_Hand',n+'_Forearm',[s*.44,0,0]);
  bone(n+'_GripPalm',n+'_Hand',[0,0,0]);
  bone(n+'_Thigh','Hips',[s*HIP,0,0]);bone(n+'_Shin',n+'_Thigh',[0,-THIGH,0]);bone(n+'_Foot',n+'_Shin',[0,-SHIN,0]);
  for(const f of ['Index','Middle','Ring','Pinky','Thumb']){
   const joints=FINGERS[n+'_'+f];let parent=n+'_GripPalm';
   joints.forEach((p,j)=>{const name=n+'_'+f+(j+1);bone(name,parent,j?p.map((v,k)=>v-joints[j-1][k]):p);parent=name;});
  }
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
 map.Hips.position.set(...p.hip);
 if(p.body)map.Hips.quaternion.setFromAxisAngle(X,p.pitch);
 else{map.Hips.quaternion.setFromUnitVectors(Y,axis);if(p.prone)map.Hips.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Y,Math.PI));}
 // Spine bends (body poses only); chest poses keep a straight spine.
 for(const b of ['Spine','Chest','ShoulderLine']){const [flex=0,side=0,twist=0]=p.spine?.[b]??[];map[b].quaternion.setFromEuler(new THREE.Euler(flex,twist,side,'YXZ'));}
 group.updateMatrixWorld(true);
 for(const s of [-1,1]){const n=s<0?'L':'R',side=p.prone?-s:s,i=side<0?0:1;
  const relaxed=id===11&&s===-1,cableGrip=(id===11&&s===1)||id===16;
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
  for(const [name,a,b] of [[n+'_Thigh',[side*HIP,...p.hip.slice(1)],p.knees[i]],[n+'_Shin',p.knees[i],p.ankles[i]]]){
   const y=V(a).sub(V(b)).normalize(),x=lateral.clone().addScaledVector(y,-lateral.dot(y)).normalize(),z=x.clone().cross(y).normalize();
   orient(map[name],new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),space);
  }
  let qFoot=new THREE.Quaternion().setFromEuler(new THREE.Euler(-p.rotation,0,0));
  // Reverse the shoe facing without changing ankle height or toe contact.
  if(p.prone)qFoot.setFromEuler(new THREE.Euler(1.95,0,0)).premultiply(new THREE.Quaternion().setFromAxisAngle(Y,Math.PI));
  // Body poses: flat on the floor with optional heel pitch, or neutral with the shin.
  if(p.body)qFoot=p.feet==='shin'?map[n+'_Shin'].getWorldQuaternion(new THREE.Quaternion()).premultiply(space.clone().invert()):new THREE.Quaternion().setFromAxisAngle(X,p.footPitch[i]);
  orient(map[n+'_Foot'],qFoot,space);
  let x=V([1,0,0]),y=V(hand).sub(V(elbow)).normalize();
  const open=(p.prone&&id!==19)||(id===12&&phase%1>=.22&&phase%1<.83),plate=id===10;
  const mode=p.body?p.hands(side).fingers:cableGrip?'cable':relaxed?'relaxed':open?'open':plate?'plate':'grip';
  if(p.body){
   // Fingers follow the forearm; the palm faces the requested direction.
   const palm=V(p.hands(side).palm);palm.addScaledVector(y,-palm.dot(y)).normalize();x=y.clone().cross(palm);
  }else{
   if([7,8,13].includes(id))x=V([0,1,0]);
   if([3,11,16,18].includes(id))x=V([0,1,0]);
   // Neutral grips (dips, rings): palms face the midline on both sides.
   if(id===14||id===19)x=V([0,0,-Math.sign(hand[0])]);
   // Push-ups: fingers toward the head (-Z), palms flat on the support (-Y).
   if(p.prone&&id!==19){y=V([0,0,-1]);x=V([-1,0,0]);}
   if(relaxed)x=V([0,0,1]).addScaledVector(y,-y.z).normalize();
   // Local +Z is the finger-curl/palm side: it must point inward.
   else if(cableGrip)x=V([0,-s,0]).addScaledVector(y,s*y.y).normalize();
   else{y.addScaledVector(x,-y.dot(x)).normalize();if(y.lengthSq()<.1)y=V([0,0,1]);}
  }
  const z=x.clone().cross(y).normalize();y=z.clone().cross(x).normalize();
  orient(map[n+'_Hand'],new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)),space);
  const curl={open:[.06,.06,.06],plate:[.3,.3,.3],relaxed:[.15,.30,.22]}[mode];
  for(const f of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++)map[n+'_'+f+j].rotation.set(curl?curl[j-1]:GRIP_CURL[f][j-1],0,0);
  // Thumb: opposed around a handle, flat when open, loose when relaxed.
  const thumb={open:[.15,s*.65,.1],relaxed:[.2,-s*.15,.25],cable:[.8,s*.9,.9]}[mode]??[.85,s*.65,1.0];
  map[n+'_Thumb1'].rotation.set(thumb[0],0,-thumb[1]);map[n+'_Thumb2'].rotation.set(thumb[2],0,0);
 }
 group.updateMatrixWorld(true);return p;
}
export function createExerciseClips(group,map){
 return allIds.map(id=>{
  const duration=durationFor(id),times=[],tracks=[],samples=new Map(Object.values(map).map(b=>[b.name,{position:[],quaternion:[]}]));
  for(let f=0;f<=80;f++){
   const phase=f/80;times.push(phase*duration);applyRigPose(group,map,id,phase);
   for(const b of Object.values(map)){samples.get(b.name).position.push(...b.position.toArray());samples.get(b.name).quaternion.push(...b.quaternion.toArray());}
  }
  for(const b of Object.values(map)){
   const values=samples.get(b.name);if(b.name==='Hips')tracks.push(new THREE.VectorKeyframeTrack(b.name+'.position',times,values.position));
   tracks.push(new THREE.QuaternionKeyframeTrack(b.name+'.quaternion',times,values.quaternion));
  }
  return new THREE.AnimationClip('Exercise_'+id,duration,tracks);
 });
}
