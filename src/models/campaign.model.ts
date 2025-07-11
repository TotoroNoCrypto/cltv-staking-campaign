import { DataTypes, Model } from 'sequelize'
import { sequelize } from '../database/database'
import { Staking } from './staking.model'
import { Reward } from './reward.model'

export interface CampaignModel extends Model {
  id: number
  type: string
  name: string
  quantity: number
  blockStart: number
  blockEnd: number
  lastBlockReward: number
}

export const Campaign = sequelize.define<CampaignModel>('campaigns', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  type: {
    type: DataTypes.STRING,
  },
  name: {
    type: DataTypes.STRING,
  },
  quantity: {
    type: DataTypes.INTEGER,
  },
  blockStart: {
    type: DataTypes.INTEGER,
  },
  blockEnd: {
    type: DataTypes.INTEGER,
  },
  lastBlockReward: {
    type: DataTypes.INTEGER,
  },
})

Staking.belongsTo(Campaign, { foreignKey: 'campaignId' })
Reward.belongsTo(Campaign, { foreignKey: 'campaignId' })
