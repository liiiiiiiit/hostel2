import type {ServiceListing,ServiceCategory,ServiceRequest} from './services';
export interface ServiceBusiness {userId:string;name:string;email:string;phone:string;status:'active'|'suspended';businessName:string;bio:string;city:string;version:number}
export interface ProviderListing extends ServiceListing {ownershipVersion:number;moderationStatus:string}
export interface ProviderRequest extends Omit<ServiceRequest,'reference'> {id:string}
export interface ServiceProviderState {profile:ServiceBusiness;categories:ServiceCategory[];listings:ProviderListing[];requests:ProviderRequest[];totalRequests:number;page:number;stats:{listings:number;published:number;requests:number};history:{id:string;kind:string;createdAt:string}[]}
export interface ServiceProviderAdminState {accounts:ServiceBusiness[];users:{id:string;name:string;email:string}[];listings:{id:string;title:string;ownerId:string|null;ownershipVersion:number;version:number;isVerified:boolean}[]}
