import { Request, Response } from 'express'
import { UserService } from '../services/user.service'

export class UserController {
  public static async getStakingAddress(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { pubKey, blockheight } = req.body
  
      const scriptAddress = await UserService.getStakingAddress(
        pubKey,
        blockheight,
      )
  
      return res.json(scriptAddress)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }
  
  public static async getReward(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { campaignId, taproot } = req.body
  
      const reward = await UserService.getReward(campaignId, taproot)
  
      return res.json(reward)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }
}
