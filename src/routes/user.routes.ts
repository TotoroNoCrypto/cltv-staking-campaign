import { Router } from 'express'

import { getScriptAddress } from '../controllers/user.controller'

const router = Router()

router.post('/scriptaddress', getScriptAddress)

export default router
