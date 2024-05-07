import { Router } from 'express'

import { getStakingAddress, getReward } from '../controllers/user.controller'

const router = Router()

router.get('/stakingaddress', getStakingAddress)
router.get('/reward', getReward)

export default router
