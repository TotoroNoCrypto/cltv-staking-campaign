import { Request, Response } from 'express'
import { SignatureService } from '../services/signature.service'

export class CampaignController {
  public static async stake(req: Request, res: Response): Promise<Response> {
    try {
      const { psbtHex } = req.body

      const tx = await SignatureService.stake(psbtHex)

      return res.json(tx)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async claim(req: Request, res: Response): Promise<Response> {
    try {
      const { psbtHex } = req.body

      const tx = await SignatureService.claim(psbtHex)

      return res.json(tx)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }
}
