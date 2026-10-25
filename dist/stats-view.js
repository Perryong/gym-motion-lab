import {GROUPS,exerciseById} from './catalog.js';
import {weekStreak,monthCount,weightChange,heatmap,muscleSets,goalTrend,liftSeries} from './stats.js';
import {heatmapSvg,bodyFigure,liftChart} from './charts.js';
import {$,el} from './ui.js';
const RANGES=[['Week',7],['30d',30],['90d',90],['All',null]];
let range=7,lift=null;
export function renderStats(state){
 const now=Date.now(),change=weightChange(state.weights,now,30);
 const tile=(icon,label,value,cls='')=>el('div',{class:'tile'},el('small',{},el('span',{'aria-hidden':'true'},icon+' '),label),el('strong',{class:cls},value));
 $('stat-tiles').replaceChildren(
  tile('⫶▬⫶','Workouts',String(state.history.length)),tile('▦','This month',String(monthCount(state.history,now))),
  tile('▲','Week streak',String(weekStreak(state.history,now))),
  tile('⚖','Weight 30d',change===null?'—':`${change>0?'+':''}${change} kg`,change===null?'':goalTrend(state.weights.at(-1).kg-change,state.weights.at(-1).kg,state.goal)));
 $('heatmap').innerHTML=heatmapSvg(heatmap(state.history,now,52));
 renderMuscles(state);
 renderLifts(state);
}
function renderMuscles(state){
 $('range-buttons').replaceChildren(...RANGES.map(([label,days])=>el('button',{'aria-pressed':String(days===range),onclick:()=>{range=days;renderMuscles(state);}},label)));
 const sets=muscleSets(state.history,Date.now(),range);
 $('body-map').innerHTML=bodyFigure(sets);
 $('muscle-list').replaceChildren(...GROUPS.map(({key:g,label})=>[g,sets[g],label]).map(([g,n,label])=>el('li',{},el('span',{},label),el('b',{},`${n} set${n===1?'':'s'}`))));
}
function renderLifts(state){
 const series=liftSeries(state.history).filter(l=>exerciseById(l.id));
 if(!series.length){$('lifts').replaceChildren(el('p',{class:'muted chart-empty'},'Finish a workout with weighted sets to see your lifts.'));return;}
 const body=el('div'),draw=current=>{
  lift=current.id;const all=current.days.flatMap(d=>d.kgs),chart=el('div');chart.innerHTML=liftChart(current.days);
  body.replaceChildren(
   el('p',{class:'lift-summary'},el('strong',{},`${Math.max(...all)} kg`),el('span',{class:'muted'},` best · ${current.days.length} workout day${current.days.length===1?'':'s'}`)),
   chart,
   el('div',{class:'lift-legend','aria-hidden':'true'},el('span',{},el('i',{class:'swatch-line'}),'Heaviest set'),el('span',{},el('i',{class:'swatch-dot'}),'Each set')));
 };
 const current=series.find(l=>l.id===lift)??series[0];
 $('lifts').replaceChildren(el('select',{class:'lift-select','aria-label':'Exercise',onchange:e=>draw(series[e.target.selectedIndex])},...series.map(l=>el('option',{selected:l===current},exerciseById(l.id).name))),body);
 draw(current);
}
