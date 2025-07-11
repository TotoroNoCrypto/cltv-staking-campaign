import express from 'express'
import campaignRoutes from './routes/campaigns.routes'
import stakingRoutes from './routes/stakings.routes'
import rewardRoutes from './routes/rewards.routes'
import psbtRoutes from './routes/psbt.routes'
import signatureRoutes from './routes/signature.routes'
import blockchainRoutes from './routes/blockchain.routes'
import userRoutes from './routes/user.routes'

const app = express()

app.use(express.json())

app.use('/api/campaigns', campaignRoutes)
app.use('/api/stakings', stakingRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/psbt', psbtRoutes)
app.use('/api/signature', signatureRoutes)
app.use('/api/blockchain', blockchainRoutes)
app.use('/api/user', userRoutes)

export default app
