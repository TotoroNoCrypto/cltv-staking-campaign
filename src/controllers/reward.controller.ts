import { Request, Response } from 'express'
import { Reward } from '../models/reward.model'
import { Campaign } from '../models/campaign.model'
import { Staking } from '../models/staking.model'

export async function getRewards(_: Request, res: Response) {
  try {
    const rewards = await Reward.findAll({
      attributes: ['id', 'campaignId', 'address', 'quantity'],
    })
    res.json(rewards)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    }
  }
}

export async function createReward(req: Request, res: Response) {
  try {
    const { campaignId, address, quantity } = req.body
    const newReward = await Reward.create(
      {
        campaignId,
        address,
        quantity,
      },
      {
        fields: ['campaignId', 'address', 'quantity'],
      },
    )
    return res.json(newReward)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    }
  }
}

export async function getReward(req: Request, res: Response) {
  try {
    const { id } = req.params
    const reward = await Reward.findOne({
      where: {
        id,
      },
    })
    res.json(reward)
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: error.message })
    }
  }
}

export const updateReward = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { quantity } = req.body

    const reward = await Reward.findByPk(id)
    if (!reward) {
      throw new Error('Model not found')
    }

    reward.quantity = quantity
    await reward.save()

    res.json(reward)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
  }
}

export async function deleteReward(req: Request, res: Response) {
  try {
    const { id } = req.params
    await Reward.destroy({
      where: {
        id,
      },
    })
    return res.sendStatus(204)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
  }
}

export async function computeRewards(req: Request, res: Response) {
  try {
    const { blockid } = req.params
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
      attributes: ['id', 'campaignId', 'address', 'quantity', 'block'],
    })

    campaigns.forEach(async campaign => {
      const rewardPerBlock =
        campaign.quantity / (campaign.blockEnd - campaign.blockStart)

      const stakerRewards = new Map()
      let totalQuantities = 0
      const start =
        campaign.lastBlockReward > campaign.blockStart
          ? campaign.lastBlockReward
          : campaign.blockStart
      const end = parseInt(blockid)
      for (let block = start; block <= end; block++) {
        let share = totalQuantities > 0 ? rewardPerBlock / totalQuantities : 0
        share = Math.round(share * 10 ** 8) / 10 ** 8

        stakings.forEach(async staking => {
          if (staking.campaignId === campaign.id) {
            if (staking.block < block) {
              if (!stakerRewards.has(staking.address)) {
                stakerRewards.set(staking.address, 0)
              }

              const reward = stakerRewards.get(staking.address)
              stakerRewards.set(
                staking.address,
                reward + staking.quantity * share,
              )
            }

            if (
              staking.block === block ||
              (block === start && staking.block < start)
            ) {
              totalQuantities += staking.quantity
            }
          }
        })
      }

      stakerRewards.forEach(async (value, key) => {
        const [reward] = await Reward.findOrCreate({
          where: {
            campaignId: campaign.id,
            address: key,
          },
        })
        reward.quantity += value
        await reward.save()
      })

      campaign.lastBlockReward = parseInt(blockid)
      await campaign.save()
    })

    return res.sendStatus(204)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
  }
}
