import {$,el} from './ui.js';
// Stats → Account card: a sign-in form for guests, account actions when signed in. Backup buttons sit below it in index.html.
export function renderAccount({user,status,sentTo,onSend,onReset,onSignOut,onDelete}){
 $('account-status').textContent=user?`· ${status}`:'· stored only on this device';
 if(user){
  $('account-body').replaceChildren(el('p',{class:'data-note'},`Signed in as ${user.email}`),
   el('div',{class:'data-actions'},el('button',{class:'pill',onclick:onSignOut},'Sign out'),el('button',{class:'ghost danger',onclick:onDelete},'Delete account'),el('a',{href:'privacy.html',class:'ghost'},'Privacy')));
  return;
 }
 if(sentTo){
  $('account-body').replaceChildren(el('p',{class:'data-note'},`Check your inbox at ${sentTo}. Open the link on this device to sign in.`),
   el('div',{class:'data-actions'},el('button',{class:'ghost',onclick:onReset},'Use a different email')));
  return;
 }
 const email=el('input',{type:'email',required:true,autocomplete:'email',placeholder:'you@example.com'});
 $('account-body').replaceChildren(el('p',{class:'muted data-note'},'Sign in to keep your plan, workouts and weigh-ins in your account and on all your devices. No password: we email you a link.'),
  el('form',{class:'account-form',onsubmit:e=>{e.preventDefault();onSend(email.value.trim());}},
   el('label',{class:'field'},'Email',email),el('div',{class:'data-actions'},el('button',{class:'pill solid'},'Send sign-in link'),el('a',{href:'privacy.html',class:'ghost'},'Privacy'))));
}
// A sign-in link opened on another device or browser: Firebase needs the email again. Resolves null on Cancel.
export function askEmail(){
 const dialog=$('email-dialog');$('email-confirm').value='';
 return new Promise(resolve=>{dialog.onclose=()=>resolve(dialog.returnValue==='ok'&&$('email-confirm').value.trim()||null);dialog.returnValue='';dialog.showModal();});
}
