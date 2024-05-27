import { Router } from 'express'

import { UserController } from '../controllers/user.controller'

const router = Router()

router.get('/stakingaddress', UserController.getStakingAddress)
router.get('/reward', UserController.getReward)

export default router
