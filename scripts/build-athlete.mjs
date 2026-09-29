// Skin the fitted athlete surface (scripts/export-charter-blender.py) to FORM's
// skeleton and bake the exercise clips into a local GLB. Textures ship as JPEGs
// beside the GLB and are applied at runtime by athlete.js.
import {readFile,writeFile} from 'node:fs/promises';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){return s==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:n(s,c);}});
const THREE=await import('../dist/vendor/three.module.js');
const {GLTFExporter}=await import('../dist/vendor/exporters/GLTFExporter.js');
const {mergeGeometries}=await import('../dist/vendor/utils/BufferGeometryUtils.js');
const {makeSkeleton,createExerciseClips,HAND_BIND}=await import('../dist/rig.js');
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result='data:application/octet-stream;base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}};
const data=JSON.parse(await readFile(process.argv[2],'utf8'));
const group=new THREE.Group();group.name='FORM_Athlete';const {bones,map}=makeSkeleton();group.add(map.Hips);
// Bind with straight T-pose hands: local +Y along the fingers, +Z out of the palm.
for(const n of ['L','R'])map[n+'_Hand'].quaternion.fromArray(HAND_BIND[n]);
group.updateMatrixWorld(true);
const boneIndex=name=>{const i=bones.indexOf(map[name]);if(i<0)throw new Error('Unknown bone '+name);return i;};
// Material slots: 0 body, 1 outfit, then per-group highlight regions.
const MATERIALS=['Body','Outfit','FocusChest','FocusLegs','FocusLegsSkin','FocusAbs'],slot={Material_1:0,Material_2:1};
// Highlight regions by triangle centroid in the fitted rest pose.
function region(part,[x,y,z]){
 if(part==='Object_12'&&z>.1&&Math.abs(x)<.25&&y>.55&&y<.80)return 2;   // shirt chest panel
 if(part==='Object_12'&&z>.05&&Math.abs(x)<.22&&y>.05&&y<=.55)return 5;  // shirt abdominal panel
 if(part==='Object_18')return 3;                                          // shorts: glutes, quads, hamstrings
 if(part==='Object_6'&&y>-.72&&y<.02&&Math.abs(x)<.35)return 4;           // thigh skin below the shorts
 return null;
}
const parts=data.parts.map(part=>{
 const g=new THREE.BufferGeometry(),count=part.positions.length/3,si=[],sw=[];
 g.setAttribute('position',new THREE.Float32BufferAttribute(part.positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(part.normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(part.uvs,2));
 for(const influences of part.bones){const sum=influences.reduce((n,[,w])=>n+w,0);for(let j=0;j<4;j++){si.push(influences[j]?boneIndex(influences[j][0]):0);sw.push(influences[j]?influences[j][1]/sum:0);}}
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(sw,4));
 const base=slot[part.material],buckets=new Map(),P=part.positions;
 for(let i=0;i<part.indices.length;i+=3){const tri=part.indices.slice(i,i+3),c=[0,1,2].map(k=>tri.reduce((n,j)=>n+P[j*3+k],0)/3),b=region(part.name,c)??base;
  if(!buckets.has(b))buckets.set(b,[]);buckets.get(b).push(...tri);}
 const index=[];for(const [b,tris] of buckets){g.addGroup(index.length,tris.length,b);index.push(...tris);}g.setIndex(index);
 return g;
});
const geometry=mergeGeometries(parts,false);
// mergeGeometries(…,false) drops groups; rebuild them from each part's ranges.
let offset=0;for(const g of parts){for(const gr of g.groups)geometry.addGroup(offset+gr.start,gr.count,gr.materialIndex);offset+=g.index.count;}
const materials=MATERIALS.map(name=>new THREE.MeshStandardMaterial({name,color:0xffffff,roughness:1}));
const mesh=new THREE.SkinnedMesh(geometry,materials);mesh.name='AthleteBody';mesh.frustumCulled=false;
const surface=new THREE.Group();surface.name='AthleteSurface';surface.add(mesh);group.add(surface);
mesh.bind(new THREE.Skeleton(bones));
const rest=bones.map(b=>({b,position:b.position.clone(),quaternion:b.quaternion.clone()}));
const clips=createExerciseClips(group,map);
for(const r of rest){r.b.position.copy(r.position);r.b.quaternion.copy(r.quaternion);}group.updateMatrixWorld(true);
const binary=await new GLTFExporter().parseAsync(group,{binary:true,animations:clips,onlyVisible:false});
await writeFile(new URL('../dist/assets/athlete.glb',import.meta.url),Buffer.from(binary));
console.log(`GLB: ${binary.byteLength} bytes, ${bones.length} bones, ${clips.length} clips, ${geometry.index.count/3} triangles`);
