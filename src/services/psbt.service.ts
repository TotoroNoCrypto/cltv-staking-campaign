import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core'
import { toXOnly } from '@unisat/wallet-sdk/lib/utils'
import { Network } from 'bitcoinjs-lib/src/networks'
import { Payment } from 'bitcoinjs-lib/src/payments'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import { PsbtInput } from 'bip174/src/lib/interfaces'
import { Runestone, Edict, RuneId, some, none } from 'runelib'
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
const utxoSize = config.get<number>('utxoSize')
const runeUtxoSize = config.get<number>('runeUtxoSize')
const stakeSize = config.get<number>('stakeSize')
const stakeBTCSize = config.get<number>('stakeBTCSize')

export class PsbtService {
  public static async stake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    campaignId: number,
    amt: number,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = stakeSize * fastestFee
    const psbt = await this.getStakePsbt(
      walletAddress,
      pubkeyHex,
      inscriptionTxid,
      inscriptionVout,
      campaignId,
      amt,
      networkFee,
    )

    return psbt.toHex()
  }

  public static async stakeRune(
    walletAddress: string,
    pubkeyHex: string,
    txid: string,
    vout: number,
    campaignId: number,
    runeId: string,
    amt: number,
  ): Promise<string> {
    const psbt = await this.getStakeRunePsbt(
      walletAddress,
      pubkeyHex,
      txid,
      vout,
      campaignId,
      runeId,
      amt,
    )

    return psbt.toHex()
  }

  public static async stakeBTC(
    walletAddress: string,
    pubkeyHex: string,
    txid: string,
    vout: number,
  ): Promise<string> {
    const fastestFee = await getFastestFee()
    const networkFee = stakeBTCSize * fastestFee
    const psbt = await this.getStakeBTCPsbt(
      walletAddress,
      pubkeyHex,
      txid,
      vout,
      networkFee,
    )

    return psbt.toHex()
  }

  public static async finalizeStake(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxId: string,
    inscriptionVout: number,
    campaignId: number,
    quantity: number,
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const psbt = Psbt.fromHex(psbtHex)
    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction(true)

    const campaign = await CampaignRepository.getCampaign(campaignId)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    if (campaign!.name === 'SATS') {
      quantity /= 1000000
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
      null,
      Math.round(quantity),
    )

    return {
      txSize: tx.virtualSize(),
      psbtHex: psbt.toHex(),
      txHex: tx.toHex(),
    }
  }

  public static async finalizeStakeRune(
    walletAddress: string,
    pubkeyHex: string,
    runeTxId: string,
    runeVout: number,
    runeId: string,
    campaignId: number,
    quantity: number,
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string }> {
    const psbt = Psbt.fromHex(psbtHex)
    psbt.finalizeAllInputs()
    const tx = psbt.extractTransaction(true)

    const campaign = await CampaignRepository.getCampaign(campaignId)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    if (campaign!.name === 'DOG•GO•TO•THE•MOON') {
      quantity /= 100000
    } else if (campaign!.name === 'DOTSWAP•DOTSWAP') {
      quantity /= 100
    }

    const pubkey = this.getPubkey(pubkeyHex)
    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)
    const scriptAddress = cltvPayment.address!
    await StakingRepository.createStaking(
      campaign.id,
      walletAddress,
      scriptAddress,
      runeTxId,
      runeVout,
      runeId,
      Math.round(quantity),
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
    campaignId: number,
  ): Promise<string> {
    const psbt = await this.getClaimPsbt(walletAddress, pubkeyHex, campaignId)

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
    fromBlockheight: number,
    toBlockheight: number,
  ): Promise<string> {
    const psbt = await this.getRestakePsbt(
      walletAddress,
      pubkeyHex,
      fromBlockheight,
      toBlockheight,
    )

    return psbt.toHex()
  }

  public static async finalizeRestake(
    walletAddress: string,
    pubkeyHex: string,
    fromBlockheight: number,
    toBlockheight: number,
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

    const pubkey = this.getPubkey(pubkeyHex)

    const campaignFromCltvPayment = this.getCltvPayment(pubkey, fromBlockheight)

    const campaignToCltvPayment = this.getCltvPayment(pubkey, toBlockheight)

    const scriptAddress = campaignToCltvPayment.address!

    const fcdpInscriptions = await UnisatService.getTransferableInscriptions(
      campaignFromCltvPayment.address!,
      'FCDP',
    )

    for (let index = 0; index < fcdpInscriptions.length; index++) {
      const inscription = fcdpInscriptions[index]
      await StakingRepository.createStaking(
        5,
        walletAddress,
        scriptAddress,
        inscription.txid,
        inscription.vout,
        null,
        inscription.amt,
      )
    }

    const oshiInscriptions = await UnisatService.getTransferableInscriptions(
      campaignFromCltvPayment.address!,
      'OSHI',
    )

    for (let index = 0; index < oshiInscriptions.length; index++) {
      const inscription = oshiInscriptions[index]
      await StakingRepository.createStaking(
        6,
        walletAddress,
        scriptAddress,
        inscription.txid,
        inscription.vout,
        null,
        inscription.amt,
      )
    }

    return {
      txSize: tx.virtualSize(),
      psbtHex: psbt.toHex(),
      txHex: tx.toHex(),
    }
  }

  public static async generateAirdrop(
    walletAddress: string,
    pubkeyHex: string,
  ): Promise<string> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)

    const btcUtxo = await UnisatService.findBtcUtxo(walletAddress, 100000)
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    let totalSatoshi: number = 0
    const airdrops: Array<{
      txid: string
      vout: number
      address: string
      satoshi: number
    }> = [{ address: '', txid: '', vout: 0, satoshi: 546 }]
    const fee: number = 10000

    const psbt = new bitcoin.Psbt({ network })

    for (let index = 0; index < airdrops.length; index++) {
      const airdrop = airdrops[index]
      psbt
        .addInput({
          hash: airdrop.txid,
          index: airdrop.vout,
          sequence: 0,
          witnessUtxo: {
            value: airdrop.satoshi,
            script: stakerPayment.output!,
          },
          tapInternalKey: internalPubkey,
        })
        .addOutput({
          value: airdrop.satoshi,
          address: airdrop.address,
        })
      totalSatoshi += airdrop.satoshi
    }

    psbt
      .addInput({
        hash: btcUtxo.txid,
        index: btcUtxo.vout,
        sequence: 0,
        witnessUtxo: {
          value: btcUtxo.satoshi,
          script: stakerPayment.output!,
        },
        tapInternalKey: internalPubkey,
      })
      .addOutput({
        value: btcUtxo.satoshi - totalSatoshi - fee,
        address: walletAddress,
      })

    return psbt.toHex()
  }

  private static async getStakePsbt(
    walletAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
    campaignId: number,
    amt: number,
    networkFee: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaign(campaignId)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    const market = await UnisatService.findBRC20Market(campaign.name)
    let serviceFee =
      market!.satoshi !== undefined
        ? Math.max(
            serviceFeeFix,
            Math.round(amt * market!.satoshi! * (serviceFeeVariable / 100)),
          )
        : serviceFeeFix
    if (serviceFee >= 5 * serviceFeeFix) {
      serviceFee = 5 * serviceFeeFix
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

  private static async getStakeRunePsbt(
    walletAddress: string,
    pubkeyHex: string,
    txid: string,
    vout: number,
    campaignId: number,
    runeId: string,
    amt: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaign(campaignId)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    const market = await UnisatService.findRuneMarket(campaign.name)
    let serviceFee = Math.max(
      serviceFeeFix,
      amt * market!.satoshi! * (serviceFeeVariable / 100),
    )
    if (serviceFee >= 5 * serviceFeeFix) {
      serviceFee = 5 * serviceFeeFix
    }

    const networkFee = await this.getNetworkFee(6)
    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      networkFee + serviceFee,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const runeUtxo = await UnisatService.findRuneUtxo(
      walletAddress,
      txid,
      vout,
      runeId,
    )
    if (runeUtxo === undefined) {
      throw new Error('Rune UTXO not found')
    }

    const splitRuneId = runeId.split(':')
    const myRuneId = new RuneId(Number(splitRuneId[0]), Number(splitRuneId[1]))
    const amount = BigInt(amt)
    const outputIndex = 0

    const edict = new Edict(myRuneId, amount, outputIndex)
    const runestone = new Runestone([edict], none(), none(), none())

    const encodedRunestone = runestone.encipher()

    const psbt = new bitcoin.Psbt({ network })
      .addInput({
        hash: runeUtxo.txid,
        index: runeUtxo.vout,
        sequence: 0,
        witnessUtxo: {
          value: runeUtxo.satoshi,
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
        value: runeUtxo.satoshi,
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
      .addOutput({
        script: encodedRunestone,
        value: 0,
      })

    return psbt
  }

  private static async getStakeBTCPsbt(
    walletAddress: string,
    pubkeyHex: string,
    txid: string,
    vout: number,
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

    const matchingBtcUtxo = await UnisatService.findMatchingBtcUtxo(
      walletAddress,
      txid,
      vout,
    )

    let serviceFee = Math.max(
      serviceFeeFix,
      matchingBtcUtxo!.satoshi * (serviceFeeVariable / 100),
    )
    if (serviceFee >= 5 * serviceFeeFix) {
      serviceFee = 5 * serviceFeeFix
    }

    const btcUtxo = await UnisatService.findBtcUtxoWithExclusion(
      walletAddress,
      networkFee + serviceFee,
      matchingBtcUtxo!.txid,
      matchingBtcUtxo!.vout,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const psbt = new bitcoin.Psbt({ network })
      .addInput({
        hash: matchingBtcUtxo!.txid,
        index: matchingBtcUtxo!.vout,
        sequence: 0,
        witnessUtxo: {
          value: matchingBtcUtxo!.satoshi,
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
        value: matchingBtcUtxo!.satoshi,
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

  private static async getClaimPsbt(
    walletAddress: string,
    pubkeyHex: string,
    campaignId: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)
    const campaign = await CampaignRepository.getCampaign(campaignId)
    if (campaign === null) {
      throw new Error('Campaign not found')
    }

    const total = await StakingRepository.totalOnStaking(
      campaign.id,
      walletAddress,
    )
    if (total === undefined) {
      throw new Error('Staking not found')
    }

    const blockheight = campaign.blockEnd
    const cltvPayment = this.getCltvPayment(pubkey, blockheight)

    let serviceFee = 0

    switch (campaign!.type) {
      case 'BRC20':
        const brc20Market = await UnisatService.findBRC20Market(campaign.name)
        serviceFee = Math.max(
          serviceFeeFix,
          total * brc20Market!.satoshi! * (serviceFeeVariable / 100),
        )

        break

      case 'Rune':
        const runeMarket = await UnisatService.findRuneMarket(campaign.name)
        serviceFee = Math.max(
          serviceFeeFix,
          total * runeMarket!.satoshi! * (serviceFeeVariable / 100),
        )

        break

      default:
        serviceFee = Math.max(serviceFeeFix, total * (serviceFeeVariable / 100))

        break
    }

    if (serviceFee >= 5 * serviceFeeFix) {
      serviceFee = 5 * serviceFeeFix
    }

    let scriptInscriptionUtxos = await UnisatService.getInscriptionUtxos(
      cltvPayment.address!,
    )
    let scriptUncommonGoodsUtxos = await UnisatService.getRuneUtxos(
      cltvPayment.address!,
      encodeURI('1:0'),
    )
    let scriptDogGoToTheMoonUtxos = await UnisatService.getRuneUtxos(
      cltvPayment.address!,
      encodeURI('840015:535'),
    )
    let scriptDotSwapDotSwapUtxos = await UnisatService.getRuneUtxos(
      cltvPayment.address!,
      encodeURI('840456:5478'),
    )
    const scriptRuneUtxos = scriptUncommonGoodsUtxos
      .concat(scriptDogGoToTheMoonUtxos)
      .concat(scriptDotSwapDotSwapUtxos)
    const scriptBtcUtxos = await UnisatService.getBtcUtxos(cltvPayment.address!)
    const scriptUtxos = scriptInscriptionUtxos
      .concat(scriptRuneUtxos)
      .concat(scriptBtcUtxos)

    if (scriptUtxos.length === 0) {
      throw new Error('No UTXO found on script')
    }

    const networkFee = await this.getNetworkFee(
      scriptUtxos.length + 3,
      scriptUtxos.length,
    )

    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      networkFee + serviceFee,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
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
        value: utxo.satoshi,
        address: stakerPayment.address!,
      })
    }

    if (campaignId > 2) {
      psbt.addOutput({
        value: serviceFee,
        address: teamAddress,
      })

      psbt.addOutput({
        value: btcUtxo.satoshi - serviceFee - networkFee,
        address: stakerPayment.address!,
      })
    } else {
      psbt.addOutput({
        value: btcUtxo.satoshi - networkFee,
        address: stakerPayment.address!,
      })
    }

    return psbt
  }

  private static async getRestakePsbt(
    walletAddress: string,
    pubkeyHex: string,
    fromBlockheight: number,
    toBlockheight: number,
  ): Promise<Psbt> {
    const pubkey = this.getPubkey(pubkeyHex)
    const internalPubkey = this.getInternalPubkey(pubkey)
    const stakerPayment = this.getStakerPayment(internalPubkey)

    const campaignFromCltvPayment = this.getCltvPayment(pubkey, fromBlockheight)
    const campaignToCltvPayment = this.getCltvPayment(pubkey, toBlockheight)

    const fcdpInscriptions = await UnisatService.getTransferableInscriptions(
      campaignFromCltvPayment.address!,
      'FCDP',
    )
    let fcdpAmount = 0
    for (let index = 0; index < fcdpInscriptions.length; index++) {
      const fcdpInscription = fcdpInscriptions[index]
      fcdpAmount += fcdpInscription.amt
    }
    const fcdpMarket = await UnisatService.findBRC20Market('FCDP')
    let fcdpServiceFee = Math.max(
      serviceFeeFix,
      fcdpAmount * fcdpMarket!.satoshi! * (serviceFeeVariable / 100),
    )
    if (fcdpServiceFee >= 5 * serviceFeeFix) {
      fcdpServiceFee = 5 * serviceFeeFix
    }

    const oshiInscriptions = await UnisatService.getTransferableInscriptions(
      campaignFromCltvPayment.address!,
      'OSHI',
    )
    let oshiAmount = 0
    for (let index = 0; index < oshiInscriptions.length; index++) {
      const oshiInscription = oshiInscriptions[index]
      oshiAmount += oshiInscription.amt
    }
    const oshiMarket = await UnisatService.findBRC20Market('OSHI')
    let oshiServiceFee = Math.max(
      serviceFeeFix,
      oshiAmount * oshiMarket!.satoshi! * (serviceFeeVariable / 100),
    )
    if (oshiServiceFee >= 5 * serviceFeeFix) {
      oshiServiceFee = 5 * serviceFeeFix
    }

    const serviceFee = fcdpServiceFee + oshiServiceFee

    let scriptInscriptionUtxos = await UnisatService.getInscriptionUtxos(
      campaignFromCltvPayment.address!,
    )
    const scriptBtcUtxos = await UnisatService.getBtcUtxos(
      campaignFromCltvPayment.address!,
    )
    const scriptUtxos = scriptInscriptionUtxos.concat(scriptBtcUtxos)

    if (scriptUtxos.length === 0) {
      throw new Error('No UTXO found on script')
    }

    const networkFee = await this.getNetworkFee(
      scriptUtxos.length + 3,
      scriptUtxos.length,
    )

    const btcUtxo = await UnisatService.findBtcUtxo(
      walletAddress,
      networkFee + serviceFee,
    )
    if (btcUtxo === undefined) {
      throw new Error('BTC UTXO not found')
    }

    const lockTime = this.getLocktime(toBlockheight)

    const psbt = new Psbt({ network }).setLocktime(lockTime)

    for (let index = 0; index < scriptUtxos.length; index++) {
      const utxo = scriptUtxos[index]
      const txHex = await getTxHex(utxo.txid)
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: 0xfffffffe,
        nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        redeemScript: campaignFromCltvPayment.redeem!.output!,
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
        value: utxo.satoshi,
        address: campaignToCltvPayment.address!,
      })
    }

    psbt.addOutput({
      value: serviceFee,
      address: teamAddress,
    })

    psbt.addOutput({
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

  private static async getNetworkFee(
    nbUtxo: number,
    nbRuneUtxo: number = 0,
  ): Promise<number> {
    const fastestFee = await getFastestFee()
    const networkFee =
      nbUtxo * utxoSize * fastestFee + nbRuneUtxo * runeUtxoSize * fastestFee

    return networkFee
  }
}
