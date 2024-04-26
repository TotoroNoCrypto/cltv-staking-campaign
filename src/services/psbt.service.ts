import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { toXOnly } from '@unisat/wallet-sdk/lib/utils'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Payment } from 'bitcoinjs-lib/src/payments'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import config from 'config'
const bip65 = require('bip65')

import { UnisatConnector } from '../unisatConnector'
import { getFastestFee, getTxHex } from '../utils'

const network = config.get<Network>('bitcoin.network')
const unisatApiToken = config.get<string>('unisat.apiToken')
const unisatApiUrl = config.get<string>('unisat.apiUrl')
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
    const psbt = await this.getStakePsbt(
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
    const fastestFee = await getFastestFee()
    const fee = claimSize * fastestFee
    const psbt = await this.getClaimPsbt(
      taprootAddress,
      pubkeyHex,
      fee
    )

    return psbt.toHex()
  }

  private static async getStakePsbt(
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

  private static async getClaimPsbt(
    taprootAddress: string,
    pubkeyHex: string,
    fee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const cltvPayment = this.getCltvPayment(pubkey)

    const btcUtxo = await this.findBtcUtxo(taprootAddress, fee)
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    let scriptInscriptionUtxos = await this.getInscriptionUtxos(
      stakerPayment.address!,
    )
    // Inscription UTXO should always be index 0
    if (scriptInscriptionUtxos.length > 1) {
      scriptInscriptionUtxos = [ scriptInscriptionUtxos[0] ]
    }
    const scriptBtcUtxos = await this.getBtcUtxos(
      stakerPayment.address!,
    )
    const scriptUtxos = scriptInscriptionUtxos.concat(scriptBtcUtxos)

    if (scriptUtxos.length === 0 ) {
      throw new Error('No UTXO found on script')
    }

    const lockTime = this.getLocktime()

    const psbt = new Psbt({ network })
      .setLocktime(lockTime)
    
    for (let index = 0; index < scriptUtxos.length; index++) {
      const utxo = scriptUtxos[index]
      const txHex = await getTxHex(utxo.txid)
      psbt
        .addInput({
          hash: utxo.txid,
          index: utxo.vout,
          sequence: 0xfffffffe,
          nonWitnessUtxo: Buffer.from(txHex, 'hex'),
          redeemScript: cltvPayment.redeem!.output!,
        })
    }

    psbt
      .addInput({
        hash: btcUtxo.txid,
        index: btcUtxo.vout,
        sequence: 0,
        witnessUtxo: { value: btcUtxo.satoshi, script: stakerPayment.output! },
        tapInternalKey: internalPubkey,
      });
    
    for (let index = 0; index < scriptUtxos.length; index++) {
      const utxo = scriptUtxos[index]
      psbt
        .addOutput({
          script: stakerPayment.output!,
          value: utxo.satoshi,
        })
    }
    
    psbt
      .addOutput({
        script: stakerPayment.output!,
        value: btcUtxo.satoshi - fee,
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

    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined
  }

  private static async getBtcUtxos(
    address: string,
  ): Promise<Array<{ txid: string; vout: number; satoshi: number }>> {
    let utxos: Array<{ txid: string; vout: number; satoshi: number }> = []
    let cursor = 0
    const size = 16

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        address,
        cursor * size,
        size,
      )
      if (result.data.utxo.length == 0) {
        break;
      }

      utxos = utxos.concat(result.data.utxo)
      cursor++
    } while (true)

    return utxos
  }

  private static async getInscriptionUtxos(
    address: string,
  ): Promise<Array<{ txid: string; vout: number; satoshi: number }>> {
    let utxos: Array<{ txid: string; vout: number; satoshi: number }> = []
    let cursor = 0
    const size = 16

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        address,
        cursor * size,
        size,
      )
      const filteredUtxos = result.data.utxo.filter(
        (u: { txid: string; vout: number; inscriptions: { moved: boolean; }[]; }) =>
          u.inscriptions.find(
            (i: { moved: boolean; }) =>
              !i.moved,
          ) !== undefined,
      )
      if (filteredUtxos.length == 0) {
        break;
      }

      utxos = utxos.concat(filteredUtxos)
      cursor++
    } while (true)

    return utxos
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
