import {
  ECPair,
  ECPairInterface,
  bitcoin,
} from '@unisat/wallet-sdk/lib/bitcoin-core'
import { AddressType } from '@unisat/wallet-sdk/lib/'
import { NetworkType } from '@unisat/wallet-sdk/lib/network'
import { LocalWallet } from '@unisat/wallet-sdk/lib/wallet'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import { PsbtInput } from 'bip174/src/lib/interfaces'
import config from 'config'
const varuint = require('varuint-bitcoin')

const network = config.get<Network>('bitcoin.network')
const networkType = config.get<NetworkType>('bitcoin.networkType')
const wif = config.get<string>('wallet.wif')

export class SignatureService {
  public static async stake(
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const signer = this.getSigner()
    const wallet = this.getWallet(signer)
    const psbt = Psbt.fromHex(psbtHex)
    await wallet.signPsbt(psbt, {
      toSignInputs: [
        { index: 0, publicKey: wallet.pubkey },
        { index: 1, publicKey: wallet.pubkey },
      ],
    })

    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction(true)

    return {
      txSize: tx.virtualSize(),
      psbtHex: psbt.toHex(),
      txHex: tx.toHex(),
    }
  }

  public static async claim(
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const signer = this.getSigner()
    const wallet = this.getWallet(signer)
    const psbt = Psbt.fromHex(psbtHex)
    let toSignInputs: Array<{ index: number; publicKey: string; }> = []
    psbt.txInputs.map(((input, index) => toSignInputs = toSignInputs.concat({ index, publicKey: wallet.pubkey })))
    await wallet.signPsbt(psbt, {
      toSignInputs,
    })

    for (let index = 0; index < psbt.txInputs.length; index++) {
      const txInput = psbt.txInputs[index];
      // Wallet input
      if (txInput.sequence === 0) {
        psbt.finalizeInput(index)
      }
      // Script input
      else {
        psbt.finalizeInput(index, this.getFinalScripts)
      }
    }
    
    const tx = psbt.extractTransaction(true)

    return {
      txSize: tx.virtualSize(),
      psbtHex: psbt.toHex(),
      txHex: tx.toHex(),
    }
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

  private static getFinalScripts(
    inputIndex: number,
    input: PsbtInput,
    script: Buffer,
    isSegwit: boolean,
    isP2SH: boolean,
    isP2WSH: boolean,
  ): {
    finalScriptSig: Buffer | undefined
    finalScriptWitness: Buffer | undefined
  } {
    let payment: bitcoin.Payment = {
      network,
      input: bitcoin.script.compile([input.partialSig![0].signature]),
      output: script,
    }
    if (isP2WSH && isSegwit)
      payment = bitcoin.payments.p2wsh({
        network,
        redeem: payment,
      })
    if (isP2SH)
      payment = bitcoin.payments.p2sh({
        network,
        redeem: payment,
      })

    function witnessStackToScriptWitness(witness: Buffer[]): Buffer {
      let buffer = Buffer.allocUnsafe(0)

      function writeSlice(slice: Buffer): void {
        buffer = Buffer.concat([buffer, Buffer.from(slice)])
      }

      function writeVarInt(i: number): void {
        const currentLen = buffer.length
        const varintLen = varuint.encodingLength(i)

        buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)])
        varuint.encode(i, buffer, currentLen)
      }

      function writeVarSlice(slice: Buffer): void {
        writeVarInt(slice.length)
        writeSlice(slice)
      }

      function writeVector(vector: Buffer[]): void {
        writeVarInt(vector.length)
        vector.forEach(writeVarSlice)
      }

      writeVector(witness)

      return buffer
    }

    return {
      finalScriptSig: payment.input,
      finalScriptWitness:
        payment.witness && payment.witness.length > 0
          ? witnessStackToScriptWitness(payment.witness)
          : undefined,
    }
  }
}
