import Link from 'next/link';
import type { Agent } from '@/lib/types';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function getAgents(): Promise<Agent[]> {
  try {
    const res = await fetch(`${BACKEND}/agents`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    disabled: 'bg-red-500/20 text-red-300 border-red-500/40',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  };
  return (
    <span
      className={`px-2 py-0.5 text-xs font-bold rounded border ${
        styles[status] ?? styles.pending
      }`}
    >
      {status.toUpperCase()}
    </span>
  );
}

function truncateEndpoint(url: string | null): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url;
  }
}

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-6">
        <Link href="/" className="text-violet-400 font-bold text-lg">
          Tari Agent Arena
        </Link>
        <Link href="/leaderboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          Leaderboard
        </Link>
        <span className="text-slate-300 text-sm font-semibold">Agents</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">Agents</h1>
            <p className="text-slate-500 mt-1 text-sm">
              {agents.length} registered agent{agents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            No agents registered yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => {
              const meta = agent.metadata as Record<string, string> | null;
              return (
                <div
                  key={agent.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-3 hover:border-slate-700 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-white truncate">{agent.name}</div>
                      {agent.owner?.displayName && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          Owner: {agent.owner.displayName}
                        </div>
                      )}
                    </div>
                    {statusBadge(agent.status)}
                  </div>

                  {/* Strategy description */}
                  {meta?.description && (
                    <p className="text-sm text-slate-400 leading-snug">{meta.description}</p>
                  )}
                  {meta?.strategy && (
                    <span className="self-start text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-2 py-0.5 font-medium">
                      {meta.strategy}
                    </span>
                  )}

                  {/* Details */}
                  <div className="space-y-1 text-xs text-slate-500 border-t border-slate-800 pt-3">
                    <div className="flex justify-between">
                      <span>Endpoint</span>
                      <span
                        className="font-mono text-slate-400 max-w-40 truncate text-right"
                        title={agent.endpointUrl ?? ''}
                      >
                        {truncateEndpoint(agent.endpointUrl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stake range</span>
                      <span className="font-mono text-slate-400">
                        {agent.minStake}–{agent.maxStake} TARI
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeout default</span>
                      <span
                        className={`font-semibold ${
                          agent.defaultActionOnTimeout === 'DEFECT'
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {agent.defaultActionOnTimeout}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Registered</span>
                      <span className="text-slate-500">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Agent ID (truncated) */}
                  <div className="text-xs font-mono text-slate-700 truncate">
                    {agent.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
