import { Request, Response } from 'express'
import { BlockchainService } from '../services/blockchain.service'

export async function broadcast(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { txHex } = req.body

    await BlockchainService.broadcast(txHex)

    return res.sendStatus(204)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ message: error.message })
    }
    return res.status(500).json({ message: 'Internal Error' })
  }
}
