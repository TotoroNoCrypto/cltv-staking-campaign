import app from './app'
import { sequelize } from './database/database'

async function main() {
  await sequelize.sync({ force: false })
  app.listen(3000)
  console.log('Server on port 3000')
}

main()
