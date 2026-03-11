import { Router } from "express";
import agentsRouter from "./agents";
import matchesRouter from "./matches";
import leaderboardRouter from "./leaderboard";
import healthRouter from "./health";

const router = Router();

router.use("/agents", agentsRouter);
router.use("/matches", matchesRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/health", healthRouter);

export default router;
