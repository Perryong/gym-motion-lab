import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {poseAt} from './motion.js';
import {Athlete} from './athlete.js';
const v=a=>new THREE.Vector3(...a),Y=new THREE.Vector3(0,1,0);
export class Studio {
 constructor(host,asset){
  this.host=host;this.id=0;this.phase=0;this.highlight=false;
  this.scene=new THREE.Scene();
  this.camera=new THREE.PerspectiveCamera(37,1,.05,60);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,matchMedia('(max-width: 760px)').matches?1.5:2));
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(0,0);this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;host.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.enablePan=false;this.controls.minDistance=3;this.controls.maxDistance=8;this.controls.maxPolarAngle=Math.PI*.49;this.controls.minPolarAngle=.15;
  this.scene.add(new THREE.HemisphereLight(0xf5f2ec,0x30383b,2.0));
  const key=new THREE.DirectionalLight(0xfff3e5,3.3);key.position.set(-3,7,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.5,far:18});key.shadow.bias=-.0005;this.scene.add(key);
  const rim=new THREE.DirectionalLight(0xd4e1f2,1.5);rim.position.set(3,3,-3);this.scene.add(rim);const fill=new THREE.DirectionalLight(0xb1c4d6,1.7);fill.position.set(-4,2,-2);this.scene.add(fill);
  this.materials={shirt:new THREE.MeshStandardMaterial({color:0xc94032,roughness:.95}),hair:new THREE.MeshStandardMaterial({color:0x4e2f21,roughness:1}),eye:new THREE.MeshStandardMaterial({color:0x29201b,roughness:.7}),skin:new THREE.MeshStandardMaterial({color:0xdca782,roughness:.85,metalness:0}),muscle:new THREE.MeshStandardMaterial({color:0xb5ed60,roughness:.46,metalness:.08,emissive:0x2e4808,emissiveIntensity:.22}),joint:new THREE.MeshStandardMaterial({color:0xb98162,roughness:.85}),shorts:new THREE.MeshStandardMaterial({color:0x262c28,roughness:.9}),shoe:new THREE.MeshStandardMaterial({color:0xf1f0e9,roughness:.85}),pad:new THREE.MeshStandardMaterial({color:0x242d24,roughness:.85}),metal:new THREE.MeshStandardMaterial({color:0x78846e,roughness:.4,metalness:.72}),dark:new THREE.MeshStandardMaterial({color:0x20271e,roughness:.45,metalness:.45}),chrome:new THREE.MeshStandardMaterial({color:0xd1d8cc,roughness:.24,metalness:.85}),lime:new THREE.MeshStandardMaterial({color:0xc2f85a,roughness:.45,emissive:0x526e10,emissiveIntensity:.3})};
  const floor=this.mesh(new THREE.CylinderGeometry(2.1,2.16,.11,80),this.materials.pad,this.scene);floor.position.y=-.06;floor.receiveShadow=true;
  const circle=new THREE.Mesh(new THREE.RingGeometry(1.99,2.005,100),this.materials.lime);circle.rotation.x=-Math.PI/2;circle.position.y=.003;this.scene.add(circle);
  const grid=new THREE.GridHelper(4.0,20,0x4c593d,0x37432e);grid.position.y=.006;grid.material.transparent=true;grid.material.opacity=.3;this.scene.add(grid);
  this.createAthlete(asset);
  this.equipment=new THREE.Group();this.scene.add(this.equipment);
  this.setExercise(0);this.view('perspective');
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 createAthlete(asset){
  this.root=new THREE.Group();this.scene.add(this.root);this.athlete=new Athlete(asset);this.root.add(this.athlete.group);
  this.weights=[this.dumbbell(),this.dumbbell()];
  this.bar=this.makeBar();this.root.add(this.bar);this.plate=this.makePlate();this.root.add(this.plate);this.ball=this.ellipsoid(this.root,[0,0,0],[.19,.19,.19],this.materials.dark);
 }
 mesh(geometry,material,parent){const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 ellipsoid(parent,pos,scale,mat){const m=this.mesh(new THREE.SphereGeometry(1,24,16),mat,parent);m.position.set(...pos);m.scale.set(...scale);return m;}
 box(parent,pos,size,mat){const m=this.mesh(new THREE.BoxGeometry(...size),mat,parent);m.position.set(...pos);return m;}
 rod(parent,a,b,r,mat){const m=this.mesh(new THREE.CylinderGeometry(r,r,1,16),mat,parent);this.link(m,a,b);return m;}
 segment(r1,r2,mat){return this.mesh(new THREE.CylinderGeometry(r2,r1,1,24),mat,this.root);}
 link(mesh,a,b){const va=v(a),vb=v(b),delta=vb.clone().sub(va);mesh.position.copy(va.add(vb).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(Y,delta.clone().normalize());mesh.scale.y=delta.length();}
 dumbbell(){const g=new THREE.Group();this.root.add(g);this.rod(g,[-.22,0,0],[.22,0,0],.027,this.materials.chrome);for(const s of [-1,1]){const p=this.mesh(new THREE.CylinderGeometry(.135,.135,.12,12),this.materials.dark,g);p.rotation.z=Math.PI/2;p.position.x=s*.16;const cap=this.mesh(new THREE.CylinderGeometry(.055,.055,.008,24),this.materials.lime,g);cap.rotation.z=Math.PI/2;cap.position.x=s*.226;}return g;}
 makeShoe(){const g=new THREE.Group();this.root.add(g);this.ellipsoid(g,[0,.02,.035],[.091,.070,.175],this.materials.shoe);this.box(g,[0,-.028,.04],[.17,.035,.28],this.materials.shoe);for(let i=0;i<3;i++)this.box(g,[0,.080,.04+i*.025],[.075,.009,.009],this.materials.metal);return g;}
 makePlate(){const g=new THREE.Group();const plate=this.mesh(new THREE.CylinderGeometry(.23,.23,.065,40),this.materials.dark,g);plate.rotation.z=Math.PI/2;const hub=this.mesh(new THREE.CylinderGeometry(.060,.060,.069,24),this.materials.chrome,g);hub.rotation.z=Math.PI/2;return g;}
 makeBar(){const g=new THREE.Group();this.rod(g,[-1.24,0,0],[1.24,0,0],.025,this.materials.chrome);for(const s of [-1,1]){const p=this.mesh(new THREE.CylinderGeometry(.26,.26,.10,40),this.materials.dark,g);p.rotation.z=Math.PI/2;p.position.x=s*1.02;const ring=this.mesh(new THREE.CylinderGeometry(.12,.12,.108,24),this.materials.metal,g);ring.rotation.z=Math.PI/2;ring.position.x=s*1.02;}return g;}
 clearEquipment(){while(this.equipment.children.length){const c=this.equipment.children[0];c.traverse(o=>{if(o.geometry)o.geometry.dispose();});this.equipment.remove(c);}}
 setExercise(id){this.id=id;this.clearEquipment();const e=this.equipment,m=this.materials;
  this.machineArms=[];this.cables=[];this.rings=[];
  const seated=[3,18].includes(id),bench=[0,2,4,5,7,8,13,17].includes(id),inclined=[0,13,17].includes(id);
  if(id===6){this.box(e,[0,.35,-.67],[1.35,.70,.88],m.pad);this.box(e,[0,.717,-.67],[1.38,.034,.91],m.joint);}
  else if([1,9,15].includes(id)){this.box(e,[0,.025,.15],[1.55,.04,3.0],m.shorts);}
  else if(seated){
   this.box(e,[0,.71,.15],[.7,.12,.64],m.pad);this.box(e,[0,1.40,-.22],[.65,1.2,.14],m.pad);
   for(const side of [-1,1]){this.rod(e,[side*.86,.08,-.30],[side*.86,2.3,-.30],.047,m.metal);this.rod(e,[side*.86,.08,-.30],[side*.86,.08,.70],.05,m.metal);}
   this.rod(e,[-.86,2.3,-.3],[.86,2.3,-.3],.055,m.metal);this.box(e,[0,1.0,-.5],[.4,1.6,.24],m.dark);
   for(let n=0;n<8;n++)this.box(e,[0,.38+n*.09,-.65],[.4,.065,.10],m.metal);
   for(const side of [-1,1]){
    const arm=this.mesh(new THREE.CylinderGeometry(.026,.026,1,16),m.metal,e);
    const grip=this.mesh(new THREE.CylinderGeometry(.033,.033,.19,16),m.dark,e);this.machineArms.push({arm,grip,side});
   }
  }else if(bench){
   const pad=new THREE.Group();e.add(pad);
   if(inclined){pad.position.set(0,.64,.12);pad.rotation.x=Math.PI/6;this.box(pad,[0,0,-.55],[.61,.13,1.32],m.pad);this.box(e,[0,.57,.29],[.61,.14,.18],m.pad);}
   else this.box(e,[0,.59,-.37],[.61,.14,1.52],m.pad);
   this.rod(e,[0,.51,-.72],[0,.13,-.72],.06,m.metal);this.rod(e,[0,.51,.30],[0,.13,.30],.06,m.metal);
   for(const z of [-.72,.30]){this.rod(e,[-.54,.1,z],[.54,.1,z],.065,m.metal);for(const side of [-1,1])this.box(e,[side*.5,.08,z],[.15,.12,.22],m.dark);}
   this.rod(e,[0,.43,-.72],[0,.43,.30],.05,m.metal);
   if([4,17].includes(id)){for(const side of [-1,1]){const height=id===17?1.90:1.60;this.rod(e,[side*1.0,.08,-.88],[side*1.0,height+.08,-.88],.045,m.metal);this.rod(e,[side*1.0,.09,-1.15],[side*1.0,.09,.5],.055,m.metal);this.rod(e,[side*1.,height,-.88],[side*1.,height,-.66],.035,m.metal);}}
  }else if([11,16].includes(id)){
   const pulleyHeight=id===16?1.70:2.01;
   for(const side of (id===11?[1]:[-1,1])){
    this.rod(e,[side*1.45,.08,-.40],[side*1.45,2.65,-.40],.055,m.metal);this.rod(e,[side*1.45,.08,-.75],[side*1.45,.08,.4],.06,m.metal);
    this.box(e,[side*1.45,.85,-.50],[.30,1.40,.20],m.dark);
    const pulley=this.mesh(new THREE.TorusGeometry(.10,.018,10,24),m.metal,e);pulley.position.set(side*1.45,pulleyHeight,-.24);pulley.rotation.y=Math.PI/2;
    const line=this.mesh(new THREE.CylinderGeometry(.008,.008,1,8),m.chrome,e);const grip=this.mesh(new THREE.CylinderGeometry(.018,.018,.16,12),m.dark,e);
    for(const end of [-1,1]){const cap=this.mesh(new THREE.CylinderGeometry(.032,.032,.012,20),m.dark,grip);cap.position.y=end*.085;}
    const straps=[-1,1].map(()=>this.mesh(new THREE.CylinderGeometry(.012,.012,1,8),m.dark,e));
    this.cables.push({side,line,grip,straps,anchor:[side*1.45,pulleyHeight,-.24]});
   }
  }else if(id===14){
   for(const side of [-1,1]){for(const z of [-.40,.65]){this.rod(e,[side*.47,.08,z],[side*.47,1.29,z],.044,m.metal);this.rod(e,[side*.75,.08,z],[side*.20,.08,z],.05,m.metal);}this.rod(e,[side*.47,1.29,-.50],[side*.47,1.29,.78],.045,m.dark);}
  }else if(id===19){
   for(const side of [-1,1]){
    this.rod(e,[side*1.0,.05,-.55],[side*1.,2.80,-.55],.045,m.metal);this.rod(e,[side*1.,.05,-.85],[side*1.,.05,.2],.06,m.metal);
    this.rod(e,[side*.44,.57,-.035],[side*.44,2.8,-.035],.017,m.shorts);
    const ring=this.mesh(new THREE.TorusGeometry(.12,.022,12,40),m.metal,e);ring.rotation.y=Math.PI/2;ring.position.set(side*.44,.45,-.035);this.rings.push(ring);
   }
   this.rod(e,[-1.0,2.80,-.035],[1.0,2.80,-.035],.045,m.metal);
  }
  this.weights.forEach(w=>w.visible=[0,1,2,5,7,8,13].includes(id));if(id===5)this.weights[1].visible=false;
  this.bar.visible=[4,17].includes(id);this.plate.visible=id===10;this.ball.visible=id===12;
  this.update(0);this.view('perspective');
 }
 update(phase){this.phase=phase;const p=poseAt(this.id,phase);this.root.position.set(...p.root);this.root.rotation.set(p.rotation,0,0);
  this.athlete.update(this.id,phase);
  const a=p.arms(-1);
  this.weights.forEach((w,i)=>{const hand=p.arms(i===0?-1:1).hand;w.position.set(...hand);w.rotation.set(0,0,[7,8,13].includes(this.id)?Math.PI/2:0);
   if(this.id===5){w.position.set(0,hand[1],hand[2]);w.rotation.z=Math.PI/2;}
  });
  if([4,17].includes(this.id)){this.bar.position.set(0,a.hand[1],a.hand[2]);}
  this.root.updateMatrixWorld(true);
  for(const {arm,grip,side} of this.machineArms??[]){const hand=this.root.localToWorld(v(p.arms(side).hand));this.link(arm,[side*.86,2.3,-.30],hand.toArray());grip.position.copy(hand);}
  for(const {line,grip,straps,side,anchor} of this.cables??[]){
   const bone=this.athlete.map[(side<0?'L':'R')+'_Hand'];
   const palm=this.athlete.map[(side<0?'L':'R')+'_GripPalm'];
   const point=a=>palm.localToWorld(v(a));
   grip.position.copy(point([0,.013,-.006]));
   grip.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion())).multiply(new THREE.Quaternion().setFromAxisAngle(v([0,0,1]),-Math.PI/2));
   // The strap swivels around the barrel toward cable tension.
   const barrelAxis=v([0,1,0]).applyQuaternion(grip.quaternion),pull=v(anchor).sub(grip.position);
   pull.addScaledVector(barrelAxis,-pull.dot(barrelAxis)).normalize();
   const attachment=grip.position.clone().addScaledVector(pull,.15);this.link(line,anchor,attachment.toArray());
   straps.forEach((strap,i)=>this.link(strap,point([i? .08:-.08,.013,-.006]).toArray(),attachment.toArray()));
  }
  if(this.id===10&&this.plate)this.plate.position.set(0,a.hand[1],a.hand[2]);
  if(this.id===12&&this.ball){
   const u=phase%1;
   if(u<.22){this.ball.visible=true;this.ball.position.set(0,a.hand[1],a.hand[2]+.04);}
   else if(u<.66){const time=(u-.22)*1.7;this.ball.visible=true;this.ball.position.set(0,.46+1.35*time-4.9*time*time,.82+3.2*time);}
   else {this.ball.visible=u>=.83;if(this.ball.visible)this.ball.position.set(0,a.hand[1],a.hand[2]+.04);}
  }
  this.materials.muscle.emissiveIntensity=this.highlight?.12+.15*(1-p.t):0;
 }
 setMuscles(on){this.highlight=on;this.athlete.setMuscles(on);this.onInvalidate?.();}
 view(view){const target=[3,10,11,12,14,16,18,19].includes(this.id)?[0,1.28,.10]:[6,9,15].includes(this.id)?[0,.55,.2]:[0,.83,0];this.controls.target.set(...target);const offset=view==='front'?[0,1.6,5.3]:view==='side'?[5.3,1.35,.0]:[3.7,2.5,4.0];this.camera.position.copy(v(target).add(v(offset)));this.controls.update();this.onInvalidate?.();}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.onInvalidate?.();}
 render(){this.controls.update();this.renderer.render(this.scene,this.camera);}
 dispose(){this.observer.disconnect();this.controls.dispose();this.athlete.dispose();const materials=new Set(Object.values(this.materials));this.scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});materials.forEach(m=>m.dispose());this.renderer.dispose();this.renderer.domElement.remove();}
}
