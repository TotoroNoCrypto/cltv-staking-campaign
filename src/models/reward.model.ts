import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../database/database'

interface RewardModel extends Model {
  id: number
  campaignId: number
  address: string
  quantity: number
}

export const Reward = sequelize.define<RewardModel>(
  'rewards',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    address: {
      type: DataTypes.STRING,
    },
    quantity: {
      type: DataTypes.FLOAT,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ['campaignId', 'address'],
      },
    ],
  },
)
