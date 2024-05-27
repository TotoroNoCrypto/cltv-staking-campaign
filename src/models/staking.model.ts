import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../database/database'

export interface StakingModel extends Model {
  id: number
  campaignId: number
  walletAddress: string
  scriptAddress: string
  quantity: number
  block: number
}

export const Staking = sequelize.define<StakingModel>('stakings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  walletAddress: {
    type: DataTypes.STRING,
  },
  scriptAddress: {
    type: DataTypes.STRING,
  },
  quantity: {
    type: DataTypes.INTEGER,
  },
  block: {
    type: DataTypes.INTEGER,
  },
})
