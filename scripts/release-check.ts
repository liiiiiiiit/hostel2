import 'dotenv/config';
import {createClient} from '@libsql/client';
import {assertExistingBackupSource} from '../server/storage-paths.js';
import {releasePreflight} from '../server/release-preflight.js';
const url=process.env.DATABASE_URL;if(!url)throw Error('An existing DATABASE_URL is required.');assertExistingBackupSource(url);
const db=createClient({url,authToken:process.env.DATABASE_AUTH_TOKEN});
try{const tx=await db.transaction('read');try{const result=await releasePreflight(tx,process.env);await tx.commit();console.log(JSON.stringify(result,null,2));if(!result.automatedChecksPassed)process.exitCode=2;}catch{await tx.rollback();console.error('Release inspection failed; no deployment approved. Check schema and configuration locally.');process.exitCode=2;}finally{tx.close();}}finally{db.close();}
