import { Router } from "express";
import {
    getRewards,
    createReward,
    getReward,
    updateReward,
    deleteReward
} from "../controllers/reward.controller.js";

const router = Router();

// Routes
router.get("/", getRewards);
router.post("/", createReward);
router.get("/:id", getReward);
router.put("/:id", updateReward);
router.delete("/:id", deleteReward);

export default router;
