// Vendor Firebase's prebuilt browser modules into dist/vendor/firebase, so the page never loads them from a CDN.
// Usage: node scripts/vendor-firebase.mjs <version>   (pinned: 12.19.0)
import {mkdir,writeFile} from 'node:fs/promises';

const version=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(version??'')){console.error('Usage: node scripts/vendor-firebase.mjs <version>');process.exit(1);}
const base=`https://www.gstatic.com/firebasejs/${version}/`,out=new URL('../dist/vendor/firebase/',import.meta.url);
const get=async url=>{const res=await fetch(url);if(!res.ok)throw new Error(`${res.status} ${url}`);return res.text();};
await mkdir(out,{recursive:true});
for(const name of ['firebase-app.js','firebase-auth.js','firebase-firestore.js']){
 // auth and firestore import the app module by absolute URL; point them at the local copy so all share one instance.
 const text=(await get(base+name)).replaceAll(base+'firebase-app.js','./firebase-app.js');
 if(/(?:from|import)\s*\(?\s*["']https?:/.test(text))throw new Error(`${name} still imports a remote module`);
 await writeFile(new URL(name,out),text);
}
await writeFile(new URL('LICENSE.txt',out),await get('https://raw.githubusercontent.com/firebase/firebase-js-sdk/main/LICENSE'));
console.log(`Vendored Firebase ${version} into dist/vendor/firebase`);
