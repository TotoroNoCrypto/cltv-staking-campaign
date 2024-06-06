import { Router } from 'express'

import { CampaignController } from '../controllers/signature.controller'

const router = Router()

router.post('/sign', CampaignController.sign)

export default router
