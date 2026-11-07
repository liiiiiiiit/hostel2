import test from 'node:test';
import assert from 'node:assert/strict';
import { rentalScheduleIsValid } from './rental-inquiries';
import { yerevanDateTime } from './dates';
const now = new Date('2026-11-07T10:15:30Z'); // 14:15 in Yerevan

test('rental schedules reject missing requirements, impossible dates and past visits in Yerevan time', () => {
  for(const input of [
    {requestType:'rent',desiredStartDate:'2026-11-06',desiredDurationText:'2 months'},
    {requestType:'rent',desiredStartDate:'2027-02-29',desiredDurationText:'2 months'},
    {requestType:'rent',desiredStartDate:'2026-11-07',desiredDurationText:' '},
    {requestType:'visit'},
    {requestType:'visit',proposedVisitDate:'2026-11-07T14:14'},
    {requestType:'visit',proposedVisitDate:'2026-11-08T25:00'},
    {requestType:'visit',proposedVisitDate:'2026-11-31T15:00'},
    {requestType:'visit',proposedVisitDate:'2026-11-08T15:00Z'},
  ] as const) assert.equal(rentalScheduleIsValid(input,now),false,JSON.stringify(input));
  assert.equal(rentalScheduleIsValid({requestType:'visit',proposedVisitDate:'2026-11-07T14:15'},now),true);
  assert.equal(rentalScheduleIsValid({requestType:'rent',desiredStartDate:'2026-11-07',desiredDurationText:'2 months'},now),true);
});

test('visit input minimum uses Yerevan time through midnight regardless of machine timezone', () => {
  assert.equal(yerevanDateTime(now),'2026-11-07T14:15');
  assert.equal(yerevanDateTime(new Date('2026-11-07T20:00:00Z')),'2026-11-08T00:00');
  assert.equal(rentalScheduleIsValid({requestType:'rent',desiredStartDate:'2026-11-07',desiredDurationText:'1 month'},new Date('2026-11-07T21:00:00Z')),false);
});
