import type { ParsedPlanImport } from '../types/plan';
import type { PlanDetail, PlanSummary, Profile } from '../types/plan';

const baseUrl = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export const api = {
  getProfiles: () => request<Profile[]>('/api/profiles'),
  createProfile: (name: string, avatarColor: string) =>
    request<Profile>('/api/profiles', {
      method: 'POST',
      body: JSON.stringify({ name, avatarColor }),
    }),
  deleteProfile: (id: string) =>
    request<void>(`/api/profiles/${id}`, { method: 'DELETE' }),
  getPlansForProfile: (profileId: string) =>
    request<PlanSummary[]>(`/api/profiles/${profileId}/plans`),
  getPlan: (planId: string) => request<PlanDetail>(`/api/plans/${planId}`),
  setItemCompleted: (itemId: string, completed: boolean) =>
    request(`/api/plan-items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),
  importPlan: (profileId: string, data: ParsedPlanImport) =>
    request<{ planId: string }>('/api/plans/import', {
      method: 'POST',
      body: JSON.stringify({ profileId, ...data }),
    }),
};
