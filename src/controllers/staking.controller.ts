import { Request, Response } from 'express'
import { StakingRepository } from '../repositories/staking.repository'

export class StakingController {
  public static async getStakings(_: Request, res: Response) {
    try {
      const stakings = await StakingRepository.getStakings()
      res.json(stakings)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async createStaking(req: Request, res: Response) {
    try {
      const { campaignId, taproot, quantity } = req.body
      const newStaking = await StakingRepository.createStaking(
        campaignId,
        taproot,
        quantity
      )
      return res.json(newStaking)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async getStaking(req: Request, res: Response) {
    try {
      const { id } = req.params
      const staking = await StakingRepository.getStaking(Number(id))
      res.json(staking)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }
}
