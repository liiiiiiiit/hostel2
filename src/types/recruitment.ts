import type { JobPosting, JobApplication } from './index.js';
export type RecruitmentStatus = 'received' | 'reviewing' | 'shortlisted' | 'interview_scheduled' | 'accepted' | 'declined' | 'withdrawn';
export type Publication = 'draft' | 'pending' | 'approved' | 'rejected';
export interface EmployerOrganization {
    ownerId: string;
    version: number;
    name: string;
    description: string;
    website: string;
    phone: string;
    city: string;
}
export interface RecruitmentInterview {
    id: string;
    reference: string;
    startsAt: string;
    minutes: number;
    kind: 'video' | 'phone' | 'in_person';
    location: string;
    state: 'proposed' | 'cancelled' | 'completed';
    createdAt: string;
}
export interface RecruitmentApplicant extends JobApplication {
    jobTitle: string;
    company: string;
    note: string;
    noteVersion: number;
    interviews: RecruitmentInterview[];
}
export interface RecruitmentEvent {
    id: string;
    targetId: string;
    jobId: string | null;
    kind: string;
    createdAt: string;
    details: Record<string, unknown>;
}
export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    pages: number;
}
export interface RecruitmentState {
    organization: EmployerOrganization;
    organizations: {
        ownerId: string;
        name: string;
    }[];
    jobs: Page<JobPosting>;
    applications: Page<RecruitmentApplicant>;
    history: Page<RecruitmentEvent>;
    stats: {
        jobs: number;
        open: number;
        drafts: number;
        pending: number;
        expired: number;
        applications: number;
        statuses: Record<RecruitmentStatus, number>;
    };
}
