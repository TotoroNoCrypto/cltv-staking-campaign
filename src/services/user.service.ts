import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Payment } from 'bitcoinjs-lib/src/payments'
import config from 'config'
const bip65 = require('bip65')

import { Reward } from '../models/reward.model'

const network = config.get<Network>('bitcoin.network')

export class UserService {
  public static async getStakingAddress(
    pubkeyHex: string,
    blockheight: number,
  ): Promise<string> {
    const pubkey = this.getPubkey(pubkeyHex)
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)
    const cltvAddress = cltvPayment.address!

    return cltvAddress
  }
  public static async getReward(
    campaignId: number,
    walletAddress: string,
  ): Promise<number> {
    const reward = await Reward.findOne({
      where: {
        campaignId,
        address: walletAddress,
      },
    })

    return reward?.quantity!
  }

  private static getCltvPayment(pubkey: Buffer, blockheight: number): Payment {
    const redeemScript = this.getCltvRedeemScript(pubkey, blockheight)
    const cltvPayment = bitcoin.payments.p2sh({
      redeem: { output: redeemScript },
      network,
    })

    return cltvPayment
  }

  private static getCltvRedeemScript(
    pubkey: Buffer,
    blockheight: number,
  ): Buffer {
    const lockTime = this.getLocktime(blockheight)
    const redeemScript = bitcoin.script.compile([
      bitcoin.script.number.encode(lockTime),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      pubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    ])

    return redeemScript
  }

  private static getLocktime(blockheight: number): number {
    const lockTime = bip65.encode({ blocks: blockheight })

    return lockTime
  }

  private static getPubkey(pubkeyHex: string): Buffer {
    const pubkey = Buffer.from(pubkeyHex, 'hex')

    return pubkey
  }
}
