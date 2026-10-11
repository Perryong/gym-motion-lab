import {DAYS,DAY_NAMES,dayKey,startWorkout,logWeight,setGoal} from './store.js';
import {localDate,weekStart,weekStreak,thisWeek,goalTrend} from './stats.js';
import {weightChart} from './charts.js';
import {$,el,toast} from './ui.js';
export function renderHome(state,commit){
 const now=Date.now(),today=localDate(now),start=weekStart(now);
 $('home-date').textContent=new Date(now).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
 const trained=new Set(state.history.map(h=>localDate(h.finished||h.started)));
 $('week-strip').replaceChildren(...DAYS.map((d,i)=>{
  const date=new Date(start);date.setDate(date.getDate()+i);const key=localDate(date.getTime());
  const mark=trained.has(key)?'done':state.plan[d].items.length&&key>=today?'planned':'';
  return el('li',{class:key===today?'is-today':'','aria-label':`${DAY_NAMES[d]} ${date.getDate()}${mark==='done'?', trained':mark?', planned':''}`},
   el('small',{'aria-hidden':'true'},DAY_NAMES[d].slice(0,2).toUpperCase()),el('b',{'aria-hidden':'true'},String(date.getDate())),el('i',{class:mark,'aria-hidden':'true'}));
 }));
 const a=state.active,routine=state.plan[dayKey()];
 $('today-card').replaceChildren(...(a?[el('span',{class:'icon-tile','aria-hidden':'true'},'▶'),el('div',{},el('small',{},'IN PROGRESS'),el('strong',{},a.name||DAY_NAMES[a.day])),el('a',{href:'#workout',class:'pill'},'Resume')]
  :routine.items.length?[el('span',{class:'icon-tile','aria-hidden':'true'},'⫶▬⫶'),el('div',{},el('small',{},'TODAY'),el('strong',{},routine.name||`${routine.items.length} exercises`)),el('button',{class:'pill',onclick:()=>{startWorkout(state,dayKey());commit();location.hash='workout';}},'Start')]
  :[el('span',{class:'icon-tile rest','aria-hidden':'true'},'☾'),el('div',{},el('small',{},'TODAY'),el('strong',{},'Rest day')),el('a',{href:'#plan',class:'pill'},'Plan')]));
 renderWeight(state);
 const streak=weekStreak(state.history,now),week=thisWeek(state,now);
 $('streak-card').replaceChildren(el('div',{},el('strong',{},`${streak} week streak`),el('span',{class:'muted'},`${week.done} / ${week.planned} this week · ${state.history.length} workout${state.history.length===1?'':'s'} total`)));
 $('weight-log').onclick=()=>openWeightDialog(state,commit);
}
function renderWeight(state){
 const w=state.weights,latest=w.at(-1),prev=w.at(-2),goal=state.goal;
 const delta=latest&&prev?Math.round((latest.kg-prev.kg)*10)/10:null;
 $('weight-goal').textContent=goal===null?'':`◎ ${goal}`;
 $('weight-now').replaceChildren(...(latest?[el('strong',{},String(latest.kg)),el('span',{},' kg'),delta?el('em',{class:goalTrend(prev.kg,latest.kg,goal)},`${delta<0?'↓':'↑'} ${Math.abs(delta)}`):null,el('small',{},new Date(latest.date+'T12:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}))]:[el('span',{class:'muted'},'No weight logged yet')]));
 $('weight-target').textContent=goal!==null&&latest?(latest.kg===goal?'◎ Goal reached':`◎ Goal ${goal} kg · ${Math.abs(Math.round((latest.kg-goal)*10)/10)} kg to ${latest.kg>goal?'lose':'gain'}`):'';
 $('weight-chart').innerHTML=weightChart(w,goal);
}
function openWeightDialog(state,commit){
 const dialog=$('weight-dialog');
 $('weight-kg').value=state.weights.at(-1)?.kg??'';$('weight-date').value=localDate(Date.now());$('weight-date').max=localDate(Date.now());$('weight-goal-input').value=state.goal??'';
 dialog.onclose=()=>{
  if(dialog.returnValue!=='save')return;
  try{
   if($('weight-kg').value!=='')logWeight(state,$('weight-date').value,Number($('weight-kg').value));
   setGoal(state,$('weight-goal-input').value===''?null:Number($('weight-goal-input').value));
   commit();toast('Weight saved');renderHome(state,commit);
  }catch(error){toast(error.message);}
 };
 dialog.returnValue='';dialog.showModal();
}
