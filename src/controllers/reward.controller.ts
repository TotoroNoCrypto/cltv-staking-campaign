import { Request, Response } from 'express'
import { RewardRepository } from '../repositories/reward.repository'

export class RewardController {
  public static async getRewards(_: Request, res: Response) {
    try {
      const rewards = await RewardRepository.getRewards()
      res.json(rewards)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async createReward(req: Request, res: Response) {
    try {
      const { campaignId, taproot, quantity } = req.body
      const newReward = await RewardRepository.createReward(
        campaignId,
        taproot,
        quantity,
      )
      return res.json(newReward)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async getReward(req: Request, res: Response) {
    try {
      const { id } = req.params
      const reward = await RewardRepository.getReward(Number(id))
      res.json(reward)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async updateReward(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { quantity } = req.body

      const reward = await RewardRepository.updateReward(Number(id), quantity)

      res.json(reward)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }

  public static async deleteReward(req: Request, res: Response) {
    try {
      const { id } = req.params
      await RewardRepository.deleteReward(Number(id))
      return res.sendStatus(204)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }

  public static async computeRewards(req: Request, res: Response) {
    try {
      const { blockid } = req.params
      await RewardRepository.computeRewards(Number(blockid))

      return res.sendStatus(204)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }
}
