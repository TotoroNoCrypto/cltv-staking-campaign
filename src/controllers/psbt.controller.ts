import { Request, Response } from 'express'
import { PsbtService } from '../services/psbt.service'

export class CampaignController {
  public static async stake(req: Request, res: Response): Promise<Response> {
    try {
      const { taproot, pubKey, txid, vout, campaignid, amt } = req.body

      const psbt = await PsbtService.stake(
        taproot,
        pubKey,
        txid,
        vout,
        campaignid,
        amt,
      )

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async stakeRune(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { taproot, pubKey, txid, vout, campaignid, runeid, amt } = req.body

      const psbt = await PsbtService.stakeRune(
        taproot,
        pubKey,
        txid,
        vout,
        campaignid,
        runeid,
        amt,
      )

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async stakeBTC(req: Request, res: Response): Promise<Response> {
    try {
      const { taproot, pubKey, amt } = req.body

      const psbt = await PsbtService.stakeBTC(taproot, pubKey, amt)

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
      const { taproot, pubKey, txid, vout, campaignid, amt, psbtHex } = req.body

      const psbt = await PsbtService.finalizeStake(
        taproot,
        pubKey,
        txid,
        vout,
        campaignid,
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

  public static async finalizeStakeRune(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { taproot, pubKey, txid, vout, campaignid, amt, psbtHex } = req.body

      const psbt = await PsbtService.finalizeStakeRune(
        taproot,
        pubKey,
        txid,
        vout,
        campaignid,
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

  public static async finalizeStakeBTC(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { taproot, pubKey, amt, psbtHex } = req.body

      const psbt = await PsbtService.finalizeStakeBTC(
        taproot,
        pubKey,
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
      const { taproot, pubKey, campaignid } = req.body

      const psbt = await PsbtService.claim(taproot, pubKey, campaignid)

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

  public static async restake(req: Request, res: Response): Promise<Response> {
    try {
      const { taproot, pubKey, fromcampaignid, tocampaignid, amt } = req.body

      const psbt = await PsbtService.restake(
        taproot,
        pubKey,
        fromcampaignid,
        tocampaignid,
        amt,
      )

      return res.json(psbt)
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message })
      }
      return res.status(500).json({ message: 'Internal Error' })
    }
  }

  public static async finalizeRestake(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { taproot, pubKey, campaignid, amt, psbtHex } = req.body

      const psbt = await PsbtService.finalizeRestake(
        taproot,
        pubKey,
        campaignid,
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
}
