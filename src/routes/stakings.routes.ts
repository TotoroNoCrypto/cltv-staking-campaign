import { Router } from 'express'
import { StakingController } from '../controllers/staking.controller'

const router = Router()

// Routes
router.get('/tvl', StakingController.getTVL)
router.get('/', StakingController.getStakings)
router.post('/', StakingController.createStaking)
router.get('/:id', StakingController.getStaking)
router.post('/:id', StakingController.updateStaking)

export default router
