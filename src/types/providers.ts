export type ProviderRole = 'job_provider' | 'tour_provider';
export interface Listing {
  id: string; ownerId: string; kind: ProviderRole; version: number;
  title: string; description: string; location: string; schedule: string; contact: string;
  category: string; requirements: string; inclusions: string; image: string;
  price: number | null; capacity: number; active: boolean; approved: boolean;
}
export interface ProviderRequest {
  id: string; listingId: string; requestId: string; fingerprint: string;
  title: string; name: string; contact: string; note: string; date: string; people: number;
  status: 'new' | 'reviewed' | 'contacted' | 'accepted' | 'rejected' | 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}
