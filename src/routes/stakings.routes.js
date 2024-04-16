import { Router } from "express";
import {
    getStakings,
    createStaking,
    getStaking
} from "../controllers/staking.controller.js";

const router = Router();

// Routes
router.get("/", getStakings);
router.post("/", createStaking);
router.get("/:id", getStaking);

export default router;
