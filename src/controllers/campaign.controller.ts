import { Request, Response } from 'express'
import { CampaignRepository } from '../repositories/campaign.repository'

export class CampaignController {
  public static async getCampaigns(_: Request, res: Response) {
    try {
      const campaigns = await CampaignRepository.getCampaigns()
      res.json(campaigns)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async createCampaign(req: Request, res: Response) {
    try {
      const { type, name, quantity, blockStart, blockEnd } = req.body
      const newCampaign = await CampaignRepository.createCampaign(
        type,
        name,
        quantity,
        blockStart,
        blockEnd,
      )
      return res.json(newCampaign)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async getCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params
      const campaign = await CampaignRepository.getCampaign(Number(id))
      res.json(campaign)
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ message: error.message })
      }
    }
  }

  public static async updateCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { type, name, quantity, blockStart, blockEnd, lastBlockReward } = req.body

      const campaign = await CampaignRepository.updateCampaign(
        Number(id),
        type,
        name,
        quantity,
        blockStart,
        blockEnd,
        lastBlockReward,
      )

      res.json(campaign)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }

  public static async deleteCampaign(req: Request, res: Response) {
    try {
      const { id } = req.params
      await CampaignRepository.deleteCampaign(Number(id))
      return res.sendStatus(204)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
    }
  }
}
