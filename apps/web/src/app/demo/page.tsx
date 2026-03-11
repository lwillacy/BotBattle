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
    name: 'Tit-for-Tat',
    strategy: 'tit-for-tat',
    description: "Trusts on round 1, then mirrors the opponent's previous action.",
    color: 'blue',
  },
  {
    name: 'Opportunist',
    strategy: 'opportunist',
    description: 'Cooperates in rounds 1–10, then defects when the score is close or favorable.',
    color: 'orange',
  },
  {
    name: 'Grudger',
    strategy: 'grudger',
    description: 'Cooperates until the opponent defects once, then always defects.',
    color: 'red',
  },
  {
    name: 'Pavlov',
    strategy: 'pavlov',
    description: 'Win-Stay Lose-Shift: repeats moves that paid off, switches after losing ones.',
    color: 'violet',
  },
  {
    name: 'Always Defect',
    strategy: 'always-defect',
    description: 'Defects every single round, no exceptions.',
    color: 'rose',
  },
  {
    name: 'Always Trust',
    strategy: 'always-trust',
    description: 'Trusts every single round, no exceptions.',
    color: 'teal',
  },
  {
    name: 'Random',
    strategy: 'random',
    description: 'Flips a fair coin each round — completely unpredictable.',
    color: 'purple',
  },
] as const;

type Strategy = (typeof DEMO_AGENTS)[number]['strategy'];
type Color = (typeof DEMO_AGENTS)[number]['color'];

const BORDER_COLORS: Record<Color, string> = {
  emerald: 'border-emerald-500',
  blue: 'border-blue-500',
  orange: 'border-orange-500',
  red: 'border-red-500',
  violet: 'border-violet-500',
  rose: 'border-rose-500',
  teal: 'border-teal-500',
  purple: 'border-purple-500',
};

const TAG_COLORS: Record<Color, string> = {
  emerald: 'bg-emerald-500/20 text-emerald-300',
  blue: 'bg-blue-500/20 text-blue-300',
  orange: 'bg-orange-500/20 text-orange-300',
  red: 'bg-red-500/20 text-red-300',
  violet: 'bg-violet-500/20 text-violet-300',
  rose: 'bg-rose-500/20 text-rose-300',
  teal: 'bg-teal-500/20 text-teal-300',
  purple: 'bg-purple-500/20 text-purple-300',
};

const IDLE_COLORS: Record<Color, string> = {
  emerald: 'border-emerald-500/20 bg-emerald-500/5',
  blue: 'border-blue-500/20 bg-blue-500/5',
  orange: 'border-orange-500/20 bg-orange-500/5',
  red: 'border-red-500/20 bg-red-500/5',
  violet: 'border-violet-500/20 bg-violet-500/5',
  rose: 'border-rose-500/20 bg-rose-500/5',
  teal: 'border-teal-500/20 bg-teal-500/5',
  purple: 'border-purple-500/20 bg-purple-500/5',
};

type RunStatus = 'idle' | 'running' | 'error';
type ResetStatus = 'idle' | 'running' | 'done' | 'error';

export default function DemoPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Strategy[]>([]);
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [resetStatus, setResetStatus] = useState<ResetStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleAgent(strategy: Strategy) {
    setSelected((prev) => {
      if (prev.includes(strategy)) return prev.filter((s) => s !== strategy);
      if (prev.length < 2) return [...prev, strategy];
      // Replace the second selection
      return [prev[0], strategy];
    });
  }

  async function handleRunMatch() {
    setRunStatus('running');
    setErrorMsg(null);
    try {
      const body: Record<string, string> = {};
      if (selected.length === 2) {
        body.agentAStrategy = selected[0];
        body.agentBStrategy = selected[1];
      }
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
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
        const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
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
  const canRun = !isRunning && !isResetting;

  const selectionLabel =
    selected.length === 0
      ? 'Select 2 agents below — or run random'
      : selected.length === 1
      ? `${DEMO_AGENTS.find((a) => a.strategy === selected[0])?.name} vs …`
      : `${DEMO_AGENTS.find((a) => a.strategy === selected[0])?.name} vs ${DEMO_AGENTS.find((a) => a.strategy === selected[1])?.name}`;

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

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div>
          <div className="inline-block bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1 text-violet-400 text-xs font-semibold mb-4 uppercase tracking-widest">
            Demo Mode
          </div>
          <h1 className="text-4xl font-black text-white mb-3">Run a Demo Match</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Pick two agents and watch them compete across 15 rounds of Prisoner&rsquo;s Dilemma.
          </p>
        </div>

        {/* Agent selection grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-200 mb-1">Choose Your Competitors</h2>
          <p className="text-slate-500 text-sm mb-4">
            Click to select up to 2 agents. Leave both unselected to pick randomly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_AGENTS.map(({ name, strategy, description, color }) => {
              const isSelected = selected.includes(strategy);
              const selectionIndex = selected.indexOf(strategy);
              const badge = selectionIndex === 0 ? 'A' : selectionIndex === 1 ? 'B' : null;
              return (
                <button
                  key={strategy}
                  onClick={() => toggleAgent(strategy)}
                  className={`text-left rounded-xl border px-4 py-4 flex items-start gap-3 transition-all ${
                    isSelected
                      ? `${BORDER_COLORS[color]} bg-slate-800/80 ring-1 ring-inset ${BORDER_COLORS[color]}`
                      : `${IDLE_COLORS[color]} hover:bg-slate-800/40`
                  }`}
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${TAG_COLORS[color]}`}>
                      {strategy}
                    </span>
                    {badge && (
                      <span className="text-xs font-black text-white bg-slate-600 rounded px-1.5 py-0.5">
                        {badge}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-sm">{name}</div>
                    <div className="text-slate-400 text-xs mt-0.5 leading-relaxed">{description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary action */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-slate-300 font-semibold text-sm truncate">{selectionLabel}</div>
            {selected.length < 2 && !isRunning && (
              <div className="text-slate-500 text-xs mt-0.5">
                {selected.length === 0 ? 'Two agents will be chosen at random.' : 'Select one more, or run with random opponent.'}
              </div>
            )}
          </div>
          <button
            onClick={handleRunMatch}
            disabled={!canRun}
            className="shrink-0 px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl transition-colors"
          >
            {isRunning ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⟳</span>
                Running…
              </span>
            ) : (
              '▶  Run Match'
            )}
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 text-red-400 text-sm">
            <span className="font-bold">Error:</span> {errorMsg}
          </div>
        )}

        {/* Reset section */}
        <div className="border-t border-slate-800 pt-8">
          <h2 className="text-lg font-bold text-slate-200 mb-2">Reset Demo Data</h2>
          <p className="text-slate-500 text-sm mb-5">
            Deletes all demo matches and recreates all demo agents from scratch.
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
