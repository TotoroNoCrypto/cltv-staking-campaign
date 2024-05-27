import { Router } from 'express'
import { StakingController } from '../controllers/staking.controller'

const router = Router()

// Routes
router.get('/', StakingController.getStakings)
router.post('/', StakingController.createStaking)
router.get('/:id', StakingController.getStaking)

export default router
