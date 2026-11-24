import type { AppLanguage } from './index.js';
export type ServiceText = Record<AppLanguage,string>;
export interface ServiceCategory {
  id:string; slug:string; icon:string; order:number; isActive:boolean; name:ServiceText; version:number;
}
export interface ServiceListing {
  id:string; slug:string; categoryId:string; version:number;
  isActive:boolean; isFeatured:boolean; isVerified:boolean; allowBookingRequest:boolean;
  title:ServiceText; shortDescription:ServiceText; description:ServiceText; address:ServiceText; workingHours:ServiceText; priceRange:ServiceText;
  coverImage:string; gallery:string[]; phone:string; whatsapp:string; telegram:string; instagram:string; website:string;
  city:string; district:string; mapUrl:string; latitude:number|null; longitude:number|null;
  languagesSpoken:AppLanguage[]; highlights:ServiceText[]; createdAt:string; updatedAt:string;
}
export interface ServiceRequest {
  reference:string; serviceId:string; serviceTitle:ServiceText; name:string; contact:string; preferredDate:string;
  note:string; status:'new'|'contacted'|'closed'; createdAt:string;
}
export interface ServicePage { items:ServiceListing[]; total:number; page:number; pageSize:number }
