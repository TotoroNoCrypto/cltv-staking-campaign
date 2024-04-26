import express from 'express'
import campaignRoutes from './routes/campaigns.routes'
import stakingRoutes from './routes/stakings.routes'
import rewardRoutes from './routes/rewards.routes'
import psbtRoutes from './routes/psbt.routes'
import signatureRoutes from './routes/signature.routes'

const app = express()

app.use(express.json())

app.use('/api/campaigns', campaignRoutes)
app.use('/api/stakings', stakingRoutes)
app.use('/api/rewards', rewardRoutes)
app.use('/api/psbt', psbtRoutes)
app.use('/api/signature', signatureRoutes)

export default app
