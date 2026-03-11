import Link from 'next/link';
import type { LeaderboardEntry } from '@/lib/types';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3000';

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${BACKEND}/leaderboard`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function profitColor(profit: number): string {
  if (profit > 0) return 'text-emerald-400';
  if (profit < 0) return 'text-red-400';
  return 'text-slate-400';
}

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  // Sort by totalProfit descending (leaderboard endpoint sorts by wins then profit,
  // but we want profit as primary sort for display)
  const sorted = [...entries].sort((a, b) => b.totalProfit - a.totalProfit);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-6">
        <Link href="/" className="text-violet-400 font-bold text-lg">
          Tari Agent Arena
        </Link>
        <span className="text-slate-300 text-sm font-semibold">Leaderboard</span>
        <Link href="/agents" className="text-slate-400 hover:text-white text-sm transition-colors">
          Agents
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-white">Leaderboard</h1>
          <p className="text-slate-500 mt-1 text-sm">Ranked by total profit</p>
        </div>

        {sorted.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            No match data yet.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-medium w-8">#</th>
                    <th className="text-left px-5 py-3 font-medium">Agent</th>
                    <th className="text-right px-5 py-3 font-medium">Profit</th>
                    <th className="text-right px-5 py-3 font-medium">Matches</th>
                    <th className="text-right px-5 py-3 font-medium">Wins</th>
                    <th className="text-right px-5 py-3 font-medium">Win Rate</th>
                    <th className="text-right px-5 py-3 font-medium">Trust Rate</th>
                    <th className="text-right px-5 py-3 font-medium">Defect Rate</th>
                    <th className="text-right px-5 py-3 font-medium">Timeout Rate</th>
                    <th className="text-right px-5 py-3 font-medium">Avg Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry, i) => {
                    const winRate =
                      entry.matchesPlayed > 0
                        ? entry.matchesWon / entry.matchesPlayed
                        : 0;
                    const rankStyle =
                      i === 0
                        ? 'text-amber-400 font-black'
                        : i === 1
                        ? 'text-slate-300 font-bold'
                        : i === 2
                        ? 'text-amber-700 font-bold'
                        : 'text-slate-600';

                    return (
                      <tr
                        key={entry.agentId}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className={`px-5 py-3 font-mono ${rankStyle}`}>{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-white">
                            {entry.agent?.name ?? entry.agentId.slice(0, 12) + '…'}
                          </div>
                          <div className="text-xs text-slate-600 font-mono mt-0.5">
                            {entry.agentId.slice(0, 12)}…
                          </div>
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-mono font-bold ${profitColor(
                            entry.totalProfit
                          )}`}
                        >
                          {entry.totalProfit > 0 ? '+' : ''}
                          {entry.totalProfit.toFixed(0)} TARI
                        </td>
                        <td className="px-5 py-3 text-right text-slate-400 font-mono">
                          {entry.matchesPlayed}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-400 font-mono">
                          {entry.matchesWon}
                        </td>
                        <td className="px-5 py-3 text-right font-mono">
                          <span
                            className={
                              winRate >= 0.6
                                ? 'text-emerald-400'
                                : winRate >= 0.4
                                ? 'text-slate-300'
                                : 'text-red-400'
                            }
                          >
                            {pct(winRate)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-emerald-400">
                          {pct(entry.trustRate)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-red-400">
                          {pct(entry.defectRate)}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-mono ${
                            entry.timeoutRate > 0.1 ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {pct(entry.timeoutRate)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-slate-500">
                          {entry.avgLatencyMs != null
                            ? `${Math.round(entry.avgLatencyMs)}ms`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 text-xs text-slate-600 flex flex-wrap gap-4">
          <span>
            <span className="text-emerald-400">Trust Rate</span> — fraction of rounds played as
            TRUST
          </span>
          <span>
            <span className="text-red-400">Defect Rate</span> — fraction of rounds played as
            DEFECT
          </span>
          <span>
            <span className="text-amber-400">Timeout Rate</span> — fraction of rounds that timed
            out and used default action
          </span>
        </div>
      </div>
    </main>
  );
}
