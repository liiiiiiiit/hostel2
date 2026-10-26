import type {AppLanguage,Booking} from './index.js';
export interface CancellationRule {freeBeforeHours:number;penaltyPercent:number}
export interface CommissionRule {type:'none'|'percent'|'fixed';value:number;appliesOn:'confirmed'|'completed'}
export interface OptionalService {id:string;name:Record<AppLanguage,string>;priceAMD:number;unit:'stay'|'night'|'guest_night';active:boolean}
export interface UnitBlock {id:string;hostelId:string;roomTypeId:string;unitIds:string[];from:string;to:string;reason:string;createdAt:string;releasedAt?:string}
export interface BookingEvent {id:string;at:string;actorId:string;action:string;reason:string;amountAMD?:number}
export interface BookingChange {id:string;bookingId:string;checkIn:string;checkOut:string;guestsCount:number;quantity:number;amountAMD:number;differenceAMD:number;pricing:NonNullable<Booking['agreement']>;bookingVersion:string;propertyVersion:string;reason:string;requestedBy:string;createdAt:string;guestAcceptedAt?:string;status:'proposed'|'accepted'|'applied'|'rejected'}
export interface SupportThread {id:string;bookingId:string;category:'arrival'|'change'|'question';status:'open'|'resolved';messages:{id:string;at:string;actorId:string;role:string;text:string}[];createdAt:string;updatedAt:string}
export interface FinanceEntry {id:string;bookingId:string;hostelId:string;kind:'property_payment'|'settlement'|'adjustment';amountAMD:number;reason:string;actorId:string;createdAt:string;requestId:string}
