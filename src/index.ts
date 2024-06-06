import app from './app'
import { sequelize } from './database/database'
import { BackgroundService } from './services/background.service'
import config from 'config'

const backgroundServiceInterval = config.get<number>('backgroundServiceInterval')

async function main() {
  await sequelize.sync({ force: false })

  setInterval(async () => {
    try {
      await BackgroundService.recordUnconfirmedStakings()
      await BackgroundService.recordUnconfirmedBTCStakings()
      await BackgroundService.refreshRewards()
    } catch (error) {
      console.log('Background service error')
    }
  }, backgroundServiceInterval)

  app.listen(3000)
  console.log('Server on port 3000')
}

main()
