import {exercises,displayOrder} from './exercises.js';
import {durationFor} from './rig.js';
const $=id=>document.getElementById(id);
let studio=null,id=4,phase=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=1,last=0,raf=null,inView=true,settleUntil=0;
const cards=new Array(exercises.length);
for(const [position,i] of displayOrder.entries()){
 const e=exercises[i],button=document.createElement('button');button.className='exercise-card';
 button.innerHTML=`<span class="num">${String(position+1).padStart(2,'0')}</span><span><strong>${e.short}</strong><small>${e.type} · ${e.focus}</small></span><span class="card-arrow">↗</span>`;
 button.onclick=()=>selectExercise(i);$('exercise-list').append(button);cards[i]=button;
}
$('exercise-total').textContent=String(displayOrder.length);$('counter-total').textContent=String(displayOrder.length);
function syncPlay(){$('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');}
function selectExercise(next){
 if(!Number.isInteger(next)||!displayOrder.includes(next))throw new Error('Choose an available exercise.');
 id=next;phase=0;const e=exercises[id];cards.forEach((b,i)=>{b.classList.toggle('selected',i===id);b.setAttribute('aria-pressed',String(i===id));});
 $('counter').textContent=String(displayOrder.indexOf(id)+1).padStart(2,'0');$('exercise-title').textContent=e.name;$('type-tag').textContent=e.type;$('focus-tag').textContent=e.focus;$('description').textContent=e.desc;
 $('steps').replaceChildren(...e.steps.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));$('cue-text').textContent=e.cue;$('avoid-text').textContent=e.avoid;
 $('primary-muscle').textContent=e.focus;$('secondary-muscle').textContent=e.secondary;$('breathing-text').replaceChildren(document.createTextNode(e.breath[0]+' '));const span=document.createElement('span');span.textContent=e.breath[1];$('breathing-text').append(span);
 $('equipment-tag').textContent=e.equipment.toUpperCase();
 const bodyweight=[6,9,14,15,19].includes(id),standing=[10,11,12,16].includes(id),seated=[3,18].includes(id);
 $('angle-number').textContent=bodyweight?'BW':standing?'↑':e.angle+'°';
 $('angle-description').textContent=bodyweight?'BODYWEIGHT':standing?'STANDING':seated?'SEATED POSITION':id===1?'FLOOR POSITION':'BENCH INCLINE';
 document.querySelector('.avoid').open=false;studio?.setExercise(id);setView('perspective');updateProgress();last=0;requestRender();
}
function updateProgress(){
 $('timeline').value=Math.round(phase*1000);$('progress-text').textContent=Math.round(phase*100)+'%';
 const open=[3,8,11,13,16].includes(id);
 let label=phase<([10,12].includes(id)?.5:.56)?(open?'OPENING':id===5?'OVERHEAD ARC':id===10?'EXTENDING':'LOWERING'):(open?'CLOSING':id===5?'RETURNING':id===10?'RETURNING':'PRESSING');
 if(id===12)label=phase<.22?'THROWING':phase<.66?'RELEASE':'RESET';
 $('phase-label').textContent=label;
}
function setView(view){studio?.view(view);document.querySelectorAll('[data-view]').forEach(b=>{const yes=b.dataset.view===view;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});}
$('play').onclick=()=>{playing=!playing;syncPlay();last=0;requestRender();};$('restart').onclick=()=>{phase=0;studio?.update(phase);updateProgress();requestRender();};
$('timeline').oninput=e=>{phase=Number(e.target.value)/1000;playing=false;syncPlay();studio?.update(phase);updateProgress();requestRender();};$('speed').onchange=e=>speed=Number(e.target.value);
$('muscles').onclick=()=>{const on=$('muscles').getAttribute('aria-pressed')!=='true';$('muscles').setAttribute('aria-pressed',String(on));studio?.setMuscles(on);document.querySelector('.muscle-legend').style.opacity=on?'1':'.35';};$('reset-camera').onclick=()=>setView('perspective');document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
function tab(which,focus=false){for(const name of ['how','focus']){const active=name===which;$(name+'-tab').classList.toggle('active',active);$(name+'-tab').setAttribute('aria-selected',String(active));$(name+'-tab').tabIndex=active?0:-1;$(name+'-panel').hidden=!active;}if(focus)$(which+'-tab').focus();}
for(const name of ['how','focus']){$(name+'-tab').onclick=()=>tab(name);$(name+'-tab').onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();tab(e.key==='Home'?'how':e.key==='End'?'focus':name==='how'?'focus':'how',true);}};}
selectExercise(4);syncPlay();
try{
 const [{Studio},{loadAthlete}]=await Promise.all([import('./scene.js'),import('./athlete.js')]);
 const asset=await loadAthlete();studio=new Studio($('stage'),asset);studio.setExercise(id);studio.setMuscles($('muscles').getAttribute('aria-pressed')==='true');setView(document.querySelector('[data-view].selected')?.dataset.view??'perspective');
 studio.onInvalidate=requestRender;
 for(const event of ['start','change','end'])studio.controls.addEventListener(event,()=>{settleUntil=performance.now()+300;requestRender();});
}catch(error){$('canvas-fallback').hidden=false;console.error('3D studio could not start:',error);playing=false;syncPlay();$('play').disabled=true;}
$('avatar-loading').hidden=true;
function requestRender(){if(raf===null&&inView&&!document.hidden&&studio)raf=requestAnimationFrame(frame);}
function frame(now){
 raf=null;if(!inView||document.hidden){last=0;return;}
 const delta=last?Math.min((now-last)/1000,.08):0;last=now;
 if(playing){phase=(phase+delta*speed/durationFor(id))%1;updateProgress();studio?.update(phase);}
 studio?.render();if(playing||now<settleUntil)requestRender();else last=0;
}
const visibilityObserver=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;last=0;if(inView)requestRender();else{cancelAnimationFrame(raf);raf=null;}},{threshold:0});visibilityObserver.observe($('stage'));
document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=null;}else requestRender();});
requestRender();
const lifecycle=new AbortController();
if(document.modelContext?.registerTool){try{await document.modelContext.registerTool({name:'select_chest_exercise',description:'Select a chest exercise in the movement studio and show its demonstration and instructions.',inputSchema:{type:'object',properties:{index:{type:'integer',enum:displayOrder}},required:['index'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||Object.keys(input).some(k=>k!=='index'))throw new Error('Provide only an exercise index.');selectExercise(input.index);return {exercise:exercises[id].name,index:id};}},{signal:lifecycle.signal});}catch(error){console.warn('Exercise tool registration unavailable',error);}}
addEventListener('pagehide',event=>{if(event.persisted)return;cancelAnimationFrame(raf);lifecycle.abort();visibilityObserver.disconnect();studio?.dispose();},{once:true});
