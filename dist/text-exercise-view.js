// Page for a library exercise without 3D motion: muscles, equipment and steps.
import {GROUPS,exerciseById} from './catalog.js';
import {$,el} from './ui.js';
const LABEL=Object.fromEntries(GROUPS.map(g=>[g.key,g.label]));
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
export function renderTextExercise(id,{back,backLabel,onPlan}){
 const e=exerciseById(id);
 $('text-back').href=back;$('text-back').textContent='‹ '+backLabel;$('text-plan').onclick=()=>onPlan(id);
 $('text-exercise').replaceChildren(
  el('h1',{id:'text-exercise-title',class:'text-title'},e.name),
  el('div',{class:'tags'},el('span',{},LABEL[e.group]),el('span',{},cap(e.equipment))),
  el('dl',{class:'muscles'},el('dt',{},'Target'),el('dd',{},cap(e.target)),
   ...(e.secondary.length?[el('dt',{},'Also working'),el('dd',{},e.secondary.map(cap).join(', '))]:[])),
  el('h2',{class:'card-title'},'How to perform'),
  el('ol',{class:'text-steps'},...e.steps.map(s=>el('li',{},s))),
  el('p',{class:'muted credit'},'Exercise text from hasaneyldrm/exercises-dataset (MIT).'));
}
