import {existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {applicationEnvironment,canonicalPath} from './environment.js';
// A backup typo must never initialize a new, empty source database.
export function assertExistingBackupSource(url:string){
 if(!url.startsWith('file:'))return;
 const file=url.slice(5);if(/[?#%\0]/.test(file)||!existsSync(file)||!statSync(file).isFile())throw Error('Backup source database must already exist at an explicit literal file path.');
}
export function assertPersistentConfiguration(env:NodeJS.ProcessEnv=process.env,url=env.DATABASE_URL){
 if(env.PERSISTENT_STORAGE_MODE!=='managed')return;
 if(applicationEnvironment(env)!=='production')throw Error('Managed production storage must not be used for staging/testing.');
 const expected={DATABASE_URL:'file:/opt/hostel2/data/hostel.db',MEDIA_DIRECTORY:'/opt/hostel2/media',BACKUP_DIRECTORY:'/opt/hostel2/backups'};
 if(url!==expected.DATABASE_URL||env.DATABASE_URL!==expected.DATABASE_URL||env.MEDIA_STORAGE!=='local')throw Error('Managed production requires the explicit local persistent database and media backend.');
 for(const [key,value] of Object.entries(expected)){if(env[key]!==value)throw Error('Managed persistent path mismatch: '+key);const file=key==='DATABASE_URL'?value.slice(5):value;if(canonicalPath(file)!==file)throw Error('Managed persistent paths must not be symlinks.');}
 if(!existsSync(expected.DATABASE_URL.slice(5)))throw Error('Persistent database is absent. Discover and copy existing storage offline; refusing to create an empty replacement.');
 if(env.REQUIRE_MIGRATION_BACKUP!=='true')throw Error('Managed persistence requires the pre-migration backup guard.');
}
export function assertRestoreSeparation(sourceUrl:string,targetUrl:string,sourceMedia:string,targetMedia:string){
 const file=(url:string)=>{if(!url.startsWith('file:'))return new URL(url).href;const raw=url.slice(5);if(/[?#%\0]/.test(raw))throw Error('Use literal canonical file paths for recovery.');return canonicalPath(raw);};
 const source=file(sourceUrl),target=file(targetUrl);if(source===target)throw Error('Recovery target aliases the live database.');
 if(targetUrl.startsWith('file:')&&existsSync(target))throw Error('Recovery CLI requires a new, absent database target.');
 const media=canonicalPath(sourceMedia),restored=canonicalPath(targetMedia);if(media===restored||restored.startsWith(media+path.sep)||media.startsWith(restored+path.sep))throw Error('Recovery media must be separate from live uploads.');
 if(targetUrl.startsWith('file:')&&(target.startsWith(media+path.sep)||target.startsWith(restored+path.sep)))throw Error('Recovery database must not be inside a media directory.');
}
