import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { toXOnly } from '@unisat/wallet-sdk/lib/utils'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Payment } from 'bitcoinjs-lib/src/payments'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import config from 'config'
const bip65 = require('bip65')

import { UnisatConnector } from '../unisatConnector'
import { getFastestFee } from '../utils'

const network = config.get<Network>('bitcoin.network')
const unisatApiToken = config.get<string>('unisat.apiToken')
const unisatApiUrl = config.get<string>('unisat.apiUrl')
const claimInscriptionUtxoTxid = Buffer.from(
  config.get<string>('claimInscriptionUtxo.txid'),
  'hex',
)
const claimInscriptionUtxoTxHex = config.get<string>(
  'claimInscriptionUtxo.txhex',
)
const claimInscriptionUtxoVout = config.get<number>('claimInscriptionUtxo.vout')
const claimInscriptionSatoshi = config.get<number>(
  'claimInscriptionUtxo.satoshi',
)
const claimTtxid = Buffer.from(config.get<string>('claimUtxo.txid'), 'hex')
const claimVout = config.get<number>('claimUtxo.vout')
const claimSatoshi = config.get<number>('claimUtxo.satoshi')
const blockheight = config.get<number>('blockheight')
const stakeSize = config.get<number>('stakeSize')
const claimSize = config.get<number>('claimSize')

export class PsbtService {
  private static unisatConnector: UnisatConnector = new UnisatConnector(
    unisatApiUrl,
    unisatApiToken,
  )

  public static async stake(
    taprootAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const fee = stakeSize * fastestFee
    const psbt = await this.getPsbt(
      taprootAddress,
      pubkeyHex,
      inscriptionTxid,
      inscriptionVout,
      fee,
    )

    return psbt.toHex()
  }

  public static async claim(
    taprootAddress: string,
    pubkeyHex: string,
  ): Promise<string> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const cltvPayment = this.getCltvPayment(pubkey)

    const fastestFee = await getFastestFee()
    const claimFee = claimSize * fastestFee

    const lockTime = this.getLocktime()

    const psbt = new Psbt({ network })
      .setLocktime(lockTime)
      .addInput({
        hash: claimInscriptionUtxoTxid,
        index: claimInscriptionUtxoVout,
        sequence: 0xfffffffe,
        nonWitnessUtxo: Buffer.from(claimInscriptionUtxoTxHex, 'hex'),
        redeemScript: cltvPayment.redeem!.output!,
      })
      .addInput({
        hash: claimTtxid,
        index: claimVout,
        sequence: 0,
        witnessUtxo: { value: claimSatoshi, script: stakerPayment.output! },
        tapInternalKey: internalPubkey,
      })
      .addOutput({
        script: stakerPayment.output!,
        value: claimInscriptionSatoshi,
      })
      .addOutput({
        script: stakerPayment.output!,
        value: claimSatoshi - claimFee,
      })

    return psbt.toBase64()
  }

  private static async getPsbt(
    taprootAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    fee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const cltvPayment = this.getCltvPayment(pubkey)

    const btcUtxo = await this.findBtcUtxo(taprootAddress, fee)
    if (btcUtxo == undefined) {
      throw new Error('BTC UTXO not found')
    }

    const inscriptionUtxo = await this.findInscriptionUtxo(
      taprootAddress,
      inscriptionTxid,
      inscriptionVout,
    )
    if (inscriptionUtxo == undefined) {
      throw new Error('Inscription UTXO not found')
    }

    const psbt = new bitcoin.Psbt({ network })
      .addInput({
        hash: inscriptionTxid,
        index: inscriptionVout,
        sequence: 0,
        witnessUtxo: {
          value: inscriptionUtxo.satoshi,
          script: stakerPayment.output!,
        },
        tapInternalKey: internalPubkey,
      })
      .addInput({
        hash: btcUtxo.txid,
        index: btcUtxo.vout,
        sequence: 0,
        witnessUtxo: { value: btcUtxo.satoshi, script: stakerPayment.output! },
        tapInternalKey: internalPubkey,
      })
      .addOutput({
        value: inscriptionUtxo.satoshi,
        address: cltvPayment.address!,
      })
      .addOutput({
        value: btcUtxo.satoshi - fee,
        address: stakerPayment.address!,
      })

    return psbt
  }

  private static async findBtcUtxo(
    taprootAddress: string,
    stakeFee: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 16

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        taprootAddress,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      utxo = utxos.find((u: { satoshi: number }) => u.satoshi >= stakeFee)
      cursor++
    } while (utxos.size > 0 && utxo === undefined)

    return {
      txid: 'df1309581c0c3274ef446e7b48483e0051c160a332b0f4337d4718666e9e3463',
      vout: 1,
      satoshi: 7634,
    }
    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined
  }

  private static async findInscriptionUtxo(
    taprootAddress: string,
    inscriptionTxid: string,
    inscriptionVout: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 16

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        taprootAddress,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      utxo = utxos.find(
        (u: { txid: string; vout: number }) =>
          u.txid === inscriptionTxid && u.vout === inscriptionVout,
      )
      cursor++
    } while (utxos.size > 0 && utxo === undefined)

    return {
      txid: 'df950d1d931065a94a2f6e51fe9abdd15042a896d73dcd8f6eb757566e4ebf73',
      vout: 0,
      satoshi: 546,
    }
    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined
  }

  private static getStakerPayment(internalPubkey: Buffer): Payment {
    const stakerPayment = bitcoin.payments.p2tr({
      internalPubkey,
      network,
    })

    return stakerPayment
  }

  private static getCltvPayment(pubkey: Buffer): Payment {
    const redeemScript = this.getCltvRedeemScript(pubkey)
    const cltvPayment = bitcoin.payments.p2sh({
      redeem: { output: redeemScript },
      network,
    })

    return cltvPayment
  }

  private static getCltvRedeemScript(pubkey: Buffer): Buffer {
    const lockTime = this.getLocktime()
    const redeemScript = bitcoin.script.compile([
      bitcoin.script.number.encode(lockTime),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      pubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    ])

    return redeemScript
  }

  private static getLocktime(): number {
    const lockTime = bip65.encode({ blocks: blockheight })

    return lockTime
  }

  private static getInternalPubkey(pubkey: Buffer): Buffer {
    const internalPubkey = toXOnly(pubkey)

    return internalPubkey
  }

  private static getPubkey(pubkeyHex: string): Buffer {
    const pubkey = Buffer.from(pubkeyHex, 'hex')

    return pubkey
  }
}
