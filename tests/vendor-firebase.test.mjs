import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,existsSync} from 'node:fs';
import {versionSource} from '../scripts/version-assets.mjs';

const dir=new URL('../dist/vendor/firebase/',import.meta.url);
const read=name=>readFileSync(new URL(name,dir),'utf8');
const MODULES=['firebase-app.js','firebase-auth.js','firebase-firestore.js'];

test('vendored firebase has no remote imports',()=>{
 for(const m of MODULES)assert.doesNotMatch(read(m),/gstatic\.com/,m);
});

test('auth and firestore share the vendored app module',()=>{
 for(const m of ['firebase-auth.js','firebase-firestore.js'])assert.match(read(m),/from\s*"\.\/firebase-app\.js"/,m);
});

test('versioning keeps one app module URL',()=>{
 assert.match(versionSource(read('firebase-auth.js'),'x'),/"\.\/firebase-app\.js\?v=x"/);
 assert.equal(versionSource('import "./vendor/firebase/firebase-app.js"','x'),'import "./vendor/firebase/firebase-app.js?v=x"');
});

test('LICENSE is shipped',()=>{
 assert.ok(existsSync(new URL('LICENSE.txt',dir)));
 assert.match(read('LICENSE.txt'),/Apache License/);
});
