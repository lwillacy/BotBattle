/**
 * Opportunist Agent (port 3102)
 * Trust early (rounds 1-10), defect late (rounds 11+) when behind or close.
 * Always defect in final round if score is close or favorable.
 */
import express, { Request, Response } from "express";
import { AgentDecisionPayload, Action } from "@tari-agent-arena/shared";

const app = express();
app.use(express.json());

const PORT = 3102;

app.post("/decision", (req: Request, res: Response) => {
  const payload: AgentDecisionPayload = req.body;
  const action = decide(payload);
  return res.json({ action });
});

function decide(payload: AgentDecisionPayload): Action {
  const { roundNumber, totalRounds, score } = payload;
  const isLastRound = roundNumber === totalRounds;
  const isLateGame = roundNumber > 10;
  const scoreDiff = score.you - score.opponent;

  // Always defect in final round unless significantly behind (won't matter anyway)
  if (isLastRound) {
    return "DEFECT";
  }

  // In late game, defect if close or ahead
  if (isLateGame && scoreDiff >= -2) {
    return "DEFECT";
  }

  // Early game: trust
  return "TRUST";
}

app.listen(PORT, () => {
  console.log(`Opportunist Agent listening on port ${PORT}`);
});

export default app;
