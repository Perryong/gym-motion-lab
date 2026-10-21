import {exerciseById,routeFor} from './catalog.js';
import {DAYS,DAY_NAMES,dayKey,load,save,normalize,addToPlan,exportBackup,readBackup} from './store.js';
import {localDate} from './stats.js';
import {selectExercise,attachViewer} from './studio-view.js';
import {initLibrary,renderLibrary} from './library-view.js';
import {renderPlan} from './plan-view.js';
import {renderWorkout} from './workout-view.js';
import {renderHome} from './home-view.js';
import {renderStats} from './stats-view.js';
import {renderTextExercise} from './text-exercise-view.js';
import {$,el,toast} from './ui.js';
import {hasGuestData,mergeGuest,fromCloud,workoutId,debounced,cloudMessage,deleteMark,pendingDelete,sameUserDoc,warnOnce} from './sync.js';
import {renderAccount,askEmail} from './account-view.js';
const state=load();
let warned=false,back='#home',current=null,wantAccount=false;
// Account session: cloud is the lazily loaded cloud.js; while user is set, commit() writes to Firestore and never to gml.v1.
let cloud=null,user=null,saver=null,warn=null,unwatch=null,synced=new Set(),sentTo=null,justLinked=false;
const DELETE_KEY='gml.delete-pending',RECENT_MS=4*60e3;
const mark=v=>{try{v===undefined?void 0:v===null?localStorage.removeItem(DELETE_KEY):localStorage.setItem(DELETE_KEY,v);return localStorage.getItem(DELETE_KEY);}catch{return null;}};
function commit(){
 if(!user){if(!save(state)&&!warned){warned=true;toast('Storage is unavailable; changes last until you close this tab.');}return;}
 saver.call(state);
 // Finished workouts are their own documents; failed ones are retried on the next commit.
 const fresh=state.history.filter(h=>!synced.has(workoutId(h)));
 if(fresh.length){fresh.forEach(h=>synced.add(workoutId(h)));cloud.addWorkouts(user.uid,fresh).catch(e=>{fresh.forEach(h=>synced.delete(workoutId(h)));warn.fail(e);});}
}
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
 const shown=view==='exercise'&&!exerciseById(arg).has3d?'text-exercise':view;
 for(const v of [...VIEWS,'text-exercise'])$('view-'+v).hidden=v!==shown;
 document.querySelectorAll('[data-tab]').forEach(a=>a.dataset.tab===tab?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
 if(view==='exercises')renderLibrary(arg);
 const backLabel={home:'Home',stats:'Stats',plan:'Plan',workout:'Workout'}[tab]??'Exercises';
 if(shown==='exercise'){const id=arg;$('detail-back').href=back;$('detail-back').textContent='‹ '+backLabel;$('detail-plan').onclick=()=>pickDay(id);showInSlot(id,$('viewer-home'));}
 if(shown==='text-exercise')renderTextExercise(arg,{back,backLabel,onPlan:pickDay});
 if(view==='home')renderHome(state,commit);
 if(view==='stats'){renderStats(state);renderAccountCard();}
 $('home-signin').hidden=!cloud||!!user;
 if(view==='plan')renderPlan(state,commit);
 if(view==='workout')renderWorkout(state,commit,showInSlot);
 if(view==='stats'&&wantAccount){wantAccount=false;$('account-title').scrollIntoView();}
 else if(current!==null)scrollTo(0,0);
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
  if(!confirm(`Replace ${user?`the data in ${user.email}`:'your data'} with this backup? ${n} workout${n===1?'':'s'}, ${w} weigh-in${w===1?'':'s'}.`))return;
  if(user){saver.flush();await cloud.replaceAll(user.uid,next);synced=new Set(next.history.map(workoutId));}
  Object.assign(state,next);commit();route();toast('Backup restored');
 }catch(error){toast(error.message);}
};
function renderAccountCard(){
 renderAccount({user,sentTo,status:navigator.onLine?'synced':'offline, will sync',
  onSend:async email=>{if(!cloud){toast('Accounts are unavailable right now. Try again when online.');return;}try{await cloud.sendLink(email);mark(null);sentTo=email;renderAccountCard();}catch(e){toast(cloudMessage(e));}},
  onReset:()=>{sentTo=null;renderAccountCard();},
  onSignOut:async()=>{saver?.flush();await cloud.signOut();toast('Signed out');},
  onDelete:removeAccount});
}
// Firebase only deletes a login right after a sign-in; otherwise a fresh link finishes the deletion when opened.
async function relink(){
 await cloud.sendLink(user.email);mark(deleteMark(user.uid));
 toast('For your safety, open the new link we just emailed to finish deleting.');
}
async function removeAccount(){
 if(!confirm('Delete your FORM account and all its workouts and weigh-ins? Data saved on this device as a guest stays.'))return;
 try{
  if(Date.now()-user.signedInAt>RECENT_MS){await relink();return;}
  saver?.flush();await cloud.deleteAccount(user.uid);toast('Account deleted');
 }catch(e){
  if(e?.code!=='auth/requires-recent-login'){toast(cloudMessage(e));return;}
  try{await relink();await cloud.signOut();}catch(e2){toast(cloudMessage(e2));}
 }
}
async function onUser(u){
 unwatch?.();unwatch=null;
 if(!u){user=null;saver=null;Object.assign(state,load());route();return;}
 // The fresh link sent by Delete account: finish only for that same account, within the hour, after asking again.
 const resume=justLinked&&pendingDelete(mark(),u.uid);justLinked=false;
 if(mark()&&!resume)mark(null);
 if(resume){mark(null);
  if(confirm('Finish deleting your FORM account and all its workouts and weigh-ins?')){
   try{await cloud.deleteAccount(u.uid);toast('Account deleted');}catch(e){toast(cloudMessage(e));cloud.signOut().catch(()=>{});}
   return;
  }
 }
 try{
  const {user:doc,workouts}=await cloud.loadCloud(u.uid),account=normalize(fromCloud(doc,workouts)),guest=load();
  let next=account;
  if(!doc&&hasGuestData(guest)){next=guest;await cloud.replaceAll(u.uid,guest);}
  else if(hasGuestData(guest)){
   const m=mergeGuest(account,guest),n=m.newWorkouts.length,w=m.newWeights;
   if((n||w)&&confirm(`Add this device's ${n} workout${n===1?'':'s'} and ${w} weigh-in${w===1?'':'s'} to your account?`)){next=m.state;await cloud.addWorkouts(u.uid,m.newWorkouts);await cloud.saveUser(u.uid,next);}
  }
  else if(!doc)await cloud.saveUser(u.uid,account);
  user=u;sentTo=null;Object.assign(state,next);synced=new Set(state.history.map(workoutId));
  warn=warnOnce(toast);
  saver=debounced(s=>cloud.saveUser(u.uid,s).then(()=>warn.ok()),1000,e=>warn.fail(e));
  // Another device changed the account: take its plan, workout in progress, weigh-ins and goal unless a local save is waiting.
  const stopUser=cloud.watchUser(u.uid,d=>{
   if(saver.pending||sameUserDoc(state,d))return;
   const r=normalize(fromCloud(d,[]));Object.assign(state,{plan:r.plan,active:r.active,weights:r.weights,goal:r.goal});refresh();
  });
  // Workouts finished on another device; local ones not yet stored stay in the list.
  const stopWorkouts=cloud.watchWorkouts(u.uid,docs=>{
   const remote=normalize(fromCloud(null,docs)).history,ids=new Set(remote.map(h=>h.started));
   const next=[...remote,...state.history.filter(h=>!ids.has(h.started))].sort((a,b)=>a.started-b.started);
   if(next.map(h=>h.started).join()===state.history.map(h=>h.started).join())return;
   state.history=next;remote.forEach(h=>synced.add(workoutId(h)));refresh();
  });
  unwatch=()=>{stopUser();stopWorkouts();};
  route();
 }catch(e){
  // A sign-in whose account could not be loaded is undone, so the screen never shows a guest who is secretly signed in.
  toast(cloudMessage(e));cloud.signOut().catch(()=>{});
 }
}
// Re-render for remote changes without jumping to the top or wiping a field being typed in.
function refresh(){
 if(document.activeElement?.closest?.('#app')&&/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName))return;
 const y=scrollY;route();scrollTo(0,y);
}
addEventListener('hashchange',route);route();
$('home-signin').onclick=()=>{wantAccount=true;};
addEventListener('pagehide',()=>saver?.flush());
for(const ev of ['online','offline'])addEventListener(ev,()=>{if(current==='stats')renderAccountCard();});
// Firebase loads after first paint; if it cannot load, the app stays a guest app.
import('./cloud.js').then(async c=>{
 cloud=c;
 try{if(await c.finishLink(askEmail)==='signed-in'){justLinked=true;toast('Signed in');}}catch(e){toast(cloudMessage(e));}
 c.onUser(onUser);route();
}).catch(()=>{});
