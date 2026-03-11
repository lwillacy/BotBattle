/**
 * Tit-for-Tat Agent (port 3103)
 * Trust first round.
 * Mirror opponent's previous action thereafter.
 */
import express, { Request, Response } from "express";
import { AgentDecisionPayload, Action } from "@tari-agent-arena/shared";

const app = express();
app.use(express.json());

const PORT = 3103;

app.post("/decision", (req: Request, res: Response) => {
  const payload: AgentDecisionPayload = req.body;
  const action = decide(payload);
  return res.json({ action });
});

function decide(payload: AgentDecisionPayload): Action {
  const { history } = payload;

  // Trust on first round
  if (history.length === 0) {
    return "TRUST";
  }

  // Mirror opponent's last action
  const lastRound = history[history.length - 1];
  return lastRound.opponentAction;
}

app.listen(PORT, () => {
  console.log(`Tit-for-Tat Agent listening on port ${PORT}`);
});

export default app;
