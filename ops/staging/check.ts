import 'dotenv/config';
import {demoPaths} from '../../server/demo/safety.js';
import {applicationEnvironment,assertRuntimeEnvironment} from '../../server/environment.js';
if(applicationEnvironment()!=='staging')throw Error('This service requires APP_ENV=staging.');
assertRuntimeEnvironment();
if(process.env.DEMO_TOOLS_ENABLED==='true')demoPaths();
console.log('Staging configuration validated; no credentials displayed.');
