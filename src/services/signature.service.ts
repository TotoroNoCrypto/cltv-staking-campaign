import { ECPair, ECPairInterface } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { AddressType } from '@unisat/wallet-sdk/lib/'
import { NetworkType } from '@unisat/wallet-sdk/lib/network'
import { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import config from 'config'

const network = config.get<Network>('bitcoin.network')
const networkType = config.get<NetworkType>('bitcoin.networkType')
const wif = config.get<string>('wallet.wif')

export class SignatureService {
  public static async stake(psbtHex: string): Promise<string> {
    const signer = this.getSigner()
    const wallet = this.getWallet(signer)
    const psbt = Psbt.fromHex(psbtHex)
    await wallet.signPsbt(psbt, {
      toSignInputs: [
        { index: 0, publicKey: wallet.pubkey },
        { index: 1, publicKey: wallet.pubkey },
      ],
    })

    return psbt.toHex()
  }

  public static async claim(psbtHex: string): Promise<string> {
    const signer = this.getSigner()
    const wallet = this.getWallet(signer)
    const psbt = Psbt.fromHex(psbtHex)
    let toSignInputs: Array<{ index: number; publicKey: string }> = []
    psbt.txInputs.map(
      (input, index) =>
        (toSignInputs = toSignInputs.concat({
          index,
          publicKey: wallet.pubkey,
        })),
    )
    await wallet.signPsbt(psbt, {
      toSignInputs,
    })

    return psbt.toHex()
  }

  private static getWallet(signer: ECPairInterface): LocalWallet {
    const wallet = new LocalWallet(
      signer.toWIF(),
      AddressType.P2WPKH,
      networkType,
    )

    return wallet
  }

  private static getSigner(): ECPairInterface {
    const signer = ECPair.fromWIF(wif, network)

    return signer
  }
}
