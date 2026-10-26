import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredUnits,occupancyIsValid } from './occupancy.js';
import type { RoomType } from '../types/index.js';
const room=(type:RoomType['type'],maxGuestsPerUnit?:number)=>({type,maxGuestsPerUnit} as RoomType);
test('two dorm guests need two beds; two double-room guests need one room',()=>{
  assert.equal(requiredUnits(room('dorm_female'),2),2);assert.equal(occupancyIsValid(room('dorm_female'),2,1),false);
  assert.equal(requiredUnits(room('private',2),2),1);assert.equal(occupancyIsValid(room('private',2),2,1),true);
  assert.equal(occupancyIsValid(room('private',2),3,1),false);assert.equal(occupancyIsValid(room('private',2),3,2),true);
  assert.equal(requiredUnits(room('private'),2),null);assert.equal(occupancyIsValid(room('private'),1,1),false);
  assert.equal(requiredUnits(room('private',2),NaN),null);assert.equal(occupancyIsValid(room('dorm_male'),1,2),false);
});
