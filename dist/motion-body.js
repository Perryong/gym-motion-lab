// Lower-body and core poses. Unlike chest poses (which derive the trunk from
// the shoulders), these set hip, pelvis pitch and spine bends, then derive the
// shoulders by forward kinematics through the rig's bone offsets.
import {THIGH,SHIN,HIP,LEG,ANKLE_HEIGHT,cycleT,solveKnees} from './motion.js';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const R={x:a=>[[1,0,0],[0,Math.cos(a),-Math.sin(a)],[0,Math.sin(a),Math.cos(a)]],y:a=>[[Math.cos(a),0,Math.sin(a)],[0,1,0],[-Math.sin(a),0,Math.cos(a)]],z:a=>[[Math.cos(a),-Math.sin(a),0],[Math.sin(a),Math.cos(a),0],[0,0,1]]};
const mm=(A,B)=>A.map(r=>B[0].map((_,j)=>r.reduce((n,v,k)=>n+v*B[k][j],0))),mv=(A,v)=>A.map(r=>r.reduce((n,x,k)=>n+x*v[k],0));
// Same rotation as THREE.Euler(flex,twist,side,'YXZ') used by rig.js.
const euler=([flex=0,side=0,twist=0]=[])=>mm(mm(R.y(twist),R.x(flex)),R.z(side));
// Standing hip height. A function: motion.js and this module import each other,
// so motion.js constants are only safe to read at call time.
export const stand=()=>ANKLE_HEIGHT+LEG*.995,MAT=.045,BACK=.15;
const smooth=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};

// Rig offsets: Spine .26 above Hips, Chest .27, ShoulderLine .27, shoulders ±.35.
export function trunk(hip,pitch,spine={}){
 let M=R.x(pitch),p=hip;const forward=mv(M,[0,0,1]);
 for(const [bone,offset] of [['Spine',.26],['Chest',.27],['ShoulderLine',.27]]){p=add(p,mv(M,[0,offset,0]));M=mm(M,euler(spine[bone]));}
 const at=v=>add(p,mv(M,v));
 return {center:p,frame:M,at,dir:v=>mv(M,v),forward,shoulder:s=>at([s*.35,0,0]),neck:at([0,.075,0])};
}
// Hip position that puts the shoulder-line centre at `center`.
export const hipFor=(center,pitch,spine)=>sub(center,trunk([0,0,0],pitch,spine).center);

function pose({t=0,hip,pitch=0,spine={},hands,ankles,knee,feet='floor',footPitch=[0,0],focus}){
 const T=trunk(hip,pitch,spine),h=s=>hands(s,T);
 return {t,body:true,prone:false,root:[0,0,0],rotation:0,hip,pitch,spine,feet,footPitch,focus,neck:T.neck,
  arms:s=>{const x=h(s);return {shoulder:T.shoulder(s),hand:x.at,pole:x.pole};},
  hands:s=>{const x=h(s);return {palm:x.palm,fingers:x.fingers};},
  ankles,knees:solveKnees(hip,ankles,knee??T.forward)};
}
const hang=(s,T)=>({at:add(T.shoulder(s),[s*.06,-.82,.04]),pole:[s*.2,0,-1],palm:[-s,0,0],fingers:'relaxed'});

export const BODY_IDS={
 // Barbell back squat: hips sit down and back, trunk leans up to ~36°.
 20:u=>{const t=cycleT(u,.56);
  return pose({t,hip:[0,stand()-.56*t,-.32*t],pitch:.62*t,focus:[0,1.1,0],
   ankles:[[-.2,ANKLE_HEIGHT,.02],[.2,ANKLE_HEIGHT,.02]],
   hands:(s,T)=>({at:add(T.at([0,-.1,-.16]),[s*.5,0,0]),pole:[s*.4,-1,-.4],palm:T.dir([0,0,1]),fingers:'grip'})});},
};
export function bodyPose(id,u){const make=BODY_IDS[id];if(!make)throw new Error('No body pose for '+id);return make(((u%1)+1)%1);}
