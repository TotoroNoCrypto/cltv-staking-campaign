import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { toXOnly } from '@unisat/wallet-sdk/lib/utils'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Payment } from 'bitcoinjs-lib/src/payments'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import { PsbtInput } from 'bip174/src/lib/interfaces'
import config from 'config'
const bip65 = require('bip65')
const varuint = require('varuint-bitcoin')

import { getFastestFee, getTxHex } from '../utils'
import { CampaignRepository } from '../repositories/campaign.repository'
import { StakingRepository } from '../repositories/staking.repository'
import { UnisatService } from '../services/unisat.service'

const network = config.get<Network>('bitcoin.network')
const teamAddress = config.get<string>('cltv.teamAddress')
const serviceFee = config.get<number>('cltv.serviceFee')
const stakeSize = config.get<number>('stakeSize')
const claimSize = config.get<number>('claimSize')

export class PsbtService {
  public static async stake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    ticker: string,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const fee = stakeSize * fastestFee
    const psbt = await this.getStakePsbt(
      walletAddress,
      pubkeyHex,
      inscriptionTxid,
      inscriptionVout,
      ticker,
      fee,
    )

    return psbt.toHex()
  }

  public static async finalizeStake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxId: string,
    inscriptionVout: number,
    ticker: string,
    quantity: number,
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const psbt = Psbt.fromHex(psbtHex)
    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction(true)

    const campaign = await CampaignRepository.getCampaignByName(ticker)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const pubkey = this.getPubkey(pubkeyHex)
    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)
    const scriptAddress = cltvPayment.address!
    await StakingRepository.createStaking(
      campaign.id,
      walletAddress,
      scriptAddress,
      inscriptionTxId,
      inscriptionVout,
      quantity,
    )

    return {
      txSize: tx.virtualSize(),
      psbtHex: psbt.toHex(),
      txHex: tx.toHex(),
    }
  }

  public static async claim(
    walletAddress: string,
    pubkeyHex: string,
    ticker: string,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const fee = claimSize * fastestFee
    const psbt = await this.getClaimPsbt(
      walletAddress,
      pubkeyHex,
      ticker,
      fee,
    )

    return psbt.toHex()
  }

  public static async finalizeClaim(
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const psbt = Psbt.fromHex(psbtHex)

    for (let index = 0; index < psbt.txInputs.length; index++) {
      const txInput = psbt.txInputs[index]
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

  private static async getStakePsbt(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    ticker: string,
    fee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaignByName(ticker)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    const btcUtxo = await UnisatService.findBtcUtxo(walletAddress, fee + serviceFee)
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const inscriptionUtxo = await UnisatService.findInscriptionUtxo(
      walletAddress,
      inscriptionTxid,
      inscriptionVout,
    )
    if (inscriptionUtxo === undefined) {
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
        value: serviceFee,
        address: teamAddress,
      })
      .addOutput({
        value: btcUtxo.satoshi - serviceFee - fee,
        address: stakerPayment.address!,
      })

    return psbt
  }

  private static async getClaimPsbt(
    walletAddress: string,
    pubkeyHex: string,
    ticker: string,
    fee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaignByName(ticker)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    const btcUtxo = await UnisatService.findBtcUtxo(walletAddress, fee)
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    let scriptInscriptionUtxos = await UnisatService.getInscriptionUtxos(
      cltvPayment.address!,
    )
    const scriptBtcUtxos = await UnisatService.getBtcUtxos(cltvPayment.address!)
    const scriptUtxos = scriptInscriptionUtxos.concat(scriptBtcUtxos)

    if (scriptUtxos.length === 0) {
      throw new Error('No UTXO found on script')
    }

    const lockTime = this.getLocktime(blockheight)

    const psbt = new Psbt({ network }).setLocktime(lockTime)

    for (let index = 0; index < scriptUtxos.length; index++) {
      const utxo = scriptUtxos[index]
      const txHex = await getTxHex(utxo.txid)
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: 0xfffffffe,
        nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        redeemScript: cltvPayment.redeem!.output!,
      })
    }

    psbt.addInput({
      hash: btcUtxo.txid,
      index: btcUtxo.vout,
      sequence: 0,
      witnessUtxo: { value: btcUtxo.satoshi, script: stakerPayment.output! },
      tapInternalKey: internalPubkey,
    })

    for (let index = 0; index < scriptUtxos.length; index++) {
      const utxo = scriptUtxos[index]
      psbt.addOutput({
        script: stakerPayment.output!,
        value: utxo.satoshi,
      })
    }

    psbt.addOutput({
      script: stakerPayment.output!,
      value: btcUtxo.satoshi - fee,
    })

    return psbt
  }

  private static getStakerPayment(internalPubkey: Buffer): Payment {
    const stakerPayment = bitcoin.payments.p2tr({
      internalPubkey,
      network,
    })

    return stakerPayment
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

  private static getInternalPubkey(pubkey: Buffer): Buffer {
    const internalPubkey = toXOnly(pubkey)

    return internalPubkey
  }

  private static getPubkey(pubkeyHex: string): Buffer {
    const pubkey = Buffer.from(pubkeyHex, 'hex')

    return pubkey
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
