import express from 'express'
import campaignRoutes from './routes/campaigns.routes'
import stakingRoutes from './routes/stakings.routes'
import rewardRoutes from './routes/rewards.routes'

const app = express()

app.use(express.json())

app.use('/api/campaigns', campaignRoutes)
app.use('/api/stakings', stakingRoutes)
app.use('/api/rewards', rewardRoutes)

export default app
