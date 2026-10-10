import {exercises,allIds} from './exercises.js';
import {DAYS,DAY_NAMES,dayKey,load,save,addToPlan} from './store.js';
import {selectExercise,attachViewer} from './studio-view.js';
import {initLibrary,renderLibrary,isGroup} from './library-view.js';
import {renderPlan} from './plan-view.js';
import {renderWorkout} from './workout-view.js';
import {$,el,toast} from './ui.js';
const state=load();
let warned=false,back='#exercises',current=null;
function commit(){if(!save(state)&&!warned){warned=true;toast('Storage is unavailable; changes last until you close this tab.');}}
function showInSlot(id,slot){attachViewer(slot);selectExercise(id);}
function pickDay(id){
 $('day-picker-exercise').textContent=exercises[id].name;const today=dayKey();
 $('day-picker-days').replaceChildren(...DAYS.map(d=>el('button',{value:d,class:d===today?'today':''},DAY_NAMES[d],el('small',{},state.plan[d].items.length?`${state.plan[d].items.length} planned`:'Rest'))));
 $('day-picker').onclose=()=>{const d=$('day-picker').returnValue;if(!DAYS.includes(d))return;addToPlan(state,d,id);commit();toast(`${exercises[id].short} added to ${DAY_NAMES[d]}`);if(current==='plan')renderPlan(state,commit);};
 $('day-picker').returnValue='';$('day-picker').showModal();
}
function parse(hash){
 let [view,arg]=hash.replace(/^#/,'').split('/');
 if(isGroup(view))[view,arg]=['exercises',view]; // legacy #chest #legs #abs links
 if(view==='exercise'&&!allIds.includes(Number(arg)))view='exercises';
 return ['exercises','exercise','plan','workout'].includes(view)?[view,arg]:['exercises'];
}
function route(){
 const [view,arg]=parse(location.hash);
 if(view!=='exercise')back=location.hash||'#exercises';
 const tab=view==='exercise'?parse(back)[0]:view;
 for(const v of ['exercises','exercise','plan','workout'])$('view-'+v).hidden=v!==view;
 document.querySelectorAll('[data-tab]').forEach(a=>a.dataset.tab===tab?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
 if(view==='exercises')renderLibrary(arg);
 if(view==='exercise'){const id=Number(arg);$('detail-back').href=back;$('detail-back').textContent='‹ '+({plan:'Plan',workout:'Workout'}[tab]??'Exercises');$('detail-plan').onclick=()=>pickDay(id);showInSlot(id,$('viewer-home'));}
 if(view==='plan')renderPlan(state,commit);
 if(view==='workout')renderWorkout(state,commit,showInSlot);
 if(current!==null)scrollTo(0,0);
 current=view;
}
initLibrary(pickDay);
addEventListener('hashchange',route);route();
