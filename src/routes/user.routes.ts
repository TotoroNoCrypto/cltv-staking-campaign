import { Router } from 'express'

import { getScriptAddress, getReward } from '../controllers/user.controller'

const router = Router()

router.post('/scriptaddress', getScriptAddress)
router.post('/reward', getReward)

export default router
