import {exerciseById,routeFor} from './catalog.js';
import {DAYS,DAY_NAMES,dayKey,load,save,addToPlan,exportBackup,readBackup} from './store.js';
import {localDate} from './stats.js';
import {selectExercise,attachViewer} from './studio-view.js';
import {initLibrary,renderLibrary} from './library-view.js';
import {renderPlan} from './plan-view.js';
import {renderWorkout} from './workout-view.js';
import {renderHome} from './home-view.js';
import {renderStats} from './stats-view.js';
import {$,el,toast} from './ui.js';
const state=load();
let warned=false,back='#home',current=null;
function commit(){if(!save(state)&&!warned){warned=true;toast('Storage is unavailable; changes last until you close this tab.');}}
function showInSlot(id,slot){attachViewer(slot);selectExercise(id);}
function pickDay(id){
 $('day-picker-exercise').textContent=exerciseById(id).name;const today=dayKey();
 $('day-picker-days').replaceChildren(...DAYS.map(d=>el('button',{value:d,class:d===today?'today':''},DAY_NAMES[d],el('small',{},state.plan[d].items.length?`${state.plan[d].items.length} planned`:'Rest'))));
 $('day-picker').onclose=()=>{const d=$('day-picker').returnValue;if(!DAYS.includes(d))return;addToPlan(state,d,id);commit();toast(`${exerciseById(id).short} added to ${DAY_NAMES[d]}`);if(current==='plan')renderPlan(state,commit);};
 $('day-picker').returnValue='';$('day-picker').showModal();
}
const VIEWS=['home','stats','exercises','exercise','plan','workout'];
function route(){
 const [view,arg]=routeFor(location.hash);
 if(view!=='exercise')back=location.hash||'#home';
 const tab=view==='exercise'?routeFor(back)[0]:view;
 for(const v of VIEWS)$('view-'+v).hidden=v!==view;
 document.querySelectorAll('[data-tab]').forEach(a=>a.dataset.tab===tab?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
 if(view==='exercises')renderLibrary(arg);
 if(view==='exercise'){const id=arg;$('detail-back').href=back;$('detail-back').textContent='‹ '+({home:'Home',stats:'Stats',plan:'Plan',workout:'Workout'}[tab]??'Exercises');$('detail-plan').onclick=()=>pickDay(id);showInSlot(id,$('viewer-home'));}
 if(view==='home')renderHome(state,commit);
 if(view==='stats')renderStats(state);
 if(view==='plan')renderPlan(state,commit);
 if(view==='workout')renderWorkout(state,commit,showInSlot);
 if(current!==null)scrollTo(0,0);
 current=view;
}
initLibrary(pickDay);
$('export-data').onclick=()=>{
 const a=el('a',{href:URL.createObjectURL(new Blob([exportBackup(state)],{type:'application/json'})),download:`form-backup-${localDate(Date.now())}.json`});
 a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Backup downloaded');
};
$('import-data-button').onclick=()=>$('import-data').click();
$('import-data').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(file.size>5e6){toast('That file is too large to be a FORM backup.');return;}
 try{
  const next=readBackup(await file.text()),n=next.history.length,w=next.weights.length;
  if(!confirm(`Replace your data with this backup? ${n} workout${n===1?'':'s'}, ${w} weigh-in${w===1?'':'s'}.`))return;
  Object.assign(state,next);commit();route();toast('Backup restored');
 }catch(error){toast(error.message);}
};
addEventListener('hashchange',route);route();
