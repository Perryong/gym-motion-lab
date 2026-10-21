// Pure helpers between FORM's state and its Firestore documents. No Firebase import, so they run in node tests.
import {normalize} from './store.js';
export const SCHEMA=1;
export const toUserDoc=(state,now=Date.now())=>({schema:SCHEMA,plan:state.plan,active:state.active,weights:state.weights,goal:state.goal,updated:now});
export const toWorkoutDoc=h=>({day:h.day,name:h.name,started:h.started,finished:h.finished,entries:h.entries});
export const workoutId=h=>String(h.started);
// Cloud data is untrusted like localStorage: the JSON returned here goes through normalize().
export function fromCloud(userDoc,workoutDocs){
 const u=userDoc&&typeof userDoc==='object'?userDoc:{};
 const history=(Array.isArray(workoutDocs)?workoutDocs:[]).filter(w=>w&&typeof w==='object').sort((a,b)=>(Number(a.started)||0)-(Number(b.started)||0));
 return JSON.stringify({plan:u.plan,active:u.active,weights:u.weights,goal:u.goal,history});
}
export const hasGuestData=s=>s.history.length>0||s.weights.length>0;
const planned=s=>Object.values(s.plan).some(d=>d.items.length);
// Guest data joins an account: new workouts by start time, weigh-ins on dates the account lacks; the account's plan, goal and active workout win when set.
export function mergeGuest(account,guest){
 const have=new Set(account.history.map(h=>h.started)),dates=new Set(account.weights.map(w=>w.date));
 const newWorkouts=guest.history.filter(h=>!have.has(h.started)),guestWeights=guest.weights.filter(w=>!dates.has(w.date));
 const state=normalize(JSON.stringify({plan:planned(account)?account.plan:guest.plan,active:account.active??guest.active,goal:account.goal??guest.goal,
  weights:[...guestWeights,...account.weights],history:[...account.history,...newWorkouts].sort((a,b)=>a.started-b.started)}));
 return {state,newWorkouts,newWeights:guestWeights.length};
}
// Firestore allows 500 writes per batch; 450 leaves room for the user document.
export const chunks=(list,size=450)=>Array.from({length:Math.ceil(list.length/size)},(_,i)=>list.slice(i*size,(i+1)*size));
// Last call wins after ms of quiet; flush() runs a waiting call now. Errors go to onError, never thrown.
export function debounced(fn,ms,onError){
 let timer=null,waiting=false,arg;
 const run=()=>{
  clearTimeout(timer);timer=null;if(!waiting)return Promise.resolve();waiting=false;
  try{return Promise.resolve(fn(arg)).catch(onError);}catch(e){onError(e);return Promise.resolve();}
 };
 return {call(x){arg=x;waiting=true;clearTimeout(timer);timer=setTimeout(run,ms);},flush:run,get pending(){return waiting;}};
}
const MESSAGES={
 'auth/invalid-email':'That email address looks wrong.',
 'auth/missing-email':'That email address looks wrong.',
 'auth/invalid-action-code':'This sign-in link has expired or was already used. Send a new one.',
 'auth/expired-action-code':'This sign-in link has expired or was already used. Send a new one.',
 'auth/too-many-requests':'Too many attempts. Try again in a few minutes.',
 'auth/network-request-failed':'You are offline. Try again when connected.',
 'unavailable':'You are offline. Try again when connected.',
 'permission-denied':'Your account could not be saved. Your changes stay on this screen.',
};
export const cloudMessage=error=>MESSAGES[error?.code]??'Something went wrong. Try again.';
// "Finish deleting after the fresh link" mark: tied to one account and valid for an hour, so it can never delete a later or different sign-in.
const DELETE_WINDOW_MS=60*60e3;
export const deleteMark=(uid,now=Date.now())=>JSON.stringify({uid,at:now});
export function pendingDelete(raw,uid,now=Date.now()){
 let m;try{m=JSON.parse(raw);}catch{return false;}
 return !!m&&m.uid===uid&&typeof m.at==='number'&&now>=m.at&&now-m.at<DELETE_WINDOW_MS;
}
// True when a remote user document says nothing new. Both sides go through normalize(), so field order and update time do not matter.
export function sameUserDoc(state,doc){
 const canon=s=>JSON.stringify(toUserDoc(normalize(JSON.stringify({...s,history:[]})),0));
 return canon(state)===canon(JSON.parse(fromCloud(doc,[])));
}
// One toast per run of failed saves; a successful save re-arms it.
export function warnOnce(show){
 let warned=false;
 return {fail(e){if(!warned){warned=true;show(cloudMessage(e));}},ok(){warned=false;}};
}
