// The only module that talks to Firebase: email-link sign-in and FORM's documents under apps/form/users/{uid}.
// app.js loads it with import() after first paint, so guests never wait on it.
import {initializeApp} from './vendor/firebase/firebase-app.js';
import {getAuth,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,onAuthStateChanged,signOut as authSignOut,deleteUser} from './vendor/firebase/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,getDoc,getDocs,collection,setDoc,writeBatch,onSnapshot} from './vendor/firebase/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
import {toUserDoc,toWorkoutDoc,workoutId,chunks} from './sync.js';

const app=initializeApp(firebaseConfig),auth=getAuth(app);
// Offline writes queue in IndexedDB and open tabs share one cache.
const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
const EMAIL_KEY='gml.signin-email';
const userRef=uid=>doc(db,'apps','form','users',uid),workoutsRef=uid=>collection(db,'apps','form','users',uid,'workouts');
const remember=email=>{try{localStorage.setItem(EMAIL_KEY,email);}catch{}};
const recall=()=>{try{return localStorage.getItem(EMAIL_KEY);}catch{return null;}};
const forget=()=>{try{localStorage.removeItem(EMAIL_KEY);}catch{}};

export async function sendLink(email){
 await sendSignInLinkToEmail(auth,email,{url:location.origin+location.pathname,handleCodeInApp:true});
 remember(email);
}
// 'none' when this page load is not a sign-in link; askEmail() covers a link opened on another device or browser.
// The link's query is removed whatever happens, so a reload never replays a used or cancelled link.
export async function finishLink(askEmail){
 const href=location.href;
 if(!isSignInWithEmailLink(auth,href))return 'none';
 history.replaceState(null,'',location.origin+location.pathname+location.hash);
 const email=recall()??await askEmail();
 if(!email)return 'cancelled';
 await signInWithEmailLink(auth,email,href);
 forget();
 return 'signed-in';
}
export const onUser=cb=>onAuthStateChanged(auth,u=>cb(u?{uid:u.uid,email:u.email,emailVerified:u.emailVerified,signedInAt:Date.parse(u.metadata.lastSignInTime)||0}:null));
export const signOut=()=>authSignOut(auth);

export async function loadCloud(uid){
 const [user,workouts]=await Promise.all([getDoc(userRef(uid)),getDocs(workoutsRef(uid))]);
 return {user:user.exists()?user.data():null,workouts:workouts.docs.map(d=>d.data())};
}
// Remote changes only: snapshots of this tab's own pending writes are skipped.
export const watchUser=(uid,cb)=>onSnapshot(userRef(uid),snap=>{if(snap.exists()&&!snap.metadata.hasPendingWrites)cb(snap.data());});
export const saveUser=(uid,state)=>setDoc(userRef(uid),toUserDoc(state));
// Each batch is one atomic write of at most chunks()' size.
const write=async(ops)=>{for(const part of chunks(ops)){const b=writeBatch(db);for(const op of part)op(b);await b.commit();}};
export const addWorkouts=(uid,history)=>write(history.map(h=>b=>b.set(doc(workoutsRef(uid),workoutId(h)),toWorkoutDoc(h))));
const removeWorkouts=async uid=>write((await getDocs(workoutsRef(uid))).docs.map(d=>b=>b.delete(d.ref)));
export async function replaceAll(uid,state){
 await removeWorkouts(uid);
 await saveUser(uid,state);
 await addWorkouts(uid,state.history);
}
// Firebase may answer auth/requires-recent-login; the caller sends a fresh link and calls again.
export async function deleteAccount(uid){
 await removeWorkouts(uid);
 await write([b=>b.delete(userRef(uid))]);
 await deleteUser(auth.currentUser);
}
