import {allIds} from './exercises.js';
export const DAYS=['mon','tue','wed','thu','fri','sat','sun'];
export const DAY_NAMES={mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday'};
export const REST_SECONDS=90;
const KEY='gml.v1';
export const dayKey=(date=new Date())=>DAYS[(date.getDay()+6)%7];
const count=(n,fallback,max)=>Number.isInteger(n)&&n>0&&n<=max?n:fallback;
const kg=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
const valid=id=>allIds.includes(id);
const cleanSets=sets=>Array.isArray(sets)?sets.map(s=>({kg:kg(s?.kg),reps:count(s?.reps,0,999),done:s?.done===true})):[];
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
 return {plan,history,active};
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
