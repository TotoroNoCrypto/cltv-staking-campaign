import express from "express";
import campaignRoutes from "./routes/campaigns.routes.js";
import stakingRoutes from "./routes/stakings.routes.js";
import rewardRoutes from "./routes/rewards.routes.js";

const app = express();

app.use(express.json());

app.use("/api/campaigns", campaignRoutes);
app.use("/api/stakings", stakingRoutes);
app.use("/api/rewards", rewardRoutes);

export default app;
