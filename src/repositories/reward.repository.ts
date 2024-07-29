import { Op } from 'sequelize'
import { RewardModel, Reward } from '../models/reward.model'
import { Campaign } from '../models/campaign.model'
import { Staking } from '../models/staking.model'

export class RewardRepository {
  public static async getRewards(): Promise<RewardModel[]> {
    const rewards = await Reward.findAll({
      attributes: ['id', 'campaignId', 'walletAddress', 'quantity'],
    })

    return rewards
  }

  public static async createReward(
    campaignId: number,
    taproot: string,
    quantity: number,
  ): Promise<RewardModel> {
    const newReward = await Reward.create(
      {
        campaignId,
        taproot,
        quantity,
      },
      {
        fields: ['campaignId', 'walletAddress', 'quantity'],
      },
    )

    return newReward
  }

  public static async getReward(id: number): Promise<RewardModel | null> {
    const reward = await Reward.findOne({
      where: {
        id,
      },
    })

    return reward
  }

  public static async updateReward(
    id: number,
    quantity: number,
  ): Promise<RewardModel> {
    const reward = await Reward.findByPk(id)
    if (!reward) {
      throw new Error('Model not found')
    }

    reward.quantity = quantity
    await reward.save()

    return reward
  }

  public static async deleteReward(id: number): Promise<void> {
    await Reward.destroy({
      where: {
        id,
      },
    })
  }

  public static async computeRewards(blockid: number): Promise<void> {
    const campaigns = await Campaign.findAll({
      attributes: [
        'id',
        'name',
        'quantity',
        'blockStart',
        'blockEnd',
        'lastBlockReward',
      ],
    })
    const stakings = await Staking.findAll({
      where: {
        block: { [Op.not]: null },
      },
      attributes: [
        'id',
        'campaignId',
        'walletAddress',
        'scriptAddress',
        'quantity',
        'block',
      ],
    })

    for (let index = 0; index < campaigns.length; index++) {
      const campaign = campaigns[index]
      const rewardPerBlock =
        campaign.quantity / (campaign.blockEnd - campaign.blockStart)

      const stakerRewards = new Map()
      let totalQuantities = 0
      const start =
        campaign.lastBlockReward > campaign.blockStart
          ? campaign.lastBlockReward
          : campaign.blockStart
      const end = blockid < campaign.blockEnd ? blockid : campaign.blockEnd
      for (let block = start; block <= end; block++) {
        let share = totalQuantities > 0 ? rewardPerBlock / totalQuantities : 0

        for (let index = 0; index < stakings.length; index++) {
          const staking = stakings[index]
          if (staking.campaignId === campaign.id) {
            if (staking.block < block) {
              if (!stakerRewards.has(staking.walletAddress)) {
                stakerRewards.set(staking.walletAddress, 0)
              }

              const reward = stakerRewards.get(staking.walletAddress)
              stakerRewards.set(
                staking.walletAddress,
                reward + staking.quantity * share,
              )
            }

            if (
              staking.block === block ||
              (block === start && staking.block < start)
            ) {
              totalQuantities =
                Number(totalQuantities) + Number(staking.quantity)
            }
          }
        }
      }

      stakerRewards.forEach(async (value, key) => {
        const [reward] = await Reward.findOrCreate({
          where: {
            campaignId: campaign.id,
            walletAddress: key,
          },
        })
        reward.quantity = Number(reward.quantity) + Number(value)
        await reward.save()
      })

      campaign.lastBlockReward = blockid
      await campaign.save()
    }
  }
}
