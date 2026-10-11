import {DAYS,DAY_NAMES,dayKey,startWorkout,logWeight,setGoal} from './store.js';
import {localDate,weekStreak,thisWeek,goalTrend,monthGrid,workoutsByDate} from './stats.js';
import {weightChart} from './charts.js';
import {$,el,toast} from './ui.js';
export function renderHome(state,commit){
 const now=Date.now();
 $('home-date').textContent=new Date(now).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
 renderCalendar(state);
 const a=state.active,routine=state.plan[dayKey()];
 $('today-card').replaceChildren(...(a?[el('span',{class:'icon-tile','aria-hidden':'true'},'▶'),el('div',{},el('small',{},'IN PROGRESS'),el('strong',{},a.name||DAY_NAMES[a.day])),el('a',{href:'#workout',class:'pill'},'Resume')]
  :routine.items.length?[el('span',{class:'icon-tile','aria-hidden':'true'},'⫶▬⫶'),el('div',{},el('small',{},'TODAY'),el('strong',{},routine.name||`${routine.items.length} exercises`)),el('button',{class:'pill',onclick:()=>{startWorkout(state,dayKey());commit();location.hash='workout';}},'Start')]
  :[el('span',{class:'icon-tile rest','aria-hidden':'true'},'☾'),el('div',{},el('small',{},'TODAY'),el('strong',{},'Rest day')),el('a',{href:'#plan',class:'pill'},'Plan')]));
 renderWeight(state);
 const streak=weekStreak(state.history,now),week=thisWeek(state,now);
 $('streak-card').replaceChildren(el('div',{},el('strong',{},`${streak} week streak`),el('span',{class:'muted'},`${week.done} / ${week.planned} this week · ${state.history.length} workout${state.history.length===1?'':'s'} total`)));
 $('weight-log').onclick=()=>openWeightDialog(state,commit);
}
let shown=null,picked=null;
const WEEKDAYS=['Mo','Tu','We','Th','Fr','Sa','Su'];
const longDate=key=>new Date(key+'T12:00').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'});
function renderCalendar(state){
 const now=new Date(),today=localDate(now.getTime());
 shown??={y:now.getFullYear(),m:now.getMonth()};picked??=today;
 const done=workoutsByDate(state.history),routineOn=key=>state.plan[dayKey(new Date(key+'T12:00'))];
 const mark=key=>done.has(key)?'done':key>=today&&routineOn(key).items.length?'planned':'';
 const move=step=>{const d=new Date(shown.y,shown.m+step,1);shown={y:d.getFullYear(),m:d.getMonth()};renderCalendar(state);};
 const onMonth=shown.y===now.getFullYear()&&shown.m===now.getMonth();
 $('cal-title').textContent=new Date(shown.y,shown.m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
 $('cal-prev').onclick=()=>move(-1);$('cal-next').onclick=()=>move(1);
 $('cal-today').hidden=onMonth;$('cal-today').onclick=()=>{shown=null;picked=today;renderCalendar(state);};
 $('cal-grid').replaceChildren(...WEEKDAYS.map(d=>el('span',{class:'cal-dow','aria-hidden':'true'},d)),
  ...monthGrid(shown.y,shown.m).flat().map(({date,inMonth})=>{const m=mark(date),day=Number(date.slice(8));
   return el('button',{class:['cal-day',inMonth?'':'out',date===today?'is-today':''].join(' ').trim(),'aria-pressed':String(date===picked),
    'aria-label':`${longDate(date)}${m==='done'?', trained':m?', planned':''}`,onclick:()=>{picked=date;renderCalendar(state);}},
    el('b',{'aria-hidden':'true'},String(day)),el('i',{class:m,'aria-hidden':'true'}));}));
 const list=done.get(picked)??[],routine=routineOn(picked);
 $('day-detail').replaceChildren(el('small',{},picked===today?'TODAY':longDate(picked).toUpperCase()),
  ...(list.length?list.map(h=>el('span',{},`${h.name||DAY_NAMES[h.day]+' workout'} · ${h.sets} set${h.sets===1?'':'s'}`))
   :[el('span',{class:'muted'},picked>=today&&routine.items.length?`Planned · ${routine.name||routine.items.length+' exercises'}`:picked<today?'No workout logged':'Rest day')]));
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
