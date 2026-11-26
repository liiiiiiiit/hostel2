import type { SeekerState, SeekerDocument } from '../types/jobSeeker';
export async function seekerFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(path, { ...init, credentials: 'same-origin', headers: { 'X-Requested-With': 'YerevanHub', 'X-App-Language': document.documentElement.lang || 'fa', ...init.headers }, signal: AbortSignal.timeout(20000) });
    const data = await response.json().catch(() => null);
    if (!response.ok)
        throw Error(data?.error || String(response.status));
    return data as T;
}
export const loadSeeker = () => seekerFetch<SeekerState>('/api/job-seeker');
export const uploadSeekerResume = (file: File) => seekerFetch<SeekerDocument>('/api/job-seeker/documents', { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) }, body: file });
