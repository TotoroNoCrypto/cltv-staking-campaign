import { Router } from 'express'
import { RewardController } from '../controllers/reward.controller'

const router = Router()

// Routes
router.get('/', RewardController.getRewards)
router.post('/', RewardController.createReward)
router.get('/:id', RewardController.getReward)
router.put('/:id', RewardController.updateReward)
router.delete('/:id', RewardController.deleteReward)
router.put('/compute/:blockid', RewardController.computeRewards)

export default router
