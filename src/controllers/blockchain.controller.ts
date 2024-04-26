import { Request, Response } from 'express'
import { BlockchainService } from '../services/blockchain.service'

export async function stake(req: Request, res: Response): Promise<Response> {
  try {
    const { txHex } = req.body

    const result = await BlockchainService.stake(txHex)

    return res.json(result)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Error' })
  }
}
