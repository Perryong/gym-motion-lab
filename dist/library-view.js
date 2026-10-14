import {GROUPS,filterExercises,exerciseById} from './catalog.js';
import {$,el} from './ui.js';
let group='all',query='',only3d=false,onPlan=()=>{};
const LABEL=Object.fromEntries(GROUPS.map(g=>[g.key,g.label]));
export function initLibrary(plan){
 onPlan=plan;
 $('search').oninput=e=>{query=e.target.value;renderRows();};
 $('library-count').textContent=`${filterExercises().length} exercises · ${filterExercises({only3d:true}).length} in 3D`;
}
export function renderLibrary(nextGroup){
 group=Object.hasOwn(LABEL,nextGroup)?nextGroup:'all';
 $('group-chips').replaceChildren(...['all',...GROUPS.map(g=>g.key)].map(g=>el('a',{href:g==='all'?'#exercises':'#exercises/'+g,class:'chip','aria-current':g===group?'true':false},g==='all'?'All':LABEL[g])),
  // Re-render only the rows so the pressed button (and keyboard focus) stays put.
  el('button',{class:'chip chip-toggle','aria-pressed':String(only3d),onclick:e=>{only3d=!only3d;e.currentTarget.setAttribute('aria-pressed',String(only3d));renderRows();}},'In 3D'));
 renderRows();
}
function renderRows(){
 const ids=filterExercises({group,query,only3d});
 $('library').replaceChildren(...ids.map(id=>{const e=exerciseById(id);return el('div',{class:'row'},
  el('a',{href:'#exercise/'+id,class:'row-main'},el('span',{class:'thumb thumb-'+e.group,'aria-hidden':'true'},LABEL[e.group][0]),
   el('span',{},el('strong',{},e.name,e.has3d?el('span',{class:'badge-3d'},'3D'):null),el('small',{},`${e.target} · ${e.equipment}`))),
  el('button',{class:'pill',onclick:()=>onPlan(id),'aria-label':`Add ${e.name} to plan`},'＋ Plan'));}),
  ...(ids.length?[]:[el('p',{class:'empty'},'No exercises match.')]));
}
