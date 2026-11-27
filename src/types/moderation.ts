export const contentModules = ['hostel', 'rental', 'job', 'tour', 'service', 'article', 'review'] as const;
export type ContentModule = typeof contentModules[number];
export const moderationStates = ['draft', 'pending_review', 'changes_requested', 'approved', 'published', 'rejected', 'suspended', 'archived'] as const;
export type ModerationStatus = typeof moderationStates[number];
export const moderationTransitions: Record<ModerationStatus, readonly ModerationStatus[]> = {
    draft: ['pending_review', 'approved', 'published', 'archived'],
    pending_review: ['draft', 'changes_requested', 'approved', 'published', 'rejected', 'archived'],
    changes_requested: ['draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'],
    approved: ['draft', 'pending_review', 'published', 'changes_requested', 'rejected', 'archived'],
    published: ['draft', 'pending_review', 'rejected', 'suspended', 'archived', 'changes_requested'],
    rejected: ['draft', 'pending_review', 'approved', 'published', 'archived'],
    suspended: ['pending_review', 'approved', 'published', 'archived'],
    archived: ['draft', 'pending_review'],
};
export interface ModerationEvent {
    id: string;
    from: string;
    to: ModerationStatus;
    note: string;
    actorId: string | null;
    createdAt: string;
}
export interface ModerationItem {
    module: ContentModule;
    id: string;
    title: string;
    status: ModerationStatus;
    version: number;
    contentVersion: string;
    summary: string;
    images: string[];
    history: ModerationEvent[];
    historyTotal: number;
}
export interface ModerationPage {
    items: ModerationItem[];
    total: number;
    page: number;
    pageSize: number;
}
