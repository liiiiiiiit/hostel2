import type {RentalProperty,RentalInquiry} from './index.js';
import type {ModerationStatus} from './moderation.js';
export interface RentalOwnerProfile {userId:string;status:'active'|'suspended';version:number;organization:string;bio:string;city:string;name:string;email:string;phone:string;}
export type OwnerRental=RentalProperty&{ownedMediaIds:string[];ownerVersion:number;acceptingInquiries:boolean;moderationStatus:ModerationStatus;moderationFeedback:string};
export type OwnerInquiry=Omit<RentalInquiry,'privateToken'|'trackingCode'|'adminNotes'>;
export interface RentalOwnerState {profile:RentalOwnerProfile;properties:OwnerRental[];inquiries:OwnerInquiry[];totalInquiries:number;page:number;history:{id:string;kind:string;propertyId:string|null;createdAt:string}[];stats:{properties:number;published:number;available:number;inquiries:number};}
export interface RentalOwnerAdminState {accounts:RentalOwnerProfile[];users:{id:string;name:string;email:string}[];properties:{id:string;title:string;ownerId:string|null;version:number}[];}
