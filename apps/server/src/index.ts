import express from "express";
import { config } from "./config";
import routes from "./routes";

const app = express();

app.use(express.json());

// Mount all routes
app.use("/", routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(config.port, () => {
  console.log(`Tari Agent Arena server running on port ${config.port}`);
});

export default app;
