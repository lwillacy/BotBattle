/**
 * Client-side API client. All requests go to /api/* which Next.js
 * rewrites proxy to the backend at http://localhost:3000/*.
 */
import type { Agent, Match, Round, LeaderboardEntry } from './types';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getMatch: (id: string) => get<Match>(`/matches/${id}`),
  getMatchRounds: (id: string) => get<Round[]>(`/matches/${id}/rounds`),
  getMatches: (limit = 10, status?: string) =>
    get<Match[]>(`/matches?limit=${limit}${status ? `&status=${status}` : ''}`),
  getAgents: () => get<Agent[]>('/agents'),
  getAgent: (id: string) => get<Agent>(`/agents/${id}`),
  getLeaderboard: () => get<LeaderboardEntry[]>('/leaderboard'),
};
