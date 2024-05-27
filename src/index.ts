import app from './app'
import { sequelize } from './database/database'
import { BackgroundService } from './services/background.service'

async function main() {
  await sequelize.sync({ force: false })

  setInterval(async () => {
    await BackgroundService.recordUnconfirmedStakings()
  }, 10000)

  app.listen(3000)
  console.log('Server on port 3000')
}

main()
