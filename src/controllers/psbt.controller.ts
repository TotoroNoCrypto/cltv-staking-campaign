import { Request, Response } from 'express'
import { PsbtService } from '../services/psbt.service'

export async function stake(req: Request, res: Response): Promise<Response> {
  try {
    const { taproot, pubKey, txid, vout, blockheight } = req.body

    const psbt = await PsbtService.stake(
      taproot,
      pubKey,
      txid,
      vout,
      blockheight,
    )

    return res.json(psbt)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Error' })
  }
}

export async function claim(req: Request, res: Response): Promise<Response> {
  try {
    const { taproot, pubKey, blockheight } = req.body
    console.log('Into claim')

    const psbt = await PsbtService.claim(taproot, pubKey, blockheight)

    return res.json(psbt)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Error' })
  }
}
