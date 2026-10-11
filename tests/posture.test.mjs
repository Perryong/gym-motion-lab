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
