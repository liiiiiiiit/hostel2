import 'dotenv/config';
import {applicationEnvironment,assertRuntimeEnvironment} from '../../server/environment.js';
if(applicationEnvironment()!=='staging')throw Error('This service requires APP_ENV=staging.');
assertRuntimeEnvironment();
console.log('Staging configuration validated; no credentials displayed.');
