import { yerevanToday } from './dates.js';

interface RentalSchedule {
  requestType: 'rent' | 'visit';
  desiredStartDate?: string;
  desiredDurationText?: string;
  proposedVisitDate?: string;
}
function calendarDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10) === value;
}
/** datetime-local values are civil times in Yerevan, independent of the server TZ. */
export function rentalScheduleIsValid(input: RentalSchedule, now = new Date()): boolean {
  const today = yerevanToday(now);
  if (input.requestType === 'rent') return calendarDate(input.desiredStartDate) && input.desiredStartDate >= today && !!input.desiredDurationText?.trim();
  const visit = input.proposedVisitDate;
  if (input.requestType !== 'visit' || !visit || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(visit)) return false;
  const date = visit.slice(0,10);
  return calendarDate(date) && date >= today && Date.parse(`${visit}:00+04:00`) >= Math.floor(now.getTime()/60000)*60000;
}
