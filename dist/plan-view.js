import {exerciseById} from './catalog.js';
import {DAYS,DAY_NAMES,dayKey,removeFromPlan,startWorkout} from './store.js';
import {$,el,intIn} from './ui.js';
export function renderPlan(state,commit){
 const today=dayKey();
 $('plan-days').replaceChildren(...DAYS.map(d=>{
  const day=state.plan[d],n=day.items.length,name=DAY_NAMES[d];
  const head=el('div',{class:'day-head'},el('h2',{},name,d===today?el('span',{class:'today'},'Today'):null),n?el('span',{class:'muted'},`${n} exercise${n>1?'s':''}`):el('span',{class:'badge'},'Rest'));
  if(!n)return el('article',{class:'card day'},head,el('a',{href:'#exercises',class:'add'},'＋ Add exercise'));
  const rename=el('input',{class:'routine-name',value:day.name,placeholder:'Routine name',maxlength:'40','aria-label':`${name} routine name`});
  rename.onchange=()=>{day.name=rename.value.trim();commit();};
  return el('article',{class:'card day'},head,rename,
   el('ol',{class:'plan-items'},...day.items.map((item,index)=>{
    const e=exerciseById(item.id);
    const field=(key,label,max)=>{const input=el('input',{type:'number',inputmode:'numeric',min:'1',max:String(max),value:String(item[key]),'aria-label':`${label} for ${e.name}`});input.onchange=()=>{item[key]=intIn(input.value,1,max,item[key]);input.value=item[key];commit();};return input;};
    return el('li',{},el('a',{href:'#exercise/'+item.id},e.short),el('span',{class:'sxr'},field('sets','Sets',20),'×',field('reps','Reps',999)),
     el('button',{class:'icon',onclick:()=>{removeFromPlan(state,d,index);commit();renderPlan(state,commit);},'aria-label':`Remove ${e.name} from ${name}`},'✕'));
   })),
   el('div',{class:'day-foot'},el('a',{href:'#exercises',class:'add'},'＋ Add exercise'),
    el('button',{class:'pill solid',onclick:()=>{if(state.active&&!confirm('Replace the workout in progress?'))return;startWorkout(state,d);commit();location.hash='workout';}},'Start')));
 }));
}
