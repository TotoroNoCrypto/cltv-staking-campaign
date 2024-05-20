import { Router } from 'express'

import {
  stake,
  finalizeStake,
  claim,
  finalizeClaim,
} from '../controllers/psbt.controller'

const router = Router()

router.post('/stake', stake)
router.post('/finalizeStake', finalizeStake)
router.post('/claim', claim)
router.post('/finalizeClaim', finalizeClaim)

export default router
