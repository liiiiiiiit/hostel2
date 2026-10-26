import type { RoomType } from '../types/index.js';
export function guestsPerUnit(room: RoomType): number | null {
  if (room.type !== 'private') return 1;
  return Number.isInteger(room.maxGuestsPerUnit) && room.maxGuestsPerUnit! > 0 ? room.maxGuestsPerUnit! : null;
}
export function requiredUnits(room: RoomType, guests: number): number | null {
  const capacity=guestsPerUnit(room);
  return capacity && Number.isInteger(guests) && guests>0 ? Math.ceil(guests/capacity) : null;
}
export function occupancyIsValid(room: RoomType, guests: number, quantity: number): boolean {
  const capacity=guestsPerUnit(room);
  return !!capacity && Number.isInteger(guests) && guests>0 && Number.isInteger(quantity) && quantity>0 && quantity<=guests && guests<=quantity*capacity && (room.type==='private'||quantity===guests);
}
