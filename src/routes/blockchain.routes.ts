import { Router } from 'express'

import { CampaignController } from '../controllers/blockchain.controller'

const router = Router()

router.post('/broadcast', CampaignController.broadcast)

export default router
