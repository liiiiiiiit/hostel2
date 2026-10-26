import type { Hostel, RoomType } from "../types/index.js";
import { compareHostel } from "./comparison.js";
export function receptionOpen(hostel: Hostel, time: string) {
  if (hostel.reception24h) return true;
  const open = hostel.receptionOpenTime,
    close = hostel.receptionCloseTime;
  if (!open || !close) return false;
  return open <= close
    ? time >= open && time < close
    : time >= open || time < close;
}
export function recommendStays(
  hostels: Hostel[],
  input: {
    checkIn: string;
    checkOut: string;
    guests: number;
    type: string;
    budget: number;
    arrivalTime?: string;
    require24h: boolean;
    metro: boolean;
    longStay: boolean;city?:string;district?:string;amenities?:string[];
  },
  available: (hostel: Hostel, room: RoomType) => number,
  availableTonight?: (hostel:Hostel,room:RoomType)=>number,
) {
  return hostels
    .filter(
      (h) =>
        h.isPublished &&
        (!input.city||input.city==='all'||h.city.toLowerCase()===input.city.toLowerCase())&&(!input.district||input.district==='all'||h.district===input.district)&&
        (input.amenities??[]).every(key=>key==='kitchen'?h.amenities.kitchen:key==='elevator'?h.amenities.elevator:key==='coworking'?h.amenities.coworking:true)&&
        (!input.require24h || h.reception24h) &&
        (!input.metro || h.nearMetro === true) &&
        (!input.longStay || h.monthlyStayAvailable === true) &&
        (!input.arrivalTime || receptionOpen(h, input.arrivalTime)),
    )
    .flatMap((hostel) => {
      const offer = compareHostel(hostel, input, (room) =>
        Math.min(available(hostel,room),input.amenities?.includes('tonight')?availableTonight?.(hostel,room)??0:Infinity),
      );
      if (!offer || offer.nightly > input.budget) return [];
      return [
        {
          hostel,
          offer,
          reasons: [
            "budget",
            "guests",
            ...(input.type === "all" ? [] : ["roomType"]),
            ...(input.require24h ? ["reception"] : []),
            ...(input.metro ? ["metro"] : []),
            ...(input.longStay ? ["longStay"] : []),
          ],
        },
      ];
    })
    .sort(
      (a, b) =>
        a.offer.total - b.offer.total || a.hostel.id.localeCompare(b.hostel.id),
    );
}
