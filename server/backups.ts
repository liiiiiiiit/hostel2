import {applicationEnvironment,assertDatabaseIdentity} from './environment.js';
import type { Client } from "@libsql/client";
import {
  createHash,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { readFile, mkdir, readdir, unlink, open, lstat, rmdir, mkdtemp, link, copyFile, rm } from "node:fs/promises";
import path from "node:path";
import {tmpdir} from "node:os";
import {constants} from "node:fs";
import { mediaDirectory } from "./media.js";
export interface Snapshot {
  version: 1;
  createdAt: string;
  tables: { name: string; sql: string; columns: string[]; rows: unknown[][] }[];
  indexes?: { name:string; sql:string }[];
  sequences?: {name:string;value:unknown}[];
  extraFiles?: {path:string;bytes:string;sha256:string}[];
  assets: { id: string; url: string; bytes: string; sha256: string }[];
}
export function encodeSQLValue(value:unknown):unknown{if(typeof value==='bigint')return {__yh_integer:value.toString()};if(value instanceof ArrayBuffer)return {__yh_binary:Buffer.from(value).toString('base64')};if(ArrayBuffer.isView(value))return {__yh_binary:Buffer.from(value.buffer,value.byteOffset,value.byteLength).toString('base64')};return value;}
export function decodeSQLValue(value:unknown):unknown{if(value&&typeof value==='object'&&'__yh_integer' in value)return BigInt(String(value.__yh_integer));if(value&&typeof value==='object'&&'__yh_binary' in value)return Buffer.from(String(value.__yh_binary),'base64');return value;}
const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const identifier = (name: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))
    throw new Error("Unsupported database identifier");
  return '"' + name + '"';
};
export async function exportSnapshot(client:Client,readAsset?:(asset:Record<string,unknown>)=>Promise<Buffer>,hooks?:{afterSnapshot?:()=>Promise<void>}):Promise<Snapshot>{
 const limit=Number(process.env.BACKUP_MAX_BYTES??67108864);if(!Number.isSafeInteger(limit)||limit<1048576)throw Error('Invalid BACKUP_MAX_BYTES');let captured=0;const reserve=(n:number)=>{captured+=n;if(captured>limit)throw Error('Backup exceeds BACKUP_MAX_BYTES; no backup published.');};
 await assertDatabaseIdentity(client);const tx=await client.transaction('write');let committed=false,pins='';
 const pin=async(file:string,expected?:number)=>{const info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||expected!==undefined&&info.size!==expected)throw Error('Media length disagrees with database metadata or media is not a regular file.');if(!pins)pins=await mkdtemp(path.join(tmpdir(),'yh-backup-media-'));const target=path.join(pins,crypto.randomUUID());try{await link(file,target);}catch(e){if((e as NodeJS.ErrnoException).code!=='EXDEV')throw e;await copyFile(file,target,constants.COPYFILE_EXCL);}return target;};
 try{
  if((await tx.execute('PRAGMA integrity_check')).rows.some(r=>r.integrity_check!=='ok')||(await tx.execute('PRAGMA foreign_key_check')).rows.length)throw Error('Source database integrity failed; no backup published.');
  if((await tx.execute("SELECT name FROM sqlite_master WHERE type IN ('view','trigger')")).rows.length)throw Error('Snapshot requires explicit support for views/triggers; use the WAL-safe physical relocation procedure instead of losing schema objects.');
  const schema=(await tx.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows;
  const tables:Snapshot['tables']=[];
  for(const table of schema){const result=await tx.execute('SELECT * FROM '+identifier(String(table.name)));tables.push({name:String(table.name),sql:String(table.sql),columns:result.columns,rows:result.rows.map(row=>result.columns.map(column=>{const encoded=encodeSQLValue(row[column]);reserve(Buffer.byteLength(JSON.stringify(encoded)??'null'));return encoded;}))});}
  const indexes=(await tx.execute("SELECT name,sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name")).rows.map(r=>({name:String(r.name),sql:String(r.sql)}));
  const assetTable=tables.find(t=>t.name==='media_assets');const plans:{asset:Record<string,unknown>;expected:number;file?:string;bytes?:Buffer}[]=[];
  for(const row of assetTable?.rows??[]){const asset=Object.fromEntries(assetTable!.columns.map((key,i)=>[key,decodeSQLValue(row[i])]));const expected=Number(asset.bytes);if(!Number.isSafeInteger(expected)||expected<0)throw Error('Invalid media byte count');reserve(Math.ceil(expected*4/3)+1024);plans.push({asset,expected,...(readAsset?{bytes:await readAsset(asset)}:asset.backend==='local'?{file:await pin(path.join(mediaDirectory(),path.basename(String(asset.storage_key))),expected)}:{})});}
  const extraPlans:{path:string;file:string}[]=[];
  if(!readAsset){const excluded=new Set(plans.filter(p=>p.asset.backend==='local').map(p=>path.basename(String(p.asset.storage_key))));const visit=async(relative='')=>{let entries;try{entries=await readdir(path.join(mediaDirectory(),relative),{withFileTypes:true});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT'&&!relative)return;throw e;}for(const entry of entries){const name=relative?relative+'/'+entry.name:entry.name,file=path.join(mediaDirectory(),name);if(entry.isSymbolicLink())throw Error('Media symlinks are not accepted in complete backups.');if(entry.isDirectory())await visit(name);else if(entry.isFile()&&!excluded.has(name)){reserve(Math.ceil((await lstat(file)).size*4/3)+1024);extraPlans.push({path:name,file:await pin(file)});}}};await visit();}
  const hasSequences=(await tx.execute("SELECT name FROM sqlite_master WHERE name='sqlite_sequence'")).rows.length;const sequences=hasSequences?(await tx.execute('SELECT name,seq FROM sqlite_sequence')).rows.map(r=>({name:String(r.name),value:encodeSQLValue(r.seq)})):[];
  // Pin immutable local uploads under the same write lock used by API/worker deletion,
  // then release it before reading/encoding media. Unlinks cannot invalidate the pins.
  await tx.commit();committed=true;await hooks?.afterSnapshot?.();
  const assets:Snapshot['assets']=[];
  for(const {asset,expected,file,bytes:provided} of plans){let bytes=provided;if(!bytes&&file)bytes=await readFile(file);if(!bytes){if(applicationEnvironment()==='staging')throw Error('Staging backups cannot access remote media.');const url=new URL(String(asset.url));if(url.protocol!=='https:'||!url.hostname.endsWith('.blob.vercel-storage.com'))throw Error('Unsupported asset origin');const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok||!response.body)throw Error('Asset backup download failed');const reader=response.body.getReader(),chunks:Buffer[]=[];let size=0;try{for(;;){const result=await reader.read();if(result.done)break;size+=result.value.length;if(size>expected)throw Error('Remote media exceeds its registered length');chunks.push(Buffer.from(result.value));}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}bytes=Buffer.concat(chunks);}if(bytes.length!==expected)throw Error('Media length disagrees with database metadata; no backup published.');assets.push({id:String(asset.id),url:String(asset.url),bytes:bytes.toString('base64'),sha256:hash(bytes)});}
  const extraFiles:NonNullable<Snapshot['extraFiles']>=[];for(const item of extraPlans){const bytes=await readFile(item.file);extraFiles.push({path:item.path,bytes:bytes.toString('base64'),sha256:hash(bytes)});}
  return {version:1,createdAt:new Date().toISOString(),tables,indexes,assets,...(sequences.length?{sequences}:{}),...(extraFiles.length?{extraFiles}:{})};
 }catch(e){if(!committed)await tx.rollback();throw e;}finally{tx.close();if(pins)await rm(pins,{recursive:true,force:true});}
}
function keyBytes(key: string) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error(
      "BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
    );
  return bytes;
}
export function encryptSnapshot(snapshot: Snapshot, key: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", keyBytes(key), iv),
    encrypted = Buffer.concat([
      cipher.update(JSON.stringify(snapshot)),
      cipher.final(),
    ]);
  return Buffer.concat([
    Buffer.from("YHBK1"),
    iv,
    cipher.getAuthTag(),
    encrypted,
  ]);
}
export function decryptSnapshot(bytes: Buffer, key: string): Snapshot {
  if(bytes.length<34)throw Error("Truncated backup");
  if (bytes.subarray(0, 5).toString() !== "YHBK1")
    throw new Error("Invalid backup format");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    keyBytes(key),
    bytes.subarray(5, 17),
  );
  cipher.setAuthTag(bytes.subarray(17, 33));
  const data = JSON.parse(
    Buffer.concat([
      cipher.update(bytes.subarray(33)),
      cipher.final(),
    ]).toString(),
  ) as Snapshot;
  if (
    data.version !== 1 ||
    !Array.isArray(data.tables) ||
    !Array.isArray(data.assets)
  )
    throw new Error("Unsupported backup");
  return data;
}
export async function restoreSnapshot(
  client: Client,
  snapshot: Snapshot,
  targetMediaDirectory: string,
  storage?: {
    upload: (key: string, bytes: Buffer) => Promise<string>;
    remove: (url: string) => Promise<void>;
  },
) {
  if (
    (
      await client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
    ).rows.length
  )
    throw new Error(
      "Restore requires a new empty database. Existing data is never overwritten.",
    );
  if(!storage)targetMediaDirectory=path.resolve(targetMediaDirectory);
  if (!storage) {await mkdir(targetMediaDirectory, { recursive: true,mode:0o700 });if((await lstat(targetMediaDirectory)).isSymbolicLink())throw Error('Restore media target must not be a symlink.');}
  if(storage&&(snapshot.extraFiles?.length??0)>0)throw Error('Extra media requires a local restore target.');
  if (!storage && (await readdir(targetMediaDirectory)).length)
    throw new Error("Restore requires an empty media directory.");
  const extras=snapshot.extraFiles??[];
  for(const file of extras){if(!file.path||file.path.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\0]/.test(file.path)||path.isAbsolute(file.path)||hash(Buffer.from(file.bytes,'base64'))!==file.sha256)throw Error('Invalid extra media entry');}
  for (const asset of snapshot.assets)
    if (
      !/^[a-f0-9-]{36}$/.test(asset.id) ||
      hash(Buffer.from(asset.bytes, "base64")) !== asset.sha256
    )
      throw new Error("Backup asset checksum mismatch");
  const locations = new Map<string, string>();
  const prefix = "restores/" + crypto.randomUUID() + "/";
  if (storage) {
    try {
      for (const asset of snapshot.assets)
        locations.set(
          asset.id,
          await storage.upload(
            prefix + asset.id + ".webp",
            Buffer.from(asset.bytes, "base64"),
          ),
        );
    } catch (error) {
      for (const url of locations.values())
        await storage.remove(url).catch(() => {});
      throw error;
    }
  }
  const urls = new Map(
    snapshot.assets.map((asset) => [
      asset.url,
      storage ? locations.get(asset.id)! : `/api/app?media=${asset.id}`,
    ]),
  );
  const replace = (value: unknown) => {
    if (typeof value !== "string") return value;
    for (const [from, to] of urls)
      value = (value as string).split(from).join(to);
    return value;
  };
  const tx = await client.transaction("write");
  const writtenFiles: string[] = [];
  try {
    if((await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")).rows.length)throw Error('Restore target changed; refusing to overwrite it.');
    for (const table of snapshot.tables) {
      identifier(table.name);
      if (!/^CREATE TABLE\s/i.test(table.sql) || /;\s*\S/.test(table.sql))
        throw new Error("Invalid backup schema");
      await tx.execute(table.sql);
    }
    // Create every parent table before inserting children. FK constraints remain
    // deferred only until this restore transaction commits, never disabled globally.
    await tx.execute('PRAGMA defer_foreign_keys=ON');
    for (const table of snapshot.tables) {
      for (const original of table.rows) {
        const row = original.map(v=>replace(decodeSQLValue(v)));
        if (table.name === "media_assets") {
          row[table.columns.indexOf("backend")] = storage ? "blob" : "local";
          row[table.columns.indexOf("storage_key")] = storage
            ? locations.get(String(row[table.columns.indexOf("id")]))
            : String(row[table.columns.indexOf("id")]) + ".webp";
        }
        await tx.execute({
          sql: `INSERT INTO ${identifier(table.name)} (${table.columns.map(identifier).join(",")}) VALUES(${row.map(() => "?").join(",")})`,
          args: row as (string | number | null)[],
        });
      }
    }
    if(snapshot.sequences?.length){await tx.execute('DELETE FROM sqlite_sequence');for(const sequence of snapshot.sequences){identifier(sequence.name);await tx.execute({sql:'INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)',args:[sequence.name,decodeSQLValue(sequence.value) as number]});}}
    for(const index of snapshot.indexes??[]) {
      identifier(index.name);
      if(!/^CREATE (UNIQUE )?INDEX\s/i.test(index.sql)||/;\s*\S/.test(index.sql))throw new Error('Invalid backup index');
      await tx.execute(index.sql);
    }
    if((await tx.execute('PRAGMA foreign_key_check')).rows.length)throw new Error('Backup contains inconsistent references');
    if (!storage)
      for (const asset of snapshot.assets) {
        const file = path.join(targetMediaDirectory, asset.id + ".webp");
        // Own the path before writing so even a partial write is cleaned up.
        const handle = await open(file, 'wx', 0o600);
        writtenFiles.push(file);
        try { await handle.writeFile(Buffer.from(asset.bytes, 'base64')); }
        finally { await handle.close(); }
      }
    if(storage&&extras.length)throw Error('Extra media requires a local restore target.');
    if(!storage)for(const entry of extras){const file=path.join(targetMediaDirectory,entry.path);await mkdir(path.dirname(file),{recursive:true,mode:0o700});const handle=await open(file,'wx',0o600);writtenFiles.push(file);try{await handle.writeFile(Buffer.from(entry.bytes,'base64'));}finally{await handle.close();}}
    if((await tx.execute('PRAGMA integrity_check')).rows.some(r=>r.integrity_check!=='ok'))throw Error('Restored database integrity failed.');
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    for (const file of writtenFiles) await unlink(file).catch(() => {});
    for(const entry of extras){let folder=path.dirname(path.join(targetMediaDirectory,entry.path));while(folder!==path.resolve(targetMediaDirectory)&&folder.startsWith(path.resolve(targetMediaDirectory)+path.sep)){await rmdir(folder).catch(()=>{});folder=path.dirname(folder);}}
    if (storage)
      for (const url of locations.values())
        await storage.remove(url).catch(() => {});
    throw error;
  } finally {
    tx.close();
  }
}
