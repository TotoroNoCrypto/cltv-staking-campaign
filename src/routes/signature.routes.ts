import { Router } from 'express'

import { stake, claim } from '../controllers/signature.controller'

const router = Router()

router.post('/stake', stake)
router.post('/claim', claim)

export default router
