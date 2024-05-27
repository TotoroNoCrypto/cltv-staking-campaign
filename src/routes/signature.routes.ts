import { Router } from 'express'

import { CampaignController } from '../controllers/signature.controller'

const router = Router()

router.post('/stake', CampaignController.stake)
router.post('/claim', CampaignController.claim)

export default router
