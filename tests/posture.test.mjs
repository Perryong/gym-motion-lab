import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js');
const {GLTFLoader}=await import('../dist/vendor/loaders/GLTFLoader.js');
const {Athlete}=await import('../dist/athlete.js');
const {poseAt,solveArm,HIP}=await import('../dist/motion.js');
const {MAT}=await import('../dist/motion-body.js');

const b=await readFile(new URL('../dist/assets/athlete.glb',import.meta.url));
const athlete=new Athlete(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),''));
const mesh=athlete.mesh,position=mesh.geometry.attributes.position,skinIndex=mesh.geometry.attributes.skinIndex,skinWeight=mesh.geometry.attributes.skinWeight;
athlete.update(20,0);
const main=i=>{let bi=0,bw=-1;for(let k=0;k<4;k++){const w=skinWeight.getComponent(i,k);if(w>bw){bw=w;bi=skinIndex.getComponent(i,k);}}return mesh.skeleton.bones[bi].name;};
const region={hips:[],back:[],head:[],hands:[]};
for(let i=0;i<position.count;i++){const n=main(i);if(n==='Hips')region.hips.push(i);else if(n==='Chest'||n==='ShoulderLine')region.back.push(i);else if(n==='Head')region.head.push(i);else if(/^[LR]_(Hand|Index|Middle|Ring|Pinky|Thumb)/.test(n))region.hands.push(i);}
const v=new THREE.Vector3();
// Lowest skin point above the mat surface for a set of vertices (all vertices when omitted).
function clearance(id,u,list){athlete.update(id,u);athlete.group.updateMatrixWorld(true);let lo=Infinity;
 const each=list??Array.from({length:position.count},(_,i)=>i);for(const i of each){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);lo=Math.min(lo,v.y);}return lo-MAT;}
// Nose direction relative to the upper trunk; larger = chin further up.
const nose=(()=>{athlete.update(20,0);athlete.group.updateMatrixWorld(true);let best=-Infinity,at=0;for(const i of region.head){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);if(v.z>best){best=v.z;at=i;}}return at;})();
function chinUp(id,u){athlete.update(id,u);athlete.group.updateMatrixWorld(true);
 const head=athlete.map.Head.getWorldPosition(new THREE.Vector3()),gaze=mesh.getVertexPosition(nose,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).sub(head).normalize();
 const q=athlete.map.ShoulderLine.getWorldQuaternion(new THREE.Quaternion());
 return Math.atan2(gaze.dot(new THREE.Vector3(0,1,0).applyQuaternion(q)),gaze.dot(new THREE.Vector3(0,0,1).applyQuaternion(q)))*180/Math.PI;}
const elbow=(id,u,s)=>{const a=poseAt(id,u).arms(s);return {...a,elbow:solveArm(a.shoulder,a.hand,a.pole)};};
const F=Array.from({length:21},(_,f)=>f/20);

test('lying on the back, head, shoulder blades and seat rest on the mat',()=>{
 for(const id of [24,26,28,30]){
  for(const [name,list,hi] of [['seat',region.hips,.015],['shoulder blades',region.back,.02],['head',region.head,.03]]){
   const c=clearance(id,0,list);assert.ok(c>-.012&&c<hi,`${id} ${name} clearance ${c.toFixed(3)}`);
  }
 }
});

test('floor exercises never sink the body into the mat',()=>{
 for(const id of [24,26,28,29,30])for(const u of F){const c=clearance(id,u);assert.ok(c>-.012,`${id} u${u} sinks ${c.toFixed(3)}`);}
});

test('russian twist sits on the seat, not floating above the mat',()=>{
 for(const u of [0,.25,.5,.75]){const c=clearance(29,u,region.hips);assert.ok(Math.abs(c)<.015,`twist seat u${u} ${c.toFixed(3)}`);}
});

test('crunch tucks the chin as the shoulders curl',()=>{
 const standing=chinUp(20,0);
 assert.ok(chinUp(26,.5)<standing-12,`crunch top chin ${chinUp(26,.5).toFixed(0)} vs standing ${standing.toFixed(0)}`);
 assert.ok(chinUp(26,0)<=standing+1,'rest head is not tipped further back than standing');
});

test('arms lie along the mat in the bridge and leg raise',()=>{
 for(const id of [24,28])for(const u of F)for(const s of [-1,1]){const a=elbow(id,u,s);
  assert.ok(a.elbow[1]<=a.shoulder[1]+.06,`${id} u${u} elbow lifted ${(a.elbow[1]-a.shoulder[1]).toFixed(2)}`);}
});

test('hands rest flat on the mat in the bridge and leg raise',()=>{
 for(const id of [24,28])for(const u of [0,.25,.5]){const c=clearance(id,u,region.hands);assert.ok(c>-.012&&c<.02,`${id} u${u} hands ${c.toFixed(3)} above the mat`);}
});

test('crunch arms stay folded on the chest',()=>{
 for(const u of F)for(const s of [-1,1]){const a=elbow(26,u,s);assert.ok(a.elbow[1]<=a.hand[1]+.08,`crunch u${u} elbow up ${(a.elbow[1]-a.hand[1]).toFixed(2)}`);}
});

test('russian twist turns the shoulders and swings the plate to each side',()=>{
 const plate=u=>{const p=poseAt(29,u);return p.arms(1).hand[0]/2+p.arms(-1).hand[0]/2;};
 for(const u of [.25,.75]){const p=poseAt(29,u),r=p.arms(1).shoulder,l=p.arms(-1).shoulder;
  const yaw=Math.atan2(r[2]-l[2],r[0]-l[0])*180/Math.PI;assert.ok(Math.abs(yaw)>=35,`twist yaw u${u} ${yaw.toFixed(0)}`);
  assert.ok(Math.abs(plate(u))>=.25,`plate only ${plate(u).toFixed(2)} aside at u${u}`);}
 assert.ok(plate(.25)*plate(.75)<0,'plate reaches opposite sides');
});

test('walking lunge lowers the back knee toward the floor with a vertical front shin',()=>{
 let low={y:Infinity};
 for(let f=0;f<=200;f++){const u=f/200*.84,p=poseAt(22,u);for(const i of [0,1])if(p.knees[i][1]<low.y)low={y:p.knees[i][1],p,i,u};}
 assert.ok(low.y<=.2,`back knee only reaches ${low.y.toFixed(2)}`);
 const front=1-low.i,k=low.p.knees[front],a=low.p.ankles[front],h=[(front?1:-1)*HIP,...low.p.hip.slice(1)];
 const shin=Math.atan2(Math.hypot(k[0]-a[0],k[2]-a[2]),k[1]-a[1])*180/Math.PI;
 const u1=h.map((x,j)=>x-k[j]),u2=a.map((x,j)=>x-k[j]),knee=Math.acos(u1.reduce((n,x,j)=>n+x*u2[j],0)/Math.hypot(...u1)/Math.hypot(...u2))*180/Math.PI;
 assert.ok(shin<=15,`front shin ${shin.toFixed(0)}° from vertical`);
 assert.ok(knee>=75&&knee<=105,`front knee ${knee.toFixed(0)}°`);
});

// Fingertip and torso vertices for contact checks on the chest and waist.
const tips={L:[],R:[]},torso=[];
for(let i=0;i<position.count;i++){const n=main(i);if(/^L_(Index|Middle)3$/.test(n))tips.L.push(i);else if(/^R_(Index|Middle)3$/.test(n))tips.R.push(i);else if(['Hips','Spine','Chest','ShoulderLine'].includes(n))torso.push(i);}
const world=i=>mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
const nearestTorso=p=>{let d=Infinity;for(let k=0;k<torso.length;k+=3)d=Math.min(d,world(torso[k]).distanceTo(p));return d;};

// Height of a bone point above the torso skin under it, in the upper trunk's frame (+Z out of the chest).
function aboveSkin(p,inv,T){let s=-Infinity;for(const q of T)if(Math.hypot(q.x-p.x,q.y-p.y)<.04)s=Math.max(s,q.z);return p.z-s;}
test('crunch forearms lie on top of the chest, not inside it',()=>{
 for(const u of [0,.25,.5,.75]){athlete.update(26,u);athlete.group.updateMatrixWorld(true);
  const inv=athlete.map.ShoulderLine.matrixWorld.clone().invert(),T=torso.map(i=>world(i).applyMatrix4(inv));
  for(const n of ['L','R']){const e=athlete.map[n+'_Forearm'].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),w=athlete.map[n+'_Hand'].getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
   for(const k of [.25,.5,.75,1]){const d=aboveSkin(e.clone().lerp(w,k),inv,T);if(d>-Infinity&&d<Infinity)assert.ok(d>=.02,`crunch u${u} ${n} forearm ${k} is ${d.toFixed(3)} from the chest skin`);}}}
});

test('crunch hands lie crossed on the chest, fingertips not past the shoulders',()=>{
 for(const u of [0,.25,.5,.75]){athlete.update(26,u);athlete.group.updateMatrixWorld(true);
  const inv=athlete.map.ShoulderLine.matrixWorld.clone().invert();
  for(const n of ['L','R']){const pts=tips[n].map(world);
   const top=Math.max(...pts.map(p=>p.clone().applyMatrix4(inv).y));
   assert.ok(top<=.03,`crunch u${u} ${n} fingertips ${top.toFixed(3)} past the shoulder line`);
   const touch=Math.min(...pts.filter((_,k)=>k%4===0).map(nearestTorso));
   assert.ok(touch<=.05,`crunch u${u} ${n} fingertips ${touch.toFixed(3)} off the chest`);}}
});

test('single-arm cable fly rests the free hand on the hip with the elbow out',()=>{
 const {GRIP}={GRIP:[0,.174,.056]};
 for(const u of [0,.25,.5,.75]){athlete.update(11,u);athlete.group.updateMatrixWorld(true);
  const palm=athlete.map.L_Hand.localToWorld(new THREE.Vector3(...GRIP));
  const d=nearestTorso(palm);assert.ok(d<=.07,`free hand ${d.toFixed(3)} away from the waist`);
  const a=elbow(11,u,-1);
  assert.ok(a.elbow[0]<=a.shoulder[0]-.12,`free elbow not out to the side (x ${a.elbow[0].toFixed(2)} vs shoulder ${a.shoulder[0].toFixed(2)})`);
  assert.ok(a.hand[1]<a.elbow[1],'free hand sits below the elbow');}
});

// A Studio with real equipment and the real athlete, without a WebGL renderer.
async function studio(){
 const {Studio}=await import('../dist/scene.js');
 const s=Object.create(Studio.prototype);s.scene=new THREE.Scene();s.materials={};
 for(const name of ['skin','muscle','shorts','joint','shirt','hair','eye','shoe','metal','dark','chrome','lime','pad'])s.materials[name]=new THREE.MeshStandardMaterial();
 s.phase=0;s.highlight=false;s.createAthlete(await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),''));
 s.equipment=new THREE.Group();s.scene.add(s.equipment);s.camera=new THREE.PerspectiveCamera();s.controls={target:new THREE.Vector3(),update(){}};
 return s;
}

test('dip bars run through the grip of both hands',async()=>{
 const {GRIP}=await import('../dist/scene.js'),s=await studio();
 s.setExercise(14);assert.equal(s.dipBars?.length,2,'two dip bars');
 for(const u of [0,.25,.5,.75]){s.update(u);s.scene.updateMatrixWorld(true);
  for(const {bar,side} of s.dipBars){
   const grip=s.athlete.map[(side<0?'L':'R')+'_Hand'].localToWorld(new THREE.Vector3(...GRIP));
   const axis=new THREE.Vector3(0,1,0).applyQuaternion(bar.getWorldQuaternion(new THREE.Quaternion())),c=bar.getWorldPosition(new THREE.Vector3());
   const off=grip.clone().sub(c);off.addScaledVector(axis,-off.dot(axis));
   assert.ok(off.length()<.015,`dip u${u} side ${side}: grip ${off.length().toFixed(3)} from the bar axis`);
   assert.ok(Math.abs(axis.z)>.99,'bar runs front to back');}}
});

test('dip legs hang under the hips with knees bent and feet behind, clear of the floor',()=>{
 const feet=[];for(let i=0;i<position.count;i++)if(/_(Foot|Toe)/.test(main(i)))feet.push(i);
 for(const u of [0,.25,.5,.75]){const p=poseAt(14,u);
  for(const i of [0,1]){const s=i?1:-1,h=[s*HIP,...p.hip.slice(1)],k=p.knees[i],a=p.ankles[i];
   const thigh=Math.atan2(k[2]-h[2],h[1]-k[1])*180/Math.PI;assert.ok(thigh>=0&&thigh<=30,`dip u${u} thigh ${thigh.toFixed(0)}° forward`);
   const u1=h.map((x,j)=>x-k[j]),u2=a.map((x,j)=>x-k[j]),knee=Math.acos(u1.reduce((n,x,j)=>n+x*u2[j],0)/Math.hypot(...u1)/Math.hypot(...u2))*180/Math.PI;
   assert.ok(knee>=80&&knee<=115,`dip u${u} knee ${knee.toFixed(0)}°`);
   assert.ok(a[2]<k[2],`dip u${u} feet behind the knees`);}
  athlete.update(14,u);athlete.group.updateMatrixWorld(true);
  const lo=Math.min(...feet.map(i=>world(i).y));assert.ok(lo>=.08,`dip u${u} shoe ${lo.toFixed(3)} above the floor`);}
});

test('dip feet hang relaxed in line with the shins, toes toward the floor',()=>{
 for(const u of [0,.25,.5,.75]){athlete.update(14,u);athlete.group.updateMatrixWorld(true);
  for(const n of ['L','R']){const foot=athlete.map[n+'_Foot'].getWorldQuaternion(new THREE.Quaternion()),shin=athlete.map[n+'_Shin'].getWorldQuaternion(new THREE.Quaternion());
   const toes=new THREE.Vector3(0,0,1).applyQuaternion(foot);
   assert.ok(toes.y<-.3,`dip u${u} ${n} toes point ${toes.toArray().map(x=>x.toFixed(2)).join(',')}, not down`);
   assert.ok(foot.angleTo(shin)<1e-6,`dip u${u} ${n} foot does not follow the shin`);}}
});

// Lowest point of the real shoe mesh, and the top of whatever is directly under it.
const FLOOR_TOP=-.005;
function shoeContact(s){
 const m=s.athlete.mesh,p=m.geometry.attributes.position,si=m.geometry.attributes.skinIndex,sw=m.geometry.attributes.skinWeight;
 const shoe=[];for(let i=0;i<p.count;i++){let bi=0,bw=-1;for(let k=0;k<4;k++){const w=sw.getComponent(i,k);if(w>bw){bw=w;bi=si.getComponent(i,k);}}if(/_Foot$/.test(m.skeleton.bones[bi].name))shoe.push(i);}
 s.scene.updateMatrixWorld(true);let low=null;
 for(const i of shoe){const q=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld);if(!low||q.y<low.y)low=q;}
 let top=FLOOR_TOP;s.equipment.traverse(o=>{if(!o.isMesh)return;const bb=new THREE.Box3().setFromObject(o);if(bb.max.y<.1&&low.x>=bb.min.x&&low.x<=bb.max.x&&low.z>=bb.min.z&&low.z<=bb.max.z)top=Math.max(top,bb.max.y);});
 return {gap:low.y-top,onMat:top>FLOOR_TOP};
}

test('push-up shoes rest their toes on the surface, not through it',async()=>{
 const s=await studio();
 for(const id of [6,9,15,19]){s.setExercise(id);
  for(let f=0;f<=20;f++){s.update(f/20);const c=shoeContact(s);
   assert.ok(c.gap>-.012&&c.gap<.015,`push-up ${id} u${f/20}: shoe ${c.gap.toFixed(3)} from the surface`);
   if([9,15].includes(id))assert.ok(c.onMat,`push-up ${id} u${f/20}: toes off the end of the mat`);}}
});

test('floor press shoes stand on top of the mat',async()=>{
 const s=await studio();s.setExercise(1);
 for(let f=0;f<=20;f++){s.update(f/20);const c=shoeContact(s);assert.ok(c.onMat&&c.gap>-.012&&c.gap<.015,`floor press u${f/20}: shoe ${c.gap.toFixed(3)} from the mat`);}
});

test('an exercise without a baked clip poses live and stops the previous clip',()=>{
 const clips=athlete.clips;
 try{
  athlete.update(4,.3);assert.ok(athlete.action,'baked exercise plays its clip');
  athlete.clips=clips.filter(c=>c.name!=='Exercise_24');
  assert.doesNotThrow(()=>athlete.update(24,.5));
  assert.equal(athlete.action,null,'no clip action for an unbaked exercise');
  assert.ok(Math.abs(athlete.map.Hips.position.y-poseAt(24,.5).hip[1])<1e-6,'live pose drives the hips');
  athlete.clips=clips;athlete.update(4,.3);
  assert.equal(athlete.action?.getClip().name,'Exercise_4','baked clip plays again');
 }finally{athlete.clips=clips;}
});

test('pull-up hangs from the bar with both hands gripping it',async()=>{
 const {GRIP}=await import('../dist/scene.js'),s=await studio();s.setExercise(32);
 const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(u.reduce((n,x,i)=>n+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;};
 for(let f=0;f<=20;f++){const u=f/20;s.update(u);s.scene.updateMatrixWorld(true);
  const bar=s.pullBar.getWorldPosition(new THREE.Vector3());
  for(const n of ['L','R']){const g=s.athlete.map[n+'_Hand'].localToWorld(new THREE.Vector3(...GRIP));const off=Math.hypot(g.y-bar.y,g.z-bar.z);assert.ok(off<.015,`u${u} ${n} grip ${off.toFixed(3)} off the bar`);}
  const c=shoeContact(s);assert.ok(c.gap>=.15,`u${u} feet ${c.gap.toFixed(3)} above the floor`);
  const p=poseAt(32,u);for(const i of [0,1])assert.ok(Math.abs(p.ankles[i][2]-p.hip[2])<.2,`u${u} legs hang below the hips`);
 }
 const a0=elbow(32,0,1);assert.ok(angle(a0.shoulder,a0.elbow,a0.hand)>=160,'dead hang with straight arms');
});

test('pull-up keeps the bar fixed, elbows below the hands and the head clear of the bar',async()=>{
 const s=await studio();s.setExercise(32);
 // Real chin: the lowest front vertex of the head in the standing bind pose.
 athlete.update(20,0);athlete.group.updateMatrixWorld(true);
 const hv=region.head.map(i=>[i,world(i)]),front=Math.max(...hv.map(([,v])=>v.z)),chinIdx=hv.filter(([,v])=>v.z>front-.07).reduce((a,b)=>b[1].y<a[1].y?b:a)[0];
 const sm=s.athlete.mesh,sv=i=>sm.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(sm.matrixWorld);
 const upper=[...region.head,...region.back];
 for(let f=0;f<=40;f++){const u=f/40;s.update(u);s.scene.updateMatrixWorld(true);
  const bar=s.pullBar.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(bar.y-3.6)<.01,`u${u} bar at ${bar.y.toFixed(3)}, should stay at 3.6`);
  for(const side of [-1,1]){const a=elbow(32,u,side);assert.ok(a.elbow[1]<a.hand[1],`u${u} elbow above the hand`);}
  let near=Infinity;for(const i of upper){const v=sv(i);near=Math.min(near,Math.hypot(v.y-bar.y,v.z-bar.z));}
  assert.ok(near>=.025,`u${u} head or torso ${near.toFixed(3)} from the bar axis (inside the bar)`);
 }
 s.update(.45);s.scene.updateMatrixWorld(true);
 const chin=sv(chinIdx).y;assert.ok(chin>=3.6,`chin ${chin.toFixed(3)} below the bar at the top`);
});

test('bent-over row hinges with a flat back and rows the bar to the ribs',async()=>{
 const {GRIP}=await import('../dist/scene.js'),{trunk}=await import('../dist/motion-body.js'),s=await studio();s.setExercise(33);
 const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(u.reduce((n,x,i)=>n+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;};
 const a0=poseAt(33,0).ankles;
 for(let f=0;f<=20;f++){const u=f/20,p=poseAt(33,u);s.update(u);s.scene.updateMatrixWorld(true);
  const sc=p.arms(1).shoulder.map((x,i)=>(x+p.arms(-1).shoulder[i])/2),d=sc.map((x,i)=>x-p.hip[i]),trunkDeg=Math.atan2(d[1],Math.hypot(d[0],d[2]))*180/Math.PI;
  assert.ok(trunkDeg>=40&&trunkDeg<=50,`u${u} trunk ${trunkDeg.toFixed(1)}° from horizontal`);
  for(const b of ['Spine','Chest','ShoulderLine'])for(const x of p.spine[b]??[])assert.ok(Math.abs(x)<=.1,`u${u} ${b} bend ${x}`);
  p.ankles.forEach((x,i)=>assert.ok(Math.hypot(...x.map((v,j)=>v-a0[i][j]))<1e-9,`u${u} foot moved`));
  for(const i of [0,1]){const k=angle([(i?1:-1)*HIP,...p.hip.slice(1)],p.knees[i],p.ankles[i]);assert.ok(k>=150&&k<=175,`u${u} knee ${k.toFixed(0)}°`);}
  const bar=s.bar.getWorldPosition(new THREE.Vector3());
  for(const n of ['L','R']){const g=s.athlete.map[n+'_Hand'].localToWorld(new THREE.Vector3(...GRIP));const off=Math.hypot(g.y-bar.y,g.z-bar.z);assert.ok(off<.015,`u${u} ${n} grip ${off.toFixed(3)} off the bar`);}
  const c=shoeContact(s);assert.ok(c.gap>-.012&&c.gap<.015,`u${u} shoes ${c.gap.toFixed(3)} from the floor`);
  assert.ok(clearance(33,u)>-.012-MAT,`u${u} skin below the floor`);
 }
 const b0=elbow(33,0,1);assert.ok(angle(b0.shoulder,b0.elbow,b0.hand)>=160,'arms long at the bottom');
 const p0=poseAt(33,0),barZ=(p0.arms(1).hand[2]+p0.arms(-1).hand[2])/2;
 // The bar hangs over the middle of the foot (ankle to toes ≈ 0 to .3) and in front of the knees.
 assert.ok(barZ>=p0.ankles[1][2]&&barZ<=p0.ankles[1][2]+.25,`bar z ${barZ.toFixed(2)} not over the middle of the foot`);
 assert.ok(barZ>Math.max(p0.knees[0][2],p0.knees[1][2]),'bar in front of the knees');
 const p5=poseAt(33,.5),T=trunk(p5.hip,p5.pitch,p5.spine),rib=T.at([0,-.17,.12]),top=p5.arms(1).hand;
 assert.ok(Math.abs(top[1]-rib[1])<=.12,`bar ${top[1].toFixed(2)} vs lower ribs ${rib[1].toFixed(2)} at the top`);
 const e5=elbow(33,.5,1),fwd=T.dir([0,0,1]),behind=e5.elbow.map((x,i)=>x-e5.shoulder[i]).reduce((n,x,i)=>n+x*fwd[i],0);
 assert.ok(behind<0,'elbows drive past the back at the top');
});

test('seated cable row sits upright, feet braced, handle in both hands',async()=>{
 const {GRIP}=await import('../dist/scene.js'),{ROW_SEAT}=await import('../dist/motion-body.js'),s=await studio();s.setExercise(34);
 assert.ok(s.rowCable,'seated row equipment');
 const angle=(a,b,c)=>{const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);return Math.acos(u.reduce((n,x,i)=>n+x*v[i],0)/Math.hypot(...u)/Math.hypot(...v))*180/Math.PI;};
 const ends=m=>{const c=m.getWorldPosition(new THREE.Vector3()),ax=new THREE.Vector3(0,1,0).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(m.scale.y/2);return [c.clone().sub(ax),c.clone().add(ax)];};
 const a0=poseAt(34,0).ankles;
 for(let f=0;f<=20;f++){const u=f/20,p=poseAt(34,u);s.update(u);s.scene.updateMatrixWorld(true);
  const seat=clearance(34,u,region.hips)+MAT-ROW_SEAT;assert.ok(seat>-.012&&seat<.015,`u${u} seat ${seat.toFixed(3)} from the bench top`);
  const sc=p.arms(1).shoulder.map((x,i)=>(x+p.arms(-1).shoulder[i])/2),d=sc.map((x,i)=>x-p.hip[i]),lean=Math.atan2(Math.hypot(d[0],d[2]),d[1])*180/Math.PI;
  assert.ok(lean<=15,`u${u} trunk ${lean.toFixed(1)}° from vertical`);
  p.ankles.forEach((x,i)=>assert.ok(Math.hypot(...x.map((v,j)=>v-a0[i][j]))<1e-9,`u${u} feet moved on the footplate`));
  for(const i of [0,1]){const k=angle([(i?1:-1)*HIP,...p.hip.slice(1)],p.knees[i],p.ankles[i]);assert.ok(k>=130&&k<=175,`u${u} knee ${k.toFixed(0)}°`);}
  const [h0,h1]=ends(s.rowCable.handle),axis=h1.clone().sub(h0).normalize();
  for(const n of ['L','R']){const g=s.athlete.map[n+'_Hand'].localToWorld(new THREE.Vector3(...GRIP)),off=g.clone().sub(h0);off.addScaledVector(axis,-off.dot(axis));assert.ok(off.length()<.02,`u${u} ${n} grip ${off.length().toFixed(3)} off the handle`);}
  const [c0,c1]=ends(s.rowCable.line),anchor=new THREE.Vector3(...s.rowCable.anchor);
  assert.ok(Math.min(c0.distanceTo(anchor),c1.distanceTo(anchor))<1e-6,'cable reaches the pulley');
  assert.ok(clearance(34,u)>-.012-MAT,`u${u} skin below the floor`);
 }
 const b0=elbow(34,0,1);assert.ok(angle(b0.shoulder,b0.elbow,b0.hand)>=155,'arms long at the reach');
 const {trunk}=await import('../dist/motion-body.js'),p5=poseAt(34,.5),T=trunk(p5.hip,p5.pitch,p5.spine),belly=T.at([0,-.42,.16]),top=p5.arms(1).hand.map((x,i)=>(x+p5.arms(-1).hand[i])/2);
 assert.ok(Math.hypot(...top.map((x,i)=>x-belly[i]))<=.12,'handle reaches the stomach');
 const e5=elbow(34,.5,1),fwd=T.dir([0,0,1]);assert.ok(e5.elbow.map((x,i)=>x-e5.shoulder[i]).reduce((n,x,i)=>n+x*fwd[i],0)<0,'elbows drive behind the torso');
});

test('seated cable row knees stay up, nothing passes through the bench, footplate or cable path',async()=>{
 const {ROW_SEAT,ROW_PLATE_Z,ROW_PADS}=await import('../dist/motion-body.js'),s=await studio();s.setExercise(34);
 const sm=s.athlete.mesh,pos=sm.geometry.attributes.position,sv=i=>sm.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(sm.matrixWorld);
 const si=sm.geometry.attributes.skinIndex,sw=sm.geometry.attributes.skinWeight,boneOf=i=>{let b=0,w=-1;for(let k=0;k<4;k++){const x=sw.getComponent(i,k);if(x>w){w=x;b=si.getComponent(i,k);}}return sm.skeleton.bones[b].name;};
 const shoe=[],all=[];for(let i=0;i<pos.count;i++){if(/_Foot$/.test(boneOf(i)))shoe.push(i);if(i%3===0)all.push(i);}
 for(let f=0;f<=40;f++){const u=f/40,p=poseAt(34,u);s.update(u);s.scene.updateMatrixWorld(true);
  for(const i of [0,1]){const h=[(i?1:-1)*HIP,...p.hip.slice(1)],a=p.ankles[i],k=p.knees[i],t=(k[2]-h[2])/(a[2]-h[2]),lineY=h[1]+t*(a[1]-h[1]);
   assert.ok(k[1]>lineY,`u${u} knee ${i} below the hip-ankle line (bending down through the bench)`);}
  let inBench=0;for(const i of all){const v=sv(i);if(Math.abs(v.x)<.25&&v.z>-.6&&v.z<.5&&v.y<ROW_SEAT-.012)inBench++;}
  assert.equal(inBench,0,`u${u} ${inBench} skin points inside the bench`);
  const sz=shoe.map(i=>sv(i).z),front=Math.max(...sz);
  assert.ok(front<=ROW_PLATE_Z+.012,`u${u} shoe ${(front-ROW_PLATE_Z).toFixed(3)} through the footplate`);
  assert.ok(front>=ROW_PLATE_Z-.02,`u${u} shoe ${(ROW_PLATE_Z-front).toFixed(3)} short of the footplate`);
  const [c0,c1]=(m=>{const c=m.getWorldPosition(new THREE.Vector3()),ax=new THREE.Vector3(0,1,0).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(m.scale.y/2);return [c.clone().sub(ax),c.clone().add(ax)];})(s.rowCable.line);
  for(let k=0;k<=50;k++){const q=c0.clone().lerp(c1,k/50);for(const pad of ROW_PADS){const inside=Math.abs(q.x-pad.x)<pad.w/2&&q.y>pad.y0&&q.y<pad.y1&&q.z>ROW_PLATE_Z-.005&&q.z<ROW_PLATE_Z+.055;assert.ok(!inside,`u${u} cable passes through the footplate`);}}
 }
});

test('goblet squat cups the top bell of an upright dumbbell against the chest',async()=>{
 const {GRIP}=await import('../dist/scene.js'),s=await studio();s.setExercise(21);
 const m=s.athlete.mesh,up=new THREE.Vector3(0,1,0);
 for(const u of [0,.25,.5,.75]){s.update(u);s.scene.updateMatrixWorld(true);
  const w=s.weights[0],c=w.getWorldPosition(new THREE.Vector3()),axis=new THREE.Vector3(1,0,0).applyQuaternion(w.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(Math.abs(axis.y)>=Math.cos(15*Math.PI/180),`goblet u${u} dumbbell tilted ${(Math.acos(Math.abs(axis.y))*180/Math.PI).toFixed(0)}°`);
  const top=c.clone().addScaledVector(axis,.16*Math.sign(axis.y));
  for(const n of ['L','R']){const p=s.athlete.map[n+'_Hand'].localToWorld(new THREE.Vector3(...GRIP)),below=top.y-p.y,off=Math.hypot(p.x-top.x,p.z-top.z);
   assert.ok(below>=.07&&below<=.16,`goblet u${u} ${n} grip ${below.toFixed(3)} below the top bell centre`);
   assert.ok(off<=.12,`goblet u${u} ${n} grip ${off.toFixed(3)} out from under the bell`);
   assert.ok(s.athlete.map[n+'_Forearm'].getWorldPosition(new THREE.Vector3()).y<p.y,`goblet u${u} ${n} elbow above the hand`);}
  const inv=s.athlete.map.ShoulderLine.matrixWorld.clone().invert(),h=top.clone().applyMatrix4(inv).y;
  assert.ok(h>=-.32&&h<=-.05,`goblet u${u} top bell ${h.toFixed(3)} from the shoulder line`);
  // Gap from the dumbbell's surface to the torso skin within its height.
  let gap=Infinity;for(const i of torso){const q=m.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(m.matrixWorld),t=q.clone().sub(c).dot(axis);
   if(Math.abs(t)<=.22)gap=Math.min(gap,q.clone().sub(c).addScaledVector(axis,-t).length()-.135);}
  assert.ok(gap>=-.012&&gap<=.04,`goblet u${u} dumbbell ${gap.toFixed(3)} from the chest`);}
});
