import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cp,mkdtemp,readFile,readdir,rm,access} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {versionSource,versionDir} from '../scripts/version-assets.mjs';

test('relative script and stylesheet references get the deploy version',()=>{
 const src=`import {a} from './a.js';import('./scene.js');export * from "../b.js";
<link rel="stylesheet" href="./style.css"><script type="importmap">{"imports":{"three":"./vendor/three.module.js"}}</script><script src="./app.js"></script>`;
 const out=versionSource(src,'abc1234');
 for(const p of ["'./a.js?v=abc1234'","'./scene.js?v=abc1234'",'"../b.js?v=abc1234"','"./style.css?v=abc1234"','"./vendor/three.module.js?v=abc1234"','"./app.js?v=abc1234"'])assert.ok(out.includes(p),p);
});

test('other strings are left alone and versioning is idempotent',()=>{
 const src=`const u=new URL('./assets/'+name,import.meta.url);fetch("https://cdn.example/x.js");import x from 'three';const s='./a.js?v=old';<a href="./">home</a>`;
 assert.equal(versionSource(src,'v2'),src);
 const once=versionSource(`import './a.js';`,'v1');assert.equal(versionSource(once,'v1'),once);
});

test('versioning the real dist keeps every reference pointing at a file that exists',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'form-dist-'));
 try{
  await cp(new URL('../dist',import.meta.url),dir,{recursive:true});
  const changed=await versionDir(dir,'t3st');assert.ok(changed>=15,`only ${changed} files changed`); // 17 today; modules with no relative imports are untouched
  const files=(await readdir(dir,{recursive:true})).filter(f=>/\.(js|html|css)$/.test(f));
  let refs=0;
  for(const f of files){const text=await readFile(join(dir,f),'utf8');
   for(const [,path] of text.matchAll(/["'](\.{1,2}\/[^"'?\s]+\.(?:js|css))\?v=t3st["']/g)){refs++;await access(join(dir,f,'..',path));}}
  assert.ok(refs>=30,`only ${refs} versioned references`);
  const html=await readFile(join(dir,'index.html'),'utf8');assert.ok(html.includes('./app.js?v=t3st')&&html.includes('./style.css?v=t3st'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
