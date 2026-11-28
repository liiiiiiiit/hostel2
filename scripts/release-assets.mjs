import {readFile,stat} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const manifest=JSON.parse(await readFile('dist/.vite/manifest.json','utf8')),seen=new Set();
function visit(key){if(seen.has(key))return;seen.add(key);for(const child of manifest[key]?.imports??[])visit(child);}
const entry=Object.keys(manifest).find(k=>manifest[k].isEntry);visit(entry);const files=[...new Set([...seen].flatMap(k=>[manifest[k].file,...manifest[k].css??[]]))];let js=0,gzip=0,css=0;for(const f of files){const b=await readFile('dist/'+f);if(f.endsWith('.js')){js+=b.length;gzip+=gzipSync(b).length;}else css+=b.length;}
console.log(JSON.stringify({entry:manifest[entry].file,initialJsBytes:js,initialJsGzipBytes:gzip,initialCssBytes:css,initialFiles:files.length},null,2));
