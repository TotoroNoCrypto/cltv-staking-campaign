import express from "express";
import campaignRoutes from "./routes/campaigns.routes.js";
import stakingRoutes from "./routes/stakings.routes.js";

const app = express();

app.use(express.json());

app.use("/api/campaigns", campaignRoutes);
app.use("/api/stakings", stakingRoutes);

export default app;
