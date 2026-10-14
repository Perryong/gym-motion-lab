import {GROUPS,exerciseById} from './catalog.js';
import {DAYS} from './store.js';
const DAY_MS=864e5;
const pad=n=>String(n).padStart(2,'0');
export const localDate=ms=>{const d=new Date(ms);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
// Calendar arithmetic via setDate so weeks stay aligned across daylight-saving changes.
const addDays=(ms,n)=>{const d=new Date(ms);d.setDate(d.getDate()+n);return d.getTime();};
export const weekStart=ms=>{const d=new Date(ms);d.setHours(0,0,0,0);return addDays(d.getTime(),-((d.getDay()+6)%7));};
const when=h=>h.finished||h.started;
export function weekStreak(history,now=Date.now()){
 const weeks=new Set(history.map(h=>weekStart(when(h))));
 let w=weekStart(now);if(!weeks.has(w))w=addDays(w,-7);
 let n=0;while(weeks.has(w)){n++;w=addDays(w,-7);}
 return n;
}
export function thisWeek(state,now=Date.now()){
 const w=weekStart(now);
 return {done:state.history.filter(h=>weekStart(when(h))===w).length,planned:DAYS.filter(d=>state.plan[d].items.length).length};
}
export function monthCount(history,now=Date.now()){
 const m=new Date(now);return history.filter(h=>{const d=new Date(when(h));return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth();}).length;
}
export function weightChange(weights,now=Date.now(),days=30){
 const cutoff=localDate(addDays(now,-days)),base=weights.findLast(w=>w.date<=cutoff),latest=weights.at(-1);
 return base&&latest?Math.round((latest.kg-base.kg)*10)/10:null;
}
export const LEVEL_MINUTES=[30,45,60];
export function heatmap(history,now=Date.now(),weeks=52){
 const minutes=new Map();
 for(const h of history){const key=localDate(h.started||h.finished),m=Math.max(0,Math.round((h.finished-h.started)/6e4))||0;minutes.set(key,(minutes.get(key)??0)+m);}
 const first=addDays(weekStart(now),-(weeks-1)*7);
 return Array.from({length:weeks},(_,w)=>Array.from({length:7},(_,d)=>{
  const date=localDate(addDays(first,w*7+d)),m=minutes.get(date)??0;
  return {date,minutes:m,level:m?1+LEVEL_MINUTES.filter(t=>m>=t).length:0};
 }));
}
export function muscleSets(history,now=Date.now(),days=null){
 const from=days===null?-Infinity:now-days*DAY_MS,out=Object.fromEntries(GROUPS.map(g=>[g.key,0]));
 for(const h of history)if(when(h)>=from)for(const e of h.entries){const g=exerciseById(e.id)?.group;if(g)out[g]+=e.sets.filter(s=>s.done).length;}
 return out;
}
// 'toward' / 'away' from the goal, or '' when there is no goal or no change.
export const goalTrend=(fromKg,toKg,goal)=>goal===null||fromKg===toKg?'':Math.abs(toKg-goal)<Math.abs(fromKg-goal)?'toward':'away';
// Calendar weeks (Monday first) covering every day of the month; month is 0-based.
export function monthGrid(year,month){
 const first=new Date(year,month,1,12).getTime(),last=new Date(year,month+1,0,12).getTime(),weeks=[];
 for(let w=weekStart(first);w<=last;w=addDays(w,7))weeks.push(Array.from({length:7},(_,d)=>{const t=addDays(w,d);return {date:localDate(t),inMonth:new Date(t).getMonth()===month};}));
 return weeks;
}
// Workouts keyed by the local date they were done, each with its completed set count.
export function workoutsByDate(history){
 const map=new Map();
 for(const h of history){const key=localDate(when(h));if(!map.has(key))map.set(key,[]);map.get(key).push({...h,sets:h.entries.reduce((n,e)=>n+e.sets.filter(s=>s.done).length,0)});}
 return map;
}
