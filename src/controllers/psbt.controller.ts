import { Request, Response } from 'express'
import { PsbtService } from '../services/psbt.service'

export async function stake(req: Request, res: Response): Promise<Response> {
  try {
    const { taproot, pubKey, txid, vout } = req.body

    const psbtService = new PsbtService()
    const psbt = await psbtService.stake(taproot, pubKey, txid, vout)

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
    const { taproot, pubKey } = req.body
    console.log('Into claim')

    const psbtService = new PsbtService()
    const psbt = await psbtService.claim(taproot, pubKey)

    return res.json(psbt)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Error' })
  }
}
