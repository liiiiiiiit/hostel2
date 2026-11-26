export type Proficiency = 'basic' | 'conversational' | 'fluent' | 'native';
export interface SeekerExperience {
    id: string;
    title: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
}
export interface SeekerEducation {
    id: string;
    institution: string;
    qualification: string;
    startDate: string;
    endDate: string;
    description: string;
}
export interface SeekerProfile {
    version: number;
    fullName: string;
    headline: string;
    city: string;
    contact: string;
    about: string;
    desiredRole: string;
    preferredLocation: string;
    minimumSalary: number | null;
    employmentTypes: ('full_time' | 'part_time' | 'contract' | 'internship')[];
    remote: boolean;
    skills: string[];
    languages: {
        code: string;
        proficiency: Proficiency;
    }[];
    experience: SeekerExperience[];
    education: SeekerEducation[];
}
export type SharedSeekerProfile = Omit<SeekerProfile, 'version'>;
export interface SeekerDocument {
    id: string;
    name: string;
    bytes: number;
    createdAt: string;
}
export interface SeekerApplication {
    interviews?:import('./recruitment.js').RecruitmentInterview[];
    reference: string;
    jobId: string;
    title: string;
    company: string;
    status: 'received' | 'reviewing' | 'shortlisted' | 'interview_scheduled' | 'accepted' | 'declined' | 'withdrawn';
    submittedAt: string;
    consentAt: string;
    profileShared: boolean;
    document: SeekerDocument | null;
}
export interface SeekerState {
    profile: SeekerProfile;
    documents: SeekerDocument[];
    savedJobs: {
        jobId: string;
        title: string;
        company: string;
        location: string;
        available: boolean;
    }[];
    applications: SeekerApplication[];
}
