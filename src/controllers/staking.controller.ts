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
      const { campaignId, taproot, script, txid, vout, runeId, quantity } =
        req.body
      const newStaking = await StakingRepository.createStaking(
        campaignId,
        taproot,
        script,
        txid,
        vout,
        runeId,
        quantity,
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

  public static async updateStaking(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { block } = req.body

      const staking = await StakingRepository.updateStaking(Number(id), block)

      res.json(staking)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }

  public static async getTVL(req: Request, res: Response) {
    try {
      const campaignTVL = await StakingRepository.getTVL()
      res.json(campaignTVL)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }
}
