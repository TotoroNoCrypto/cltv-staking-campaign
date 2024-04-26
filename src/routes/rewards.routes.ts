import { Router } from 'express'
import {
  getRewards,
  createReward,
  getReward,
  updateReward,
  deleteReward,
  computeRewards,
} from '../controllers/reward.controller'

const router = Router()

// Routes
router.get('/', getRewards)
router.post('/', createReward)
router.get('/:id', getReward)
router.put('/:id', updateReward)
router.delete('/:id', deleteReward)
router.put('/compute/:blockid', computeRewards)

export default router
