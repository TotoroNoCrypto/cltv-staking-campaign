import { Router } from 'express'

import { CampaignController } from '../controllers/psbt.controller'

const router = Router()

router.post('/stake', CampaignController.stake)
router.post('/finalizeStake', CampaignController.finalizeStake)
router.post('/claim', CampaignController.claim)
router.post('/finalizeClaim', CampaignController.finalizeClaim)

export default router
