import { Request, Response } from 'express'
import { SignatureService } from '../services/signature.service'

export class CampaignController {
  public static async sign(req: Request, res: Response): Promise<Response> {
    try {
      const { psbtHex } = req.body

      const tx = await SignatureService.sign(psbtHex)

      return res.json(tx)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }
}
