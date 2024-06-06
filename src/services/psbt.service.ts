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
const serviceFeeFix = config.get<number>('cltv.serviceFeeFix')
const serviceFeeVariable = config.get<number>('cltv.serviceFeeVariable')
const stakeSize = config.get<number>('stakeSize')
const stakeBTCSize = config.get<number>('stakeBTCSize')
const claimSize = config.get<number>('claimSize')

export class PsbtService {
  public static async stake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    ticker: string,
    amt: number
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = stakeSize * fastestFee
    const psbt = await this.getStakePsbt(
      walletAddress,
      pubkeyHex,
      inscriptionTxid,
      inscriptionVout,
      ticker,
      amt,
      networkFee,
    )

    return psbt.toHex()
  }

  public static async stakeBTC(
    walletAddress: string,
    pubkeyHex: string,
    amt: number
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = stakeBTCSize * fastestFee
    const psbt = await this.getStakeBTCPsbt(
      walletAddress,
      pubkeyHex,
      amt,
      networkFee,
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

  public static async finalizeStakeBTC(
    walletAddress: string,
    pubkeyHex: string,
    quantity: number,
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const psbt = Psbt.fromHex(psbtHex)
    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction(true)

    const campaign = await CampaignRepository.getCampaignByName('BTC')
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
      null,
      null,
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
    amt: number,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = claimSize * fastestFee
    const psbt = await this.getClaimPsbt(walletAddress, pubkeyHex, ticker, amt, networkFee)

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

  public static async restake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    tickerIn: string,
    tickerOut: string,
    amt: number
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = stakeSize * fastestFee
    const psbt = await this.getRestakePsbt(
      walletAddress,
      pubkeyHex,
      inscriptionTxid,
      inscriptionVout,
      tickerIn,
      tickerOut,
      amt,
      networkFee,
    )

    return psbt.toHex()
  }

  public static async finalizeRestake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxId: string,
    inscriptionVout: number,
    ticker: string,
    quantity: number,
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

  private static async getStakePsbt(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    ticker: string,
    amt: number,
    networkFee: number,
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

    const quote = await UnisatService.getQuote(
      teamAddress,
      ticker,
      'sats',
      '1',
      'exactIn',
    )
    let serviceFee = Math.max(serviceFeeFix, amt * quote * (serviceFeeVariable / 100) * (100000000 / 70000))
    if (serviceFee >= 10 * serviceFeeFix) {
      serviceFee = 10 * serviceFeeFix
    }

    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      networkFee + serviceFee,
    )
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
        value: btcUtxo.satoshi - serviceFee - networkFee,
        address: stakerPayment.address!,
      })

    return psbt
  }

  private static async getStakeBTCPsbt(
    walletAddress: string,
    pubkeyHex: string,
    amt: number,
    networkFee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaignByName('BTC')
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    let serviceFee = Math.max(serviceFeeFix, amt * (serviceFeeVariable / 100))
    if (serviceFee >= 10 * serviceFeeFix) {
      serviceFee = 10 * serviceFeeFix
    }

    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      amt + networkFee + serviceFee,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const psbt = new bitcoin.Psbt({ network })
      .addInput({
        hash: btcUtxo.txid,
        index: btcUtxo.vout,
        sequence: 0,
        witnessUtxo: { value: btcUtxo.satoshi, script: stakerPayment.output! },
        tapInternalKey: internalPubkey,
      })
      .addOutput({
        value: amt,
        address: cltvPayment.address!,
      })
      // .addOutput({
      //   value: serviceFee,
      //   address: teamAddress,
      // })
      // .addOutput({
      //   value: btcUtxo.satoshi - amt - serviceFee - networkFee,
      //   address: stakerPayment.address!,
      // })
      .addOutput({
        value: btcUtxo.satoshi - amt - networkFee,
        address: stakerPayment.address!,
      })

    return psbt
  }

  private static async getClaimPsbt(
    walletAddress: string,
    pubkeyHex: string,
    ticker: string,
    amt: number,
    networkFee: number,
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

    let serviceFee = 0

    if (ticker === 'BTC') {
      serviceFee = Math.max(serviceFeeFix, amt * (serviceFeeVariable / 100))
    } else {
      const quote = await UnisatService.getQuote(
        teamAddress,
        ticker,
        'sats',
        '1',
        'exactIn',
      )
      serviceFee = Math.max(serviceFeeFix, amt * quote * (serviceFeeVariable / 100) * (100000000 / 70000))
    }
    
    if (serviceFee >= 10 * serviceFeeFix) {
      serviceFee = 10 * serviceFeeFix
    }

    const btcUtxo = await UnisatService.findBtcUtxo(walletAddress, networkFee + serviceFee)
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
      value: serviceFee,
      address: teamAddress,
    })

    psbt.addOutput({
      script: stakerPayment.output!,
      value: btcUtxo.satoshi - serviceFee - networkFee,
    })

    return psbt
  }

  private static async getRestakePsbt(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    tickerOut: string,
    tickerIn: string,
    amt: number,
    networkFee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaignOut = await CampaignRepository.getCampaignByName(tickerOut)
    const campaignIn = await CampaignRepository.getCampaignByName(tickerIn)
    if (campaignOut === null || campaignIn === null) {
      throw new Error('Campaign not found')
    }

    const campaignOutBlockheight = campaignOut.blockEnd
    const campaignOutCltvPayment = this.getCltvPayment(pubkey, campaignOutBlockheight)

    const campaignInBlockheight = campaignIn.blockEnd
    const campaignInCltvPayment = this.getCltvPayment(pubkey, campaignInBlockheight)

    const quote = await UnisatService.getQuote(
      teamAddress,
      tickerOut,
      'sats',
      '1',
      'exactIn',
    )
    let serviceFee = Math.max(serviceFeeFix, amt * quote * (serviceFeeVariable / 100) * (100000000 / 70000))
    if (serviceFee >= 10 * serviceFeeFix) {
      serviceFee = 10 * serviceFeeFix
    }

    console.log(`serviceFee: ${serviceFee}`)

    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      networkFee + serviceFee,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const inscriptionUtxo = await UnisatService.findInscriptionUtxo(
      campaignOutCltvPayment.address!,
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
          script: campaignOutCltvPayment.output!,
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
        address: campaignInCltvPayment.address!,
      })
      .addOutput({
        value: serviceFee,
        address: teamAddress,
      })
      .addOutput({
        value: btcUtxo.satoshi - serviceFee - networkFee,
        address: stakerPayment.address!,
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
    console.log(`payment.address: ${payment.address!}`)
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
