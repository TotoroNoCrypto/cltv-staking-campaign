import { Request, Response } from 'express'
import { UserService } from '../services/user.service'

export async function getScriptAddress(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { pubKey, blockheight } = req.body

    const scriptAddress = await UserService.getScriptAddress(
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
