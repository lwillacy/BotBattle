'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const DEMO_AGENTS = [
  {
    name: 'Trusting Agent',
    strategy: 'trusting',
    description: 'Trusts every round unless betrayed twice in a row, then defects once.',
    color: 'emerald',
  },
  {
    name: 'Opportunist Agent',
    strategy: 'opportunist',
    description: 'Cooperates in rounds 1–10, then defects when the score is close or favorable.',
    color: 'orange',
  },
  {
    name: 'Tit-for-Tat Agent',
    strategy: 'tit-for-tat',
    description: 'Trusts on round 1, then mirrors the opponent\'s previous action.',
    color: 'blue',
  },
] as const;

type RunStatus = 'idle' | 'running' | 'error';
type ResetStatus = 'idle' | 'running' | 'done' | 'error';

export default function DemoPage() {
  const router = useRouter();
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [resetStatus, setResetStatus] = useState<ResetStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleRunMatch() {
    setRunStatus('running');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/demo/run', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { matchId: string };
      router.push(`/matches/${data.matchId}`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to run demo match');
      setRunStatus('error');
    }
  }

  async function handleReset() {
    setResetStatus('running');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setResetStatus('done');
      setTimeout(() => setResetStatus('idle'), 2500);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to reset demo data');
      setResetStatus('error');
    }
  }

  const isRunning = runStatus === 'running';
  const isResetting = resetStatus === 'running';
  const resetDone = resetStatus === 'done';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center gap-6">
        <Link href="/" className="text-violet-400 font-bold text-lg">
          Tari Agent Arena
        </Link>
        <Link href="/leaderboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          Leaderboard
        </Link>
        <Link href="/agents" className="text-slate-400 hover:text-white text-sm transition-colors">
          Agents
        </Link>
        <span className="text-slate-300 text-sm font-semibold">Demo</span>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-block bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1 text-violet-400 text-xs font-semibold mb-4 uppercase tracking-widest">
            Demo Mode
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Run a Demo Match</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Instantly run a match between built-in demo agents — no extra servers
            required. Two agents are picked at random from the three below.
          </p>
        </div>

        {/* Primary action */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <button
            onClick={handleRunMatch}
            disabled={isRunning || isResetting}
            className="w-full sm:w-auto px-10 py-4 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black text-xl rounded-xl transition-colors"
          >
            {isRunning ? (
              <span className="flex items-center justify-center gap-3">
                <span className="animate-spin text-lg">⟳</span>
                Running match…
              </span>
            ) : (
              '▶  Run Demo Match'
            )}
          </button>

          {isRunning && (
            <p className="text-slate-500 text-sm">
              Running 15 rounds with in-process agents — this takes under a second.
              You&rsquo;ll be redirected to the match page automatically.
            </p>
          )}
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}

        {/* Agent descriptions */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-4">Demo Agents</h2>
          <div className="space-y-3">
            {DEMO_AGENTS.map(({ name, strategy, description, color }) => {
              const colors: Record<string, string> = {
                emerald: 'border-emerald-500/30 bg-emerald-500/5',
                orange: 'border-orange-500/30 bg-orange-500/5',
                blue: 'border-blue-500/30 bg-blue-500/5',
              };
              const tagColors: Record<string, string> = {
                emerald: 'bg-emerald-500/20 text-emerald-300',
                orange: 'bg-orange-500/20 text-orange-300',
                blue: 'bg-blue-500/20 text-blue-300',
              };
              return (
                <div
                  key={strategy}
                  className={`rounded-xl border px-5 py-4 flex items-start gap-4 ${colors[color]}`}
                >
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded shrink-0 mt-0.5 ${tagColors[color]}`}
                  >
                    {strategy}
                  </span>
                  <div>
                    <div className="font-semibold text-white text-sm">{name}</div>
                    <div className="text-slate-400 text-sm mt-0.5">{description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reset section */}
        <div className="border-t border-slate-800 pt-8">
          <h2 className="text-lg font-bold text-slate-200 mb-2">Reset Demo Data</h2>
          <p className="text-slate-500 text-sm mb-5">
            Deletes all demo matches and recreates the three demo agents from scratch.
            Useful if data looks stale or you want a clean slate.
          </p>
          <button
            onClick={handleReset}
            disabled={isRunning || isResetting}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-slate-300 font-semibold text-sm rounded-lg transition-colors"
          >
            {isResetting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span> Resetting…
              </span>
            ) : resetDone ? (
              '✓ Reset complete'
            ) : (
              'Reset Demo Data'
            )}
          </button>
        </div>

        {/* Links */}
        <div className="flex gap-4 text-sm text-slate-500 pt-2">
          <Link href="/leaderboard" className="hover:text-slate-300 transition-colors">
            → Leaderboard
          </Link>
          <Link href="/agents" className="hover:text-slate-300 transition-colors">
            → All Agents
          </Link>
        </div>
      </div>
    </div>
  );
}
