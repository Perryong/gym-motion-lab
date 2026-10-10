export const $=id=>document.getElementById(id);
export function el(tag,props={},...kids){
 const n=document.createElement(tag);
 for(const [k,v] of Object.entries(props)){if(k==='class')n.className=v;else if(k.startsWith('on'))n[k]=v;else if(v!==false&&v!=null)n.setAttribute(k,v===true?'':v);}
 n.append(...kids.flat().filter(k=>k!=null&&k!==false));return n;
}
let hide;
export function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');clearTimeout(hide);hide=setTimeout(()=>t.classList.remove('show'),2600);}
export const intIn=(value,min,max,fallback)=>{const n=Math.round(Number(value));return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;};
