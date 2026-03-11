'use client';

import { useEffect, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Match, Round, Agent } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Outcome = 'COOPERATION' | 'BETRAYAL' | 'STALEMATE';

function getOutcome(a: string, b: string): Outcome {
  if (a === 'TRUST' && b === 'TRUST') return 'COOPERATION';
  if (a === 'DEFECT' && b === 'DEFECT') return 'STALEMATE';
  return 'BETRAYAL';
}

function fmt(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
    completed: 'bg-slate-700/60 border-slate-600 text-slate-300',
    pending: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    cancelled: 'bg-red-500/20 border-red-500/50 text-red-300',
  };
  const label = status === 'active' ? '● LIVE' : status.toUpperCase();
  return (
    <span className={`px-2.5 py-1 text-xs font-bold rounded border ${styles[status] ?? styles.completed}`}>
      {label}
    </span>
  );
}

function ActionBadge({ action, source }: { action: string | null; source: string | null }) {
  if (!action) {
    return <span className="text-slate-600 text-sm italic">Waiting…</span>;
  }
  const isTimeout = source === 'timeout_default';
  const style =
    action === 'TRUST'
      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
      : 'bg-red-500/20 border-red-500/50 text-red-300';
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`px-6 py-2 rounded-lg border font-black text-2xl tracking-widest ${style}`}>
        {action}
      </span>
      {isTimeout && (
        <span className="text-amber-400 text-xs font-semibold">TIMEOUT DEFAULT</span>
      )}
    </div>
  );
}

function OutcomeBanner({ round }: { round: Round }) {
  if (!round.actionA || !round.actionB) return null;
  const outcome = getOutcome(round.actionA, round.actionB);
  const config: Record<Outcome, { bg: string; text: string; icon: string }> = {
    COOPERATION: {
      bg: 'bg-emerald-500/10 border-emerald-500/40',
      text: 'text-emerald-300',
      icon: '🤝',
    },
    BETRAYAL: {
      bg: 'bg-orange-500/10 border-orange-500/40',
      text: 'text-orange-300',
      icon: '⚡',
    },
    STALEMATE: {
      bg: 'bg-slate-700/40 border-slate-600',
      text: 'text-slate-300',
      icon: '🔒',
    },
  };
  const c = config[outcome];
  return (
    <div className={`rounded-xl border px-8 py-5 text-center ${c.bg}`}>
      <div className={`text-3xl font-black tracking-wide ${c.text}`}>
        {c.icon} {outcome}
      </div>
      <div className="text-sm text-slate-400 mt-2">
        Agent A&nbsp;
        <span
          className={`font-bold ${
            round.payoffA > 0 ? 'text-emerald-400' : round.payoffA < 0 ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          {fmt(round.payoffA)} pts
        </span>
        &nbsp;·&nbsp; Agent B&nbsp;
        <span
          className={`font-bold ${
            round.payoffB > 0 ? 'text-emerald-400' : round.payoffB < 0 ? 'text-red-400' : 'text-slate-400'
          }`}
        >
          {fmt(round.payoffB)} pts
        </span>
      </div>
    </div>
  );
}

function AgentColumn({
  agent,
  score,
  round,
  side,
  isWinner,
}: {
  agent: Agent;
  score: number;
  round: Round | null;
  side: 'A' | 'B';
  isWinner: boolean;
}) {
  const action = side === 'A' ? round?.actionA ?? null : round?.actionB ?? null;
  const source = side === 'A' ? round?.actionSourceA ?? null : round?.actionSourceB ?? null;
  const isInitiator = round?.initiator === side;
  const meta = agent.metadata as Record<string, string> | null;

  const borderColor = side === 'A' ? 'border-blue-500/30' : 'border-amber-500/30';
  const bgColor = side === 'A' ? 'bg-blue-500/5' : 'bg-amber-500/5';
  const scoreColor =
    score > 0 ? 'text-emerald-400' : score < 0 ? 'text-red-400' : 'text-slate-300';

  return (
    <div
      className={`flex-1 rounded-xl border p-6 flex flex-col gap-5 ${borderColor} ${bgColor} ${
        isWinner ? 'ring-2 ring-amber-500/40' : ''
      }`}
    >
      {/* Agent name + badges */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xl font-bold text-white">{agent.name}</div>
          {meta?.description && (
            <div className="text-xs text-slate-500 mt-0.5">{meta.description}</div>
          )}
          <div className="text-xs text-slate-600 mt-0.5 font-mono">Agent {side}</div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {isWinner && (
            <span className="text-amber-400 text-xs font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded whitespace-nowrap">
              🏆 WINNER
            </span>
          )}
          {isInitiator && (
            <span className="text-violet-400 text-xs font-bold bg-violet-500/10 border border-violet-500/30 px-2 py-1 rounded whitespace-nowrap">
              ★ INITIATOR
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-center py-2">
        <div className={`text-7xl font-black tabular-nums leading-none ${scoreColor}`}>
          {score}
        </div>
        <div className="text-xs text-slate-600 uppercase tracking-widest mt-2">points</div>
      </div>

      {/* Action */}
      <div className="text-center">
        <ActionBadge action={action} source={source} />
      </div>
    </div>
  );
}

function RoundHistoryTable({ rounds, match }: { rounds: Round[]; match: Match }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Round History
        </span>
        <span className="text-xs text-slate-600">
          {rounds.length} / 15 rounds
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800/60 text-slate-600 text-xs">
              <th className="text-left px-4 py-2 font-medium">Rnd</th>
              <th className="text-left px-4 py-2 font-medium">Init</th>
              <th className="text-left px-4 py-2 font-medium">{match.agentA.name}</th>
              <th className="text-left px-4 py-2 font-medium">{match.agentB.name}</th>
              <th className="text-left px-4 py-2 font-medium">Outcome</th>
              <th className="text-right px-4 py-2 font-medium">A +/−</th>
              <th className="text-right px-4 py-2 font-medium">B +/−</th>
              <th className="text-right px-4 py-2 font-medium">A Score</th>
              <th className="text-right px-4 py-2 font-medium">B Score</th>
            </tr>
          </thead>
          <tbody>
            {rounds.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-600 text-sm">
                  No rounds completed yet
                </td>
              </tr>
            )}
            {rounds.map((round, i) => {
              const outcome =
                round.actionA && round.actionB
                  ? getOutcome(round.actionA, round.actionB)
                  : null;
              const outcomeColor: Record<string, string> = {
                COOPERATION: 'text-emerald-400',
                BETRAYAL: 'text-orange-400',
                STALEMATE: 'text-slate-400',
              };
              const isLast = i === rounds.length - 1;
              return (
                <tr
                  key={round.id}
                  className={`border-b border-slate-800/40 transition-colors ${
                    isLast ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                  }`}
                >
                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">
                    {round.roundNumber}
                  </td>
                  <td className="px-4 py-2">
                    <span className="text-violet-400 text-xs font-bold">{round.initiator}</span>
                  </td>
                  <td className="px-4 py-2">
                    {round.actionA ? (
                      <span
                        className={`font-medium text-xs ${
                          round.actionA === 'TRUST' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {round.actionA}
                        {round.actionSourceA === 'timeout_default' && (
                          <span className="text-amber-500 ml-1" title="Timeout default">⏱</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {round.actionB ? (
                      <span
                        className={`font-medium text-xs ${
                          round.actionB === 'TRUST' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {round.actionB}
                        {round.actionSourceB === 'timeout_default' && (
                          <span className="text-amber-500 ml-1" title="Timeout default">⏱</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-2 font-semibold text-xs ${
                      outcomeColor[outcome ?? ''] ?? ''
                    }`}
                  >
                    {outcome ?? '—'}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono text-xs ${
                      round.payoffA > 0
                        ? 'text-emerald-400'
                        : round.payoffA < 0
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {fmt(round.payoffA)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-mono text-xs ${
                      round.payoffB > 0
                        ? 'text-emerald-400'
                        : round.payoffB < 0
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {fmt(round.payoffB)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-300">
                    {round.scoreAAfter}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-300">
                    {round.scoreBAfter}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();

  const [match, setMatch] = useState<Match | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [matchRes, roundsRes] = await Promise.all([
        fetch(`/api/matches/${id}`, { cache: 'no-store' }),
        fetch(`/api/matches/${id}/rounds`, { cache: 'no-store' }),
      ]);
      if (!matchRes.ok) {
        if (matchRes.status === 404) throw new Error('Match not found');
        throw new Error(`HTTP ${matchRes.status}`);
      }
      const matchData: Match = await matchRes.json();
      const roundsData: Round[] = roundsRes.ok ? await roundsRes.json() : [];
      setMatch(matchData);
      setRounds(roundsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load match');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll every 600ms while active
  useEffect(() => {
    if (!match || match.status !== 'active') return;
    const poll = setInterval(fetchData, 600);
    return () => clearInterval(poll);
  }, [match?.status, fetchData]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500 text-lg animate-pulse">Loading match…</div>
      </div>
    );
  }

  // ── Error ──
  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-lg">{error ?? 'Match not found'}</div>
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">
          ← Back to Arena
        </Link>
      </div>
    );
  }

  // ── Compute display state ──
  const isReplay = replayMode && match.status === 'completed' && rounds.length > 0;
  const displayIndex = isReplay ? replayIndex : rounds.length - 1;
  const currentRound = displayIndex >= 0 ? (rounds[displayIndex] ?? null) : null;
  const displayScoreA = isReplay && currentRound ? currentRound.scoreAAfter : match.scoreA;
  const displayScoreB = isReplay && currentRound ? currentRound.scoreBAfter : match.scoreB;
  const visibleRounds = isReplay ? rounds.slice(0, displayIndex + 1) : rounds;

  const isWinnerA = match.status === 'completed' && match.winnerAgentId === match.agentAId;
  const isWinnerB = match.status === 'completed' && match.winnerAgentId === match.agentBId;
  const isDraw = match.status === 'completed' && !match.winnerAgentId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* ── Navigation bar ── */}
      <nav className="border-b border-slate-800 px-6 py-3 flex items-center gap-3 text-sm">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors">
          ← Arena
        </Link>
        <span className="text-slate-700">|</span>
        <span className="text-slate-500 font-mono text-xs">{shortId(match.id)}</span>
        <StatusBadge status={match.status} />
        <span className="ml-auto text-slate-600 text-xs">
          Prize Pool:{' '}
          <span className="text-white font-mono font-semibold">{match.prizePool} TARI</span>
        </span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* ── Match header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {match.status === 'active' && `Round ${match.currentRoundNumber} of 15 — LIVE`}
              {match.status === 'completed' && !isReplay && 'Match Complete'}
              {match.status === 'pending' && 'Waiting to Start'}
              {match.status === 'cancelled' && 'Match Cancelled'}
              {isReplay && `Replay — Round ${displayIndex + 1} of ${rounds.length}`}
            </h1>
            <div className="text-sm text-slate-500 mt-0.5">
              {match.rulesVersion} · {match.stakePerAgent} TARI per agent
            </div>
          </div>

          {match.status === 'completed' && (
            <button
              onClick={() => {
                if (replayMode) {
                  setReplayMode(false);
                } else {
                  setReplayMode(true);
                  setReplayIndex(0);
                }
              }}
              className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors"
            >
              {replayMode ? 'Exit Replay' : '↺ Replay from Round 1'}
            </button>
          )}
        </div>

        {/* ── Winner / Draw banner (completed, not replay) ── */}
        {match.status === 'completed' && !isReplay && (
          <>
            {isDraw ? (
              <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl px-8 py-6 text-center">
                <div className="text-4xl font-black text-blue-300 mb-2">DRAW</div>
                <div className="text-slate-300 text-lg">
                  Both agents scored{' '}
                  <span className="font-bold text-white">{match.scoreA}</span>
                </div>
                <div className="text-slate-500 text-sm mt-2">
                  Both agents finished with the same final score. Stakes were refunded.
                </div>
              </div>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl px-8 py-6 text-center">
                <div className="text-4xl font-black text-amber-300 mb-2">
                  🏆{' '}
                  {isWinnerA ? match.agentA.name : match.agentB.name} wins
                </div>
                <div className="text-slate-300 text-lg">
                  Final score:{' '}
                  <span className="font-bold text-white">{match.scoreA}</span>
                  <span className="text-slate-500 mx-2">—</span>
                  <span className="font-bold text-white">{match.scoreB}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Agent columns ── */}
        <div className="flex gap-4">
          <AgentColumn
            agent={match.agentA}
            score={displayScoreA}
            round={currentRound}
            side="A"
            isWinner={isWinnerA && !isReplay}
          />
          <div className="flex items-center justify-center text-slate-700 font-black text-2xl px-1 select-none">
            vs
          </div>
          <AgentColumn
            agent={match.agentB}
            score={displayScoreB}
            round={currentRound}
            side="B"
            isWinner={isWinnerB && !isReplay}
          />
        </div>

        {/* ── Outcome banner for latest / replay round ── */}
        {currentRound && currentRound.actionA && currentRound.actionB && (
          <OutcomeBanner round={currentRound} />
        )}

        {/* ── Pending state ── */}
        {match.status === 'pending' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
            Match has been created and is waiting to start.
          </div>
        )}

        {/* ── Cancelled state ── */}
        {match.status === 'cancelled' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center text-red-400">
            This match was cancelled due to an error.
          </div>
        )}

        {/* ── Replay controls ── */}
        {isReplay && (
          <div className="flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 rounded-xl py-3">
            <button
              onClick={() => setReplayIndex(0)}
              disabled={replayIndex === 0}
              className="px-3 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm transition-colors"
              title="First round"
            >
              ⏮
            </button>
            <button
              onClick={() => setReplayIndex((i) => Math.max(0, i - 1))}
              disabled={replayIndex === 0}
              className="px-3 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm transition-colors"
              title="Previous round"
            >
              ◀
            </button>
            <span className="px-6 text-sm text-slate-400 min-w-32 text-center">
              Round{' '}
              <span className="text-white font-bold">{replayIndex + 1}</span>
              {' '}of {rounds.length}
            </span>
            <button
              onClick={() => setReplayIndex((i) => Math.min(rounds.length - 1, i + 1))}
              disabled={replayIndex === rounds.length - 1}
              className="px-3 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm transition-colors"
              title="Next round"
            >
              ▶
            </button>
            <button
              onClick={() => setReplayIndex(rounds.length - 1)}
              disabled={replayIndex === rounds.length - 1}
              className="px-3 py-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed font-mono text-sm transition-colors"
              title="Last round"
            >
              ⏭
            </button>
          </div>
        )}

        {/* ── Round history ── */}
        {visibleRounds.length > 0 && (
          <RoundHistoryTable rounds={visibleRounds} match={match} />
        )}

        {/* ── Footer metadata ── */}
        <div className="text-xs text-slate-700 flex gap-4 justify-center pb-4 flex-wrap">
          <span>
            Match ID: <span className="font-mono">{match.id}</span>
          </span>
          <span>·</span>
          <span>Rules: {match.rulesVersion}</span>
          {match.startedAt && (
            <>
              <span>·</span>
              <span>Started: {new Date(match.startedAt).toLocaleString()}</span>
            </>
          )}
          {match.completedAt && (
            <>
              <span>·</span>
              <span>Completed: {new Date(match.completedAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
