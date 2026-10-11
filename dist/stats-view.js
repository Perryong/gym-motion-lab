import {GROUP_META} from './exercises.js';
import {weekStreak,monthCount,weightChange,heatmap,muscleSets,goalTrend} from './stats.js';
import {heatmapSvg,bodyFigure} from './charts.js';
import {$,el} from './ui.js';
const RANGES=[['Week',7],['30d',30],['90d',90],['All',null]];
let range=7;
export function renderStats(state){
 const now=Date.now(),change=weightChange(state.weights,now,30);
 const tile=(icon,label,value,cls='')=>el('div',{class:'tile'},el('small',{},el('span',{'aria-hidden':'true'},icon+' '),label),el('strong',{class:cls},value));
 $('stat-tiles').replaceChildren(
  tile('⫶▬⫶','Workouts',String(state.history.length)),tile('▦','This month',String(monthCount(state.history,now))),
  tile('▲','Week streak',String(weekStreak(state.history,now))),
  tile('⚖','Weight 30d',change===null?'—':`${change>0?'+':''}${change} kg`,change===null?'':goalTrend(state.weights.at(-1).kg-change,state.weights.at(-1).kg,state.goal)));
 $('heatmap').innerHTML=heatmapSvg(heatmap(state.history,now,52));
 renderMuscles(state);
}
function renderMuscles(state){
 $('range-buttons').replaceChildren(...RANGES.map(([label,days])=>el('button',{'aria-pressed':String(days===range),onclick:()=>{range=days;renderMuscles(state);}},label)));
 const sets=muscleSets(state.history,Date.now(),range);
 $('body-map').innerHTML=bodyFigure(sets);
 $('muscle-list').replaceChildren(...Object.entries(sets).map(([g,n])=>el('li',{},el('span',{},GROUP_META[g].title),el('b',{},`${n} set${n===1?'':'s'}`))));
}
