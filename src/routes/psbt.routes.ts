import { Router } from 'express'

import { CampaignController } from '../controllers/psbt.controller'

const router = Router()

router.post('/stake', CampaignController.stake)
router.post('/stakeRune', CampaignController.stakeRune)
router.post('/stakeBTC', CampaignController.stakeBTC)
router.post('/finalizeStake', CampaignController.finalizeStake)
router.post('/finalizeStakeRune', CampaignController.finalizeStakeRune)
router.post('/finalizeStakeBTC', CampaignController.finalizeStakeBTC)
router.post('/claim', CampaignController.claim)
router.post('/finalizeClaim', CampaignController.finalizeClaim)
router.post('/restake', CampaignController.restake)
router.post('/finalizeRestake', CampaignController.finalizeRestake)

export default router
