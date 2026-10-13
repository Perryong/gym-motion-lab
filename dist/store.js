import {isExerciseId} from './catalog.js';
export const DAYS=['mon','tue','wed','thu','fri','sat','sun'];
export const DAY_NAMES={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
export const REST_SECONDS=90;
const KEY='gml.v1';
export const dayKey=(date=new Date())=>DAYS[(date.getDay()+6)%7];
const count=(n,fallback,max)=>Number.isInteger(n)&&n>0&&n<=max?n:fallback;
const kg=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
const valid=isExerciseId;
const cleanSets=sets=>Array.isArray(sets)?sets.map(s=>({kg:kg(s?.kg),reps:count(s?.reps,0,999),done:s?.done===true})):[];
const bodyKg=n=>typeof n==='number'&&n>=20&&n<=400?Math.round(n*10)/10:null;
const isDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d));
// One entry per date (later wins), sorted oldest first.
const cleanWeights=list=>{const byDate=new Map();for(const w of Array.isArray(list)?list:[]){const kg=bodyKg(w?.kg);if(isDate(w?.date)&&kg!==null)byDate.set(w.date,kg);}return [...byDate].sort(([a],[b])=>a<b?-1:1).map(([date,kg])=>({date,kg}));};
const cleanEntries=entries=>Array.isArray(entries)?entries.filter(e=>valid(e?.id)).map(e=>({id:e.id,sets:cleanSets(e.sets)})):[];
// Stored data is untrusted: anything malformed falls back to an empty week rather than breaking the app.
export function normalize(raw){
 let data;try{data=JSON.parse(raw);}catch{data=null;}
 if(!data||typeof data!=='object')data={};
 const plan={};
 for(const d of DAYS){const day=data.plan?.[d];plan[d]={name:typeof day?.name==='string'?day.name.slice(0,40):'',items:Array.isArray(day?.items)?day.items.filter(i=>valid(i?.id)).map(i=>({id:i.id,sets:count(i.sets,3,20),reps:count(i.reps,10,999)})):[]};}
 const history=Array.isArray(data.history)?data.history.filter(h=>h&&typeof h==='object').map(h=>({day:DAYS.includes(h.day)?h.day:'mon',name:typeof h.name==='string'?h.name:'',started:Number(h.started)||0,finished:Number(h.finished)||0,entries:cleanEntries(h.entries)})):[];
 const a=data.active;
 const entries=cleanEntries(a?.entries);
 const active=a&&DAYS.includes(a.day)&&entries.length?{day:a.day,name:typeof a.name==='string'?a.name:'',started:Number(a.started)||0,index:Number.isInteger(a.index)&&a.index>=0&&a.index<entries.length?a.index:0,entries}:null;
 return {plan,history,active,weights:cleanWeights(data.weights),goal:bodyKg(data.goal)};
}
export function load(){try{return normalize(localStorage.getItem(KEY));}catch{return normalize(null);}}
export function save(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
export function addToPlan(state,day,id){if(!valid(id)||!DAYS.includes(day))throw new Error('Choose an available exercise and day.');state.plan[day].items.push({id,sets:3,reps:10});return state;}
export function removeFromPlan(state,day,index){state.plan[day].items.splice(index,1);return state;}
export function lastKg(history,id){
 for(let h=history.length-1;h>=0;h--)for(const e of history[h].entries)if(e.id===id){const done=e.sets.filter(s=>s.done&&s.kg!==null);if(done.length)return done.at(-1).kg;}
 return null;
}
export function startWorkout(state,day,now=Date.now()){
 const routine=state.plan[day];if(!routine?.items.length)throw new Error('This day has no exercises planned.');
 state.active={day,name:routine.name,started:now,index:0,entries:routine.items.map(i=>({id:i.id,sets:Array.from({length:i.sets},()=>({kg:lastKg(state.history,i.id),reps:i.reps,done:false}))}))};
 return state;
}
export function finishWorkout(state,now=Date.now()){
 const a=state.active;state.active=null;if(!a)return state;
 const entries=a.entries.map(e=>({id:e.id,sets:e.sets.filter(s=>s.done)})).filter(e=>e.sets.length);
 if(entries.length)state.history.push({day:a.day,name:a.name,started:a.started,finished:now,entries});
 return state;
}
export function logWeight(state,date,value){
 const kg=bodyKg(value);if(!isDate(date)||kg===null)throw new Error('Enter a date and a weight between 20 and 400 kg.');
 state.weights=cleanWeights([...state.weights,{date,kg}]);return state;
}
export function setGoal(state,value){
 if(value===null){state.goal=null;return state;}
 const kg=bodyKg(value);if(kg===null)throw new Error('Enter a goal between 20 and 400 kg.');
 state.goal=kg;return state;
}
// Backup files: a marker and version around the state. Restoring runs the same
// validation as stored data, so a hand-edited or damaged file cannot break the app.
const BACKUP_APP='form-gym',BACKUP_VERSION=1;
export const exportBackup=(state,now=Date.now())=>JSON.stringify({app:BACKUP_APP,version:BACKUP_VERSION,exported:new Date(now).toISOString(),data:state},null,1);
export function readBackup(text){
 let file;try{file=JSON.parse(text);}catch{file=null;}
 if(!file||file.app!==BACKUP_APP||file.version!==BACKUP_VERSION||typeof file.data!=='object'||!file.data)throw new Error('That file is not a FORM backup.');
 return normalize(JSON.stringify(file.data));
}
