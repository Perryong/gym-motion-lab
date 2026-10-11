import {exercises,groups,allIds,GROUP_META} from './exercises.js';
import {$,el} from './ui.js';
let group='all',query='',onPlan=()=>{};
const GROUP_KEYS=Object.keys(groups);
export const isGroup=g=>GROUP_KEYS.includes(g);
export function initLibrary(plan){
 onPlan=plan;
 $('search').oninput=e=>{query=e.target.value.trim().toLowerCase();renderRows();};
 $('library-count').textContent=`${allIds.length} exercises in 3D motion`;
}
export function renderLibrary(nextGroup){
 group=isGroup(nextGroup)?nextGroup:'all';
 $('group-chips').replaceChildren(...['all',...GROUP_KEYS].map(g=>el('a',{href:g==='all'?'#exercises':'#exercises/'+g,class:'chip','aria-current':g===group?'true':false},g==='all'?'All':GROUP_META[g].label)));
 renderRows();
}
function renderRows(){
 const ids=(group==='all'?allIds:groups[group]).filter(i=>!query||[exercises[i].name,exercises[i].focus,exercises[i].equipment].join(' ').toLowerCase().includes(query));
 $('library').replaceChildren(...ids.map(i=>{const e=exercises[i];return el('div',{class:'row'},
  el('a',{href:'#exercise/'+i,class:'row-main'},el('span',{class:'thumb thumb-'+e.group,'aria-hidden':'true'},GROUP_META[e.group].label[0]),el('span',{},el('strong',{},e.name),el('small',{},`${e.focus} · ${e.equipment}`))),
  el('button',{class:'pill',onclick:()=>onPlan(i),'aria-label':`Add ${e.name} to plan`},'＋ Plan'));}),
  ...(ids.length?[]:[el('p',{class:'empty'},'No exercises match your search.')]));
}
