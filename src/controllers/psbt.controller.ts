import { Request, Response } from 'express'
import { PsbtService } from '../services/psbt.service'

export class CampaignController {
  public static async stake(req: Request, res: Response): Promise<Response> {
    try {
      const { taproot, pubKey, txid, vout, tick } = req.body

      const psbt = await PsbtService.stake(taproot, pubKey, txid, vout, tick)

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async finalizeStake(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { taproot, pubKey, txid, vout, tick, amt, psbtHex } = req.body

      const psbt = await PsbtService.finalizeStake(
        taproot,
        pubKey,
        txid,
        vout,
        tick,
        amt,
        psbtHex,
      )

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async claim(req: Request, res: Response): Promise<Response> {
    try {
      const { taproot, pubKey, tick } = req.body

      const psbt = await PsbtService.claim(taproot, pubKey, tick)

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async finalizeClaim(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { psbtHex } = req.body

      const psbt = await PsbtService.finalizeClaim(psbtHex)

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }
}
