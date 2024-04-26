import { Router } from 'express'

import { broadcast } from '../controllers/blockchain.controller'

const router = Router()

router.post('/broadcast', broadcast)

export default router
