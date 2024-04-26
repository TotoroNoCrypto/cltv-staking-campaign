import { Router } from 'express'

import { stake } from '../controllers/signature.controller'

const router = Router()

router.post('/stake', stake)

export default router
