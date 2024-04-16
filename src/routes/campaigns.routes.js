import { Router } from "express";
import {
    getCampaigns,
    createCampaign,
    getCampaign,
    updateCampaign,
    deleteCampaign
} from "../controllers/campaign.controller.js";

const router = Router();

// Routes
router.get("/", getCampaigns);
router.post("/", createCampaign);
router.get("/:id", getCampaign);
router.put("/:id", updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;
