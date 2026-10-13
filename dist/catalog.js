// One lookup for every exercise the screens show: the 30 with 3D motion
// (exercises.js, numeric ids) and the text-only library (library.js, 'L…' ids).
// 3D modules keep using exercises.js directly, including its internal 'abs' key.
import {exercises,allIds} from './exercises.js';
import {LIBRARY} from './library.js';

export const GROUPS=[{key:'chest',label:'Chest'},{key:'back',label:'Back'},{key:'shoulders',label:'Shoulders'},{key:'arms',label:'Arms'},{key:'legs',label:'Legs'},{key:'core',label:'Core'}];
const GROUP_3D={chest:'chest',legs:'legs',abs:'core'};

const byId=new Map();
for(const id of allIds){const e=exercises[id];
 byId.set(id,{id,name:e.name,short:e.short,group:GROUP_3D[e.group],equipment:e.equipment,target:e.focus,secondary:e.secondary.split(' · '),steps:e.steps,has3d:true});}
for(const e of LIBRARY)byId.set(e.id,{...e,has3d:false});

export const catalogIds=[...byId.keys()];
export const exerciseById=id=>byId.get(id)??null;
export const isExerciseId=id=>byId.has(id);
export const parseExerciseId=text=>{const s=String(text??'');const id=/^\d+$/.test(s)?Number(s):s;return byId.has(id)?id:null;};
export function filterExercises({group='all',query='',only3d=false}={}){
 const q=query.trim().toLowerCase();
 return catalogIds.filter(id=>{const e=byId.get(id);
  return (group==='all'||e.group===group)&&(!only3d||e.has3d)&&(!q||[e.name,e.target,e.equipment,...e.secondary].join(' ').toLowerCase().includes(q));});
}
// Hash → [view, arg]. Old #chest/#legs/#abs links open that group's list; an unknown
// exercise id opens the list instead of an empty page.
const VIEWS=['home','stats','exercises','exercise','plan','workout'],LEGACY={chest:'chest',legs:'legs',abs:'core'};
const isGroupKey=g=>GROUPS.some(x=>x.key===g);
export function routeFor(hash){
 const [view,arg]=String(hash??'').replace(/^#/,'').split('/');
 if(Object.hasOwn(LEGACY,view))return ['exercises',LEGACY[view]];
 if(view==='exercises')return isGroupKey(arg)?['exercises',arg]:['exercises'];
 if(view==='exercise'){const id=parseExerciseId(arg);return id===null?['exercises']:['exercise',id];}
 return VIEWS.includes(view)?[view]:['home'];
}
