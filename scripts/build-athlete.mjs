// Bake the original sculpt, fixed skeleton, grips and 20 clips into a local GLB.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js');
const {GLTFExporter}=await import('../dist/vendor/exporters/GLTFExporter.js');
const {mergeGeometries}=await import('../dist/vendor/utils/BufferGeometryUtils.js');
const {makeSkeleton,createExerciseClips}=await import('../dist/rig.js');
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result='data:application/octet-stream;base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}};
const data=JSON.parse(await readFile(process.argv[2],'utf8'));
const group=new THREE.Group();group.name='FORM_Athlete';const {bones,map}=makeSkeleton();group.add(map.Hips);group.updateMatrixWorld(true);
const colors={Skin:0xd29b77,Shirt:0xc43d32,Shorts:0x20282b,FocusChest:0xc43d32,Hair:0x462c20,Shoes:0xecebe5,Eye:0x302823};
const materials=Object.fromEntries(Object.entries(colors).map(([name,color])=>[name,new THREE.MeshStandardMaterial({name,color,roughness:name==='Eye'?.5:.9})]));
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
const boneIndex=name=>bones.indexOf(map[name]);
const weights=[],indices=[];const clamp=n=>Math.min(1,Math.max(0,n));const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
function interpolate(v,stops){
 if(v<=stops[0][0])return {[stops[0][1]]:1};
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const t=smooth(stops[i-1][0],stops[i][0],v);return {[stops[i-1][1]]:1-t,[stops[i][1]]:t};}
 return {[stops.at(-1)[1]]:1};
}
for(let i=0;i<data.positions.length;i+=3){const [x,y,z]=data.positions.slice(i,i+3),n=x<0?'L':'R';
 let w=interpolate(y,[[.08,'Hips'],[.27,'Spine'],[.52,'Chest'],[.76,'ShoulderLine'],[.87,'Neck'],[1.0,'Head']]);
 if(y<.05){const leg=interpolate(-y,-y<.75?[[.43,n+'_Thigh'],[.65,n+'_Shin']]:[[.98,n+'_Shin'],[1.12,n+'_Foot']]),t=1-smooth(-.19,.025,y);for(const k in w)w[k]*=1-t;for(const k in leg)w[k]=(w[k]||0)+leg[k]*t;}
 if(y>.52&&Math.abs(x)>.25){const a=Math.abs(x),arm=interpolate(a,[[.71,n+'_UpperArm'],[.87,n+'_Forearm']]),t=smooth(.25,.44,a);for(const k in w)w[k]*=1-t;for(const k in arm)w[k]=(w[k]||0)+arm[k]*t;}
 const selected=Object.entries(w).filter(([,v])=>v>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=selected.reduce((s,[,v])=>s+v,0);
 for(let j=0;j<4;j++){indices.push(selected[j]?boneIndex(selected[j][0]):0);weights.push(selected[j]?selected[j][1]/sum:0);}
}
geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
const groups=[[],[],[],[]];
for(let i=0;i<data.indices.length;i+=3){const tri=data.indices.slice(i,i+3),c=[0,0,0];for(const j of tri)for(let k=0;k<3;k++)c[k]+=data.positions[j*3+k]/3;
 const [x,y,z]=c,shirt=y>.035&&((y<.81&&Math.abs(x)<.31)||(y>.55&&y<.99&&Math.abs(x)>=.26&&Math.abs(x)<.595)),shorts=y<=.06&&y>-.36;
 const focus=shirt&&y>.49&&y<.73&&Math.abs(x)<.275&&z>.135;
 groups[focus?3:shirt?1:shorts?2:0].push(...tri);
}
const sorted=[];groups.forEach((g,i)=>{geometry.addGroup(sorted.length,g.length,i);sorted.push(...g);});geometry.setIndex(sorted);
const mesh=new THREE.SkinnedMesh(geometry,['Skin','Shirt','Shorts','FocusChest'].map(n=>materials[n]));mesh.name='AthleteSurface';mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);const skeleton=new THREE.Skeleton(bones);mesh.bind(skeleton);mesh.frustumCulled=false;
function ellipsoid(parent,name,pos,size,material){const o=new THREE.Mesh(new THREE.SphereGeometry(1,name.includes('Mesh')?8:16,name.includes('Mesh')?6:12),materials[material]);o.name=name;o.position.set(...pos);o.scale.set(...size);o.castShadow=true;parent.add(o);return o;}
// Small, intentionally restrained face and hair details share the head bone.
ellipsoid(map.Head,'Hair',[0,.224,-.019],[.134,.065,.12],'Hair');
ellipsoid(map.Head,'HairBack',[0,.150,-.084],[.12,.119,.053],'Hair');
const fringe=ellipsoid(map.Head,'HairSweep',[.024,.194,.071],[.105,.044,.061],'Hair');fringe.rotation.z=-.16;
ellipsoid(map.Head,'Nose',[0,.086,.126],[.023,.030,.027],'Skin');
ellipsoid(map.Head,'Mouth',[0,.019,.118],[.031,.004,.005],'Hair');
for(const s of [-1,1]){ellipsoid(map.Head,'Ear'+s,[s*.13,.090,0],[.022,.039,.025],'Skin');ellipsoid(map.Head,'Eye'+s,[s*.050,.119,.116],[.012,.010,.009],'Eye');const brow=ellipsoid(map.Head,'Brow'+s,[s*.05,.145,.116],[.029,.005,.009],'Hair');brow.rotation.z=s*-.07;}
for(const s of [-1,1]){const n=s<0?'L':'R';
 ellipsoid(map[n+'_GripPalm'],n+'_Palm',[0,-.026,-.041],[.067,.067,.027],'Skin');
 for(const f of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++){const length=j===1?.043:j===2?.031:.027;ellipsoid(map[n+'_'+f+j],n+'_'+f+'Mesh'+j,[0,length*.45,0],[.014,length*.65,.014],'Skin');}
 for(let j=1;j<=2;j++)ellipsoid(map[n+'_Thumb'+j],n+'_ThumbMesh'+j,[0,.017,0],[.020,.030,.019],'Skin');
 ellipsoid(map[n+'_Foot'],n+'_Trainer',[0,-.005,.055],[.092,.080,.166],'Shoes');
 ellipsoid(map[n+'_Foot'],n+'_Sole',[0,-.050,.060],[.097,.030,.174],'Shoes');
 for(let j=0;j<3;j++)ellipsoid(map[n+'_Foot'],n+'_Lace'+j,[0,.068,.038+j*.029],[.053,.007,.007],'Shorts');
}
// Merge bone-attached details by material: keep finger articulation with far
// fewer draw calls than rendering every phalanx, lace and facial part separately.
group.updateMatrixWorld(true);const detailParts=new Map(),remove=[];
group.traverse(o=>{if(!o.isMesh||o===mesh)return;let parent=o.parent;while(parent&&!parent.isBone)parent=parent.parent;if(!parent)return;
 const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.deleteAttribute('uv');const count=g.attributes.position.count,si=[],sw=[];
 for(let i=0;i<count;i++){si.push(boneIndex(parent.name),0,0,0);sw.push(1,0,0,0);}
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
 if(!detailParts.has(o.material))detailParts.set(o.material,[]);detailParts.get(o.material).push(g);remove.push(o);
});
remove.forEach(o=>o.removeFromParent());
const detailMaterials=[...detailParts.keys()],merged=mergeGeometries([...detailParts.values()].map(parts=>mergeGeometries(parts,false)),true);
const details=new THREE.SkinnedMesh(merged,detailMaterials);details.name='AppearanceDetails';group.add(details);details.bind(skeleton);details.castShadow=true;details.frustumCulled=false;
const rest=bones.map(b=>({b,position:b.position.clone(),quaternion:b.quaternion.clone()}));
const clips=createExerciseClips(group,map);
for(const r of rest){r.b.position.copy(r.position);r.b.quaternion.copy(r.quaternion);}group.updateMatrixWorld(true);
const binary=await new GLTFExporter().parseAsync(group,{binary:true,animations:clips,onlyVisible:false});
await mkdir(new URL('../dist/assets/',import.meta.url),{recursive:true});await writeFile(new URL('../dist/assets/athlete.glb',import.meta.url),Buffer.from(binary));
console.log(`GLB: ${binary.byteLength} bytes, ${bones.length} bones, ${clips.length} clips, ${geometry.index.count/3} body triangles`);
