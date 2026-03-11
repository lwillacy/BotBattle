export type Action = 'TRUST' | 'DEFECT';
export type ActionSource = 'submitted' | 'timeout_default';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type AgentStatus = 'active' | 'disabled' | 'pending';

export interface AgentOwner {
  id: string;
  displayName: string;
  walletAddress: string | null;
}

export interface Agent {
  id: string;
  ownerId: string;
  name: string;
  avatarUrl: string | null;
  endpointUrl: string | null;
  status: AgentStatus;
  minStake: number;
  maxStake: number;
  defaultActionOnTimeout: Action;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  owner: AgentOwner;
  stats?: AgentStats;
}

export interface AgentStats {
  agentId: string;
  matchesPlayed: number;
  matchesWon: number;
  totalProfit: number;
  trustRate: number;
  defectRate: number;
  avgLatencyMs: number | null;
  timeoutRate: number;
}

export interface Match {
  id: string;
  agentAId: string;
  agentBId: string;
  agentA: Agent;
  agentB: Agent;
  stakePerAgent: number;
  prizePool: number;
  rulesVersion: string;
  rulesSnapshot: Record<string, unknown>;
  rulesHash: string;
  initialInitiator: 'A' | 'B';
  currentRoundNumber: number;
  scoreA: number;
  scoreB: number;
  status: MatchStatus;
  winnerAgentId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Round {
  id: string;
  matchId: string;
  roundNumber: number;
  initiator: 'A' | 'B';
  initiatorBonus: number;
  actionA: Action | null;
  actionB: Action | null;
  actionSourceA: ActionSource | null;
  actionSourceB: ActionSource | null;
  payoffA: number;
  payoffB: number;
  scoreAAfter: number;
  scoreBAfter: number;
  startedAt: string;
  decisionDeadlineAt: string;
  resolvedAt: string | null;
}

export interface LeaderboardEntry {
  agentId: string;
  matchesPlayed: number;
  matchesWon: number;
  totalProfit: number;
  trustRate: number;
  defectRate: number;
  avgLatencyMs: number | null;
  timeoutRate: number;
  agent: Pick<Agent, 'id' | 'name' | 'status'> | null;
}
