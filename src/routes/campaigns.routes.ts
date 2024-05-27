import { Router } from 'express'
import { CampaignController } from '../controllers/campaign.controller'

const router = Router()

// Routes
router.get('/', CampaignController.getCampaigns)
router.post('/', CampaignController.createCampaign)
router.get('/:id', CampaignController.getCampaign)
router.put('/:id', CampaignController.updateCampaign)
router.delete('/:id', CampaignController.deleteCampaign)

export default router
