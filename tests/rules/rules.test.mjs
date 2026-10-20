// Firestore rules for the shared project: FORM's block plus the shop's existing rules. Run with `npm test` here (needs Java 21).
import {test,before,after,beforeEach} from 'node:test';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,deleteDoc} from 'firebase/firestore';

let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-form',firestore:{rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8'),host:'127.0.0.1',port:8181}});});
after(()=>env.cleanup());
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore();
  await setDoc(doc(db,'orders/o1'),{customerUid:'alice'});
  await setDoc(doc(db,'orders/o2'),{customerUid:'bob'});
  await setDoc(doc(db,'privateOrders/p1'),{x:1});
  await setDoc(doc(db,'config/business'),{x:1});
  await setDoc(doc(db,'apps/form/users/alice'),userDoc());
  await setDoc(doc(db,'apps/form/users/alice/workouts/123'),workoutDoc(123));
 });
});

const verified={email_verified:true};
const db=(uid,claims=verified)=>env.authenticatedContext(uid,claims).firestore();
const nobody=()=>env.unauthenticatedContext().firestore();
const userDoc=(extra={})=>({schema:1,plan:{},active:null,weights:[],goal:null,updated:1,...extra});
const workoutDoc=(started,extra={})=>({day:'mon',name:'',started,finished:started+1,entries:[],...extra});
const ALICE='apps/form/users/alice',WORKOUT=ALICE+'/workouts/123';

test('owner of a FORM account can write and read it',async()=>{
 const a=db('alice');
 await assertSucceeds(setDoc(doc(a,ALICE),userDoc({goal:70})));
 await assertSucceeds(setDoc(doc(a,ALICE+'/workouts/456'),workoutDoc(456)));
 await assertSucceeds(getDoc(doc(a,ALICE)));
 await assertSucceeds(getDoc(doc(a,WORKOUT)));
});

test('nobody else can read or write it',async()=>{
 for(const other of [db('bob'),nobody()]){
  for(const path of [ALICE,WORKOUT])await assertFails(getDoc(doc(other,path)));
  await assertFails(setDoc(doc(other,ALICE),userDoc()));
  await assertFails(setDoc(doc(other,WORKOUT),workoutDoc(123)));
  for(const path of [ALICE,WORKOUT])await assertFails(deleteDoc(doc(other,path)));
 }
});

test('anonymous users cannot create FORM data',async()=>{
 const anon=db('anon',{firebase:{sign_in_provider:'anonymous'}});
 await assertFails(setDoc(doc(anon,'apps/form/users/anon'),userDoc()));
 await assertFails(setDoc(doc(anon,'apps/form/users/anon/workouts/1'),workoutDoc(1)));
});

test('bad writes are rejected',async()=>{
 const a=db('alice');
 await assertFails(setDoc(doc(a,ALICE),userDoc({schema:2})));
 await assertFails(setDoc(doc(a,ALICE),userDoc({weights:Array.from({length:2001},(_,i)=>({date:'2026-01-01',kg:70+i%10}))})));
 await assertFails(setDoc(doc(a,ALICE+'/workouts/999'),workoutDoc(123)));
 await assertFails(setDoc(doc(a,ALICE+'/workouts/124'),workoutDoc(124,{entries:Array.from({length:51},()=>({id:4,sets:[]}))})));
 await assertFails(setDoc(doc(a,ALICE+'/workouts/x'),workoutDoc('x')));
});

test('owner can delete their data',async()=>{
 const a=db('alice');
 await assertSucceeds(deleteDoc(doc(a,WORKOUT)));
 await assertSucceeds(deleteDoc(doc(a,ALICE)));
});

test('shop rules are unchanged',async()=>{
 const a=db('alice'),owner=db('shop',{owner:true});
 await assertSucceeds(getDoc(doc(a,'orders/o1')));
 for(const path of ['orders/o2','privateOrders/p1','config/business'])await assertFails(getDoc(doc(a,path)));
 for(const path of ['orders/o1','orders/o2','privateOrders/p1','config/business'])await assertSucceeds(getDoc(doc(owner,path)));
 for(const ctx of [a,owner])await assertFails(setDoc(doc(ctx,'orders/o1'),{customerUid:'alice'}));
 await assertFails(getDoc(doc(nobody(),'orders/o1')));
 await assertFails(getDoc(doc(a,'apps/other/users/alice')));
});
