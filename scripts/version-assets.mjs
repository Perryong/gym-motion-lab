// Deploy step: append ?v=<version> to every relative .js/.css reference in a built
// site, so a new deploy never mixes freshly fetched modules with cached old ones.
// Usage: node scripts/version-assets.mjs <dir> <version>
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

// A quoted ./ or ../ path ending in .js or .css, with no query yet (keeps reruns idempotent).
const REF=/(["'])(\.{1,2}\/[^"'?\s]+\.(?:js|css))\1/g;
export const versionSource=(text,version)=>text.replace(REF,(_,q,path)=>`${q}${path}?v=${version}${q}`);

export async function versionDir(dir,version){
 if(!/^[\w.-]+$/.test(version))throw new Error('Version must be letters, digits, dot, dash or underscore.');
 let changed=0;
 for(const file of await readdir(dir,{recursive:true})){
  if(!/\.(js|mjs|html|css)$/.test(file))continue;
  const path=join(dir,file),text=await readFile(path,'utf8'),next=versionSource(text,version);
  if(next!==text){await writeFile(path,next);changed++;}
 }
 return changed;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const [dir,version]=process.argv.slice(2);
 if(!dir||!version){console.error('Usage: node scripts/version-assets.mjs <dir> <version>');process.exit(1);}
 console.log(`Versioned ${await versionDir(dir,version)} files with ?v=${version}`);
}
