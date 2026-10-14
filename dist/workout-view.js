import {exerciseById} from './catalog.js';
import {DAYS,DAY_NAMES,REST_SECONDS,dayKey,startWorkout,finishWorkout,lastKg} from './store.js';
import {$,el,intIn,toast} from './ui.js';
import {parkViewer} from './studio-view.js';
let restEnd=0,ticker=null;
const clock=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
// show(id, slot) puts the shared 3D viewer into slot and plays that exercise's clip.
export function renderWorkout(state,commit,show){
 const root=$('workout-body'),a=state.active;parkViewer();
 if(!a){stopRest();root.replaceChildren(...startScreen(state,commit,show));return;}
 const entry=a.entries[a.index],e=exerciseById(entry.id),total=a.entries.length,title=a.name||DAY_NAMES[a.day];
 const go=step=>{a.index=Math.min(total-1,Math.max(0,a.index+step));commit();renderWorkout(state,commit,show);};
 const finish=()=>{
  const done=a.entries.reduce((n,x)=>n+x.sets.filter(s=>s.done).length,0);
  if(!confirm(done?`Finish and save ${done} completed set${done>1?'s':''}?`:'No sets are ticked. Finish and discard this workout?'))return;
  finishWorkout(state);commit();toast(done?`Workout saved · ${done} set${done>1?'s':''}`:'Workout discarded');renderWorkout(state,commit,show);
 };
 const previous=lastKg(state.history,entry.id),slot=el('div',{class:'workout-viewer'});
 const kgInputs=[];
 const rows=entry.sets.map((set,i)=>{
  const kg=el('input',{type:'number',inputmode:'decimal',min:'0',step:'0.5',value:set.kg??'',placeholder:'—','aria-label':`Set ${i+1} weight in kg`});
  kg.onchange=()=>{const n=Number(kg.value);set.kg=kg.value===''||!Number.isFinite(n)||n<0?null:Math.round(n*2)/2;kg.value=set.kg??'';
   entry.sets.forEach((later,j)=>{if(j>i&&!later.done&&later.kg===null){later.kg=set.kg;kgInputs[j].value=set.kg??'';}});commit();};
  kgInputs[i]=kg;
  const reps=el('input',{type:'number',inputmode:'numeric',min:'0',max:'999',value:String(set.reps),'aria-label':`Set ${i+1} reps`});
  reps.onchange=()=>{set.reps=intIn(reps.value,0,999,set.reps);reps.value=set.reps;commit();};
  const tick=el('button',{class:'tick','aria-pressed':String(set.done),'aria-label':`Set ${i+1} done`},'✓');
  tick.onclick=()=>{set.done=!set.done;tick.setAttribute('aria-pressed',String(set.done));row.classList.toggle('done',set.done);commit();if(set.done)startRest(REST_SECONDS);};
  const row=el('tr',{class:set.done?'done':''},el('td',{},String(i+1)),el('td',{class:'muted'},previous===null?'—':previous+' kg'),el('td',{},kg),el('td',{},reps),el('td',{},tick));
  return row;
 });
 root.replaceChildren(
  el('header',{class:'app-head'},el('div',{},el('h1',{id:'workout-title'},title),el('p',{},`Exercise ${a.index+1} of ${total} · ${DAY_NAMES[a.day]}`)),el('button',{class:'pill solid',onclick:finish},'Finish')),
  el('div',{class:'ex-switch'},
   el('button',{class:'icon',onclick:()=>go(-1),disabled:a.index===0,'aria-label':'Previous exercise'},'‹'),
   el('a',{href:'#exercise/'+entry.id},el('strong',{},e.name),el('small',{},`${e.target} · ${e.equipment}`)),
   el('button',{class:'icon',onclick:()=>go(1),disabled:a.index===total-1,'aria-label':'Next exercise'},'›')),
  slot,
  el('table',{class:'sets'},el('thead',{},el('tr',{},...['Set','Last','kg','Reps','Done'].map(h=>el('th',{scope:'col'},h)))),el('tbody',{},...rows)),
  el('button',{class:'add',onclick:()=>{const last=entry.sets.at(-1);entry.sets.push({kg:last?.kg??previous,reps:last?.reps??10,done:false});commit();renderWorkout(state,commit,show);}},'＋ Add set'),
  el('div',{id:'rest',class:'rest',hidden:true,role:'timer','aria-live':'off'},el('span',{},'Rest ',el('b',{id:'rest-time'},'')),
   el('button',{class:'icon',onclick:()=>startRest(Math.max(0,secondsLeft()-15)),'aria-label':'15 seconds less rest'},'−15'),
   el('button',{class:'icon',onclick:()=>startRest(secondsLeft()+15),'aria-label':'15 seconds more rest'},'+15'),
   el('button',{class:'pill',onclick:stopRest},'Skip')),
  a.index<total-1?el('button',{class:'next',onclick:()=>go(1)},`Next: ${exerciseById(a.entries[a.index+1].id).short} ›`):el('button',{class:'next',onclick:finish},'Finish workout'));
 // Text-only exercises show their steps where the athlete would be; the viewer stays parked.
 if(e.has3d)show(entry.id,slot);
 else slot.replaceChildren(el('div',{class:'card steps-card'},el('small',{},'HOW TO PERFORM'),el('ol',{},...e.steps.map(x=>el('li',{},x)))));
 if(restEnd)tickRest();
}
function startScreen(state,commit,show){
 const today=dayKey(),routine=state.plan[today];
 const begin=d=>{startWorkout(state,d);commit();renderWorkout(state,commit,show);};
 const card=(d,label)=>{const r=state.plan[d];return el('article',{class:'card today-card'},el('div',{},el('small',{},label),el('strong',{},r.name||DAY_NAMES[d]),el('span',{class:'muted'},`${r.items.length} exercise${r.items.length>1?'s':''} · `+r.items.map(i=>exerciseById(i.id).short).join(', '))),el('button',{class:'pill solid',onclick:()=>begin(d)},'Start'));};
 const others=DAYS.filter(d=>d!==today&&state.plan[d].items.length);
 return [el('header',{class:'app-head'},el('div',{},el('h1',{id:'workout-title'},'Start'),el('p',{},`Today · ${DAY_NAMES[today]}`))),
  routine.items.length?card(today,'TODAY'):el('article',{class:'card'},el('strong',{},'Rest day'),el('p',{class:'muted'},'Nothing is planned for today.')),
  ...(others.length?[el('div',{class:'section-title'},'Run another day'),...others.map(d=>card(d,DAY_NAMES[d].toUpperCase()))]:[]),
  ...(!routine.items.length&&!others.length?[el('a',{href:'#plan',class:'add'},'Build your week in Plan ›')]:[]),
  el('p',{class:'muted small'},`${state.history.length} workout${state.history.length===1?'':'s'} logged`)];
}
const secondsLeft=()=>Math.max(0,Math.ceil((restEnd-Date.now())/1000));
function startRest(seconds){restEnd=Date.now()+seconds*1000;clearInterval(ticker);ticker=setInterval(tickRest,250);tickRest();}
function stopRest(){restEnd=0;clearInterval(ticker);ticker=null;const r=$('rest');if(r)r.hidden=true;}
function tickRest(){const r=$('rest');if(!r)return;const left=secondsLeft();r.hidden=false;$('rest-time').textContent=clock(left);if(!left){stopRest();toast('Rest over — next set');}}
