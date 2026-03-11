import prisma from "../db/prisma";
import { LedgerEntryType } from "@tari-agent-arena/shared";

export interface CreateLedgerEntryParams {
  ownerId?: string;
  agentId?: string;
  matchId?: string;
  roundId?: string;
  type: LedgerEntryType;
  amount: number;
  balanceAfter?: number;
  assetSymbol: string;
  txHash?: string;
  metadata?: object;
}

export async function createLedgerEntry(params: CreateLedgerEntryParams) {
  return prisma.ledgerEntry.create({
    data: {
      ownerId: params.ownerId ?? null,
      agentId: params.agentId ?? null,
      matchId: params.matchId ?? null,
      roundId: params.roundId ?? null,
      type: params.type,
      amount: params.amount,
      balanceAfter: params.balanceAfter ?? null,
      assetSymbol: params.assetSymbol,
      txHash: params.txHash ?? null,
      metadata: params.metadata ?? null,
    },
  });
}

export async function createStakeLockedEntries(
  matchId: string,
  agentAId: string,
  agentBId: string,
  stakePerAgent: number,
  ownerAId: string,
  ownerBId: string
) {
  await Promise.all([
    createLedgerEntry({
      ownerId: ownerAId,
      agentId: agentAId,
      matchId,
      type: "stake_locked",
      amount: -stakePerAgent,
      assetSymbol: "TARI",
      metadata: { note: "Stake locked for match" },
    }),
    createLedgerEntry({
      ownerId: ownerBId,
      agentId: agentBId,
      matchId,
      type: "stake_locked",
      amount: -stakePerAgent,
      assetSymbol: "TARI",
      metadata: { note: "Stake locked for match" },
    }),
  ]);
}

export async function createInitiatorBonusEntry(
  matchId: string,
  roundId: string,
  initiatorAgentId: string,
  initiatorOwnerId: string,
  bonus: number
) {
  return createLedgerEntry({
    ownerId: initiatorOwnerId,
    agentId: initiatorAgentId,
    matchId,
    roundId,
    type: "initiator_bonus",
    amount: bonus,
    assetSymbol: "TARI",
    metadata: { note: "Initiator bonus for round" },
  });
}

export async function createRoundPayoffEntries(
  matchId: string,
  roundId: string,
  agentAId: string,
  agentBId: string,
  ownerAId: string,
  ownerBId: string,
  payoffA: number,
  payoffB: number
) {
  await Promise.all([
    createLedgerEntry({
      ownerId: ownerAId,
      agentId: agentAId,
      matchId,
      roundId,
      type: "round_payoff",
      amount: payoffA,
      assetSymbol: "TARI",
    }),
    createLedgerEntry({
      ownerId: ownerBId,
      agentId: agentBId,
      matchId,
      roundId,
      type: "round_payoff",
      amount: payoffB,
      assetSymbol: "TARI",
    }),
  ]);
}

export async function createPrizePayoutEntry(
  matchId: string,
  winnerAgentId: string,
  winnerOwnerId: string,
  prizePool: number
) {
  return createLedgerEntry({
    ownerId: winnerOwnerId,
    agentId: winnerAgentId,
    matchId,
    type: "prize_payout",
    amount: prizePool,
    assetSymbol: "TARI",
    metadata: { note: "Prize pool payout for match winner" },
  });
}

export async function createStakeRefundEntries(
  matchId: string,
  agentAId: string,
  agentBId: string,
  ownerAId: string,
  ownerBId: string,
  stakePerAgent: number
) {
  await Promise.all([
    createLedgerEntry({
      ownerId: ownerAId,
      agentId: agentAId,
      matchId,
      type: "stake_refunded",
      amount: stakePerAgent,
      assetSymbol: "TARI",
      metadata: { note: "Stake refunded - tie" },
    }),
    createLedgerEntry({
      ownerId: ownerBId,
      agentId: agentBId,
      matchId,
      type: "stake_refunded",
      amount: stakePerAgent,
      assetSymbol: "TARI",
      metadata: { note: "Stake refunded - tie" },
    }),
  ]);
}
