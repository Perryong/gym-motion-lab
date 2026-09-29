import {bodyPose} from './motion-body.js';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0),norm=a=>mul(a,1/(Math.hypot(...a)||1));
// Leg proportions measured from the athlete model (scene units; torso is .8).
export const THIGH=.687,SHIN=.595,HIP=.124,LEG=THIGH+SHIN,ANKLE_HEIGHT=.20;
// Local ankle target for a world floor point, given the root height and pitch.
const planted=(x,z,root,rotation)=>{const y=ANKLE_HEIGHT-root[1],c=Math.cos(-rotation),s=Math.sin(-rotation);return [x,y*c-z*s,y*s+z*c];};
// Eased 0→1→0 over one cycle: controlled first phase, smooth turnaround.
export const cycleT=(u,split)=>{const c=u<split?u/split:1-(u-split)/(1-split);return c*c*(3-2*c);};
// Knee joints for fixed THIGH/SHIN legs, bending toward the pole direction.
export function solveKnees(hip,ankles,pole=[0,0,1]){
 return ankles.map((ankle,i)=>{
  const origin=[(i?1:-1)*HIP,hip[1],hip[2]],delta=sub(ankle,origin),d=Math.hypot(...delta);
  const axis=norm(delta),along=(THIGH*THIGH-SHIN*SHIN+d*d)/(2*d),bend=norm(sub(pole,mul(axis,dot(pole,axis))));
  return add(add(origin,mul(axis,along)),mul(bend,Math.sqrt(Math.max(0,THIGH*THIGH-along*along))));
 });
}
export function solveArm(shoulder,hand,pole,length=.44){
 const delta=sub(hand,shoulder),d=Math.hypot(...delta),axis=norm(delta);
 const projected=sub(pole,mul(axis,dot(pole,axis))); const bend=norm(projected);
 return add(add(shoulder,mul(axis,d/2)),mul(bend,Math.sqrt(Math.max(0,length*length-d*d/4))));
}
export function poseAt(id,phase){
 const u=((phase%1)+1)%1;
 if(id>=20)return bodyPose(id,u);
 // Controlled lowering and a slightly quicker return, with smooth turnaround.
 const t=cycleT(u,[10,12].includes(id)?.5:.56);
 const shoulder=s=>[s*.35,.54,0];
 const inclined=[0,13,17].includes(id),gravity=[0,inclined?.5:0,inclined?Math.sqrt(3)/2:1];
 const pressing=(s,bar=false,floor=false)=>{
  const spread=bar?.28:.25,depth=floor?-.10:inclined?-.06:-.16;
  const drop=Math.sqrt(.44*.44-spread*spread-depth*depth);
  const pole=[s*spread,-drop,depth];
  const bottom=[s*(.35+spread),.54-drop+gravity[1]*.44,depth+gravity[2]*.44];
  const top=[s*(bar?.63:.37),.54+gravity[1]*(bar?.82:.85),gravity[2]*(bar?.82:.85)];
  return {shoulder:shoulder(s),hand:top.map((n,i)=>n+(bottom[i]-n)*t),pole};
 };
 let arms=s=>pressing(s);
 if(id===1)arms=s=>pressing(s,false,true);
 if(id===4||id===17)arms=s=>pressing(s,true);
 if(id===7) arms=s=>({shoulder:shoulder(s),hand:[s*.13,.54-.18*t,.80-.49*t],pole:[s,-1,0]});
 if([8,3,13].includes(id)){
  const a=-.25+1.55*t;
  arms=s=>({shoulder:shoulder(s),hand:[s*(.35+Math.sin(a)*.855),.54,.855*Math.cos(a)],pole:[0,-1,0]});
 }
 if(id===5){const a=t*1.42;arms=s=>({shoulder:shoulder(s),hand:[s*.10,.54+Math.sin(a)*.72,.72*Math.cos(a)+.03],pole:[s,.1,0]});}
 let hip=[0,-.26,0],ankles,knees;
 let root=[0,.83,0],rotation=-Math.PI/2;ankles=[-.24,.24].map(x=>planted(x,.95,root,rotation));
 if([0,13,17].includes(id)){root=[0,.95,0];rotation=-Math.PI/3;ankles=[-.24,.24].map(x=>planted(x,.92,root,rotation));}
 if(id===1){root=[0,.24,0];ankles=[-.24,.24].map(x=>planted(x,1.05,root,rotation));}
 if(id===3||id===18){root=[0,1.20,0];rotation=0;ankles=[-.23,.23].map(x=>planted(x,.72,root,rotation));}
 if([6,9,15,19].includes(id)){
  root=[0,0,0];rotation=0;
  // Toe-supported shoes touch the floor (or the .045-high mat). The full leg
  // and .80 torso share one axis; shortening this span bends knees. Angles keep
  // the original 1.90-long body's shoulder heights; feet sit back so the top
  // (longest-reach) position matches it exactly.
  const raised=id===6,rings=id===19,body=LEG+.8,lift=a=>Math.asin(Math.sin(a)*1.90/body);
  const a0=raised?.82:rings?.53:.36,a1=raised?.25:rings?.33:.27;
  const foot=[0,(raised||rings)?.1995:.2445,(raised?.80:1.44)-1.90*Math.cos(a0)+body*Math.cos(lift(a0))];
  const ang=lift(a0-a1*t);
  hip=[0,foot[1]+Math.sin(ang)*LEG,foot[2]-Math.cos(ang)*LEG];
  const center=[0,foot[1]+Math.sin(ang)*body,foot[2]-Math.cos(ang)*body];
  const width=id===15?.55:.44,height=raised?.802:rings?.33:.113,handZ=raised?-.43:-.035;
  arms=s=>({shoulder:[s*.35,center[1],center[2]],hand:[s*width,height,handZ],pole:[s*.2,0,1]});
  ankles=[[-HIP,foot[1],foot[2]],[HIP,foot[1],foot[2]]];
 }
 if([10,11,12,16].includes(id)){
  // Standing: nearly straight legs from the hips (.26 below shoulder level).
  root=[0,ANKLE_HEIGHT+.26+LEG*.995,0];rotation=0;
  ankles=[-.2,.2].map(x=>planted(x,.04,root,rotation));
  if(id===10)arms=s=>({shoulder:shoulder(s),hand:[s*.07,.47,.25+.53*t],pole:[s,-1,0]});
  if(id===11||id===16){const angle=-.30+1.67*t;arms=s=>({shoulder:shoulder(s),hand:id===11&&s===-1?[-.43,-.31,.015]:[s*(.35+Math.sin(angle)*.85),.54,.85*Math.cos(angle)],pole:[0,-1,0]});}
  if(id===16){
   // Reference stance: staggered planted feet, soft knees and a small lean.
   root=[0,ANKLE_HEIGHT+.26+LEG*.93,0];ankles=[planted(-.23,.38,root,0),planted(.23,-.34,root,0)];
   const angle=-.32+1.87*t,drop=.22,radius=Math.sqrt(.85*.85-drop*drop);
   // Constant reach preserves the gentle elbow bend through the hugging arc.
   arms=s=>({shoulder:[s*.35,.54,.07],hand:[s*(.35+Math.sin(angle)*radius),.54-drop,.07+Math.cos(angle)*radius],pole:[0,-1,0]});
  }
  if(id===12){
   const u=phase%1,extension=u<.22?u/.22:u<.45?1:u<.75?1-(u-.45)/.30:0;
   arms=s=>({shoulder:shoulder(s),hand:[s*.14,.46,.30+.48*extension],pole:[s,-1,0]});
  }
 }
 if(id===18)arms=s=>({shoulder:shoulder(s),hand:[s*.39,.46,.80-.50*t],pole:[s,-.6,0]});
 if(id===14){
  root=[0,0,0];rotation=0;
  hip=[0,1.33-.30*t,.12];
  const center=[0,hip[1]+.77,hip[2]+.12];
  arms=s=>({shoulder:[s*.35,center[1],center[2]],hand:[s*.47,1.29,.12],pole:[s*.12,0,-1]});
  ankles=[[-.18,hip[1]-.80,.62],[.18,hip[1]-.80,.62]];
 }
 // Keep the head close to the shoulders, following the torso in every pose.
 const shoulderCenter=mul(add(arms(-1).shoulder,arms(1).shoulder),.5);
 const torsoAxis=norm(sub(shoulderCenter,hip));
 hip=sub(shoulderCenter,mul(torsoAxis,.8));
 // The same leg lengths are used in every exercise. Targets are reachable by
 // construction; solve the knee instead of stretching the leg.
 knees=solveKnees(hip,ankles);
 const neck=add(shoulderCenter,mul(torsoAxis,.10));
 return {t,arms,root,rotation,hip,neck,knees,ankles,prone:[6,9,15,19].includes(id)};
}
