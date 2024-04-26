import { bitcoin } from '@unisat/wallet-sdk/lib/bitcoin-core';
import { Network } from 'bitcoinjs-lib/src/networks';
import { Payment } from 'bitcoinjs-lib/src/payments';
import { Psbt } from 'bitcoinjs-lib/src/psbt';
import { toXOnly } from '@unisat/wallet-sdk/lib/utils';
import { UnisatConnector } from '../unisatConnector';
import { getFastestFee } from '../utils';
import config from 'config';

const bip65 = require('bip65');

const network = config.get<Network>('bitcoin.network');
const unisatApiToken = config.get<string>('unisat.apiToken');
const unisatApiUrl = config.get<string>('unisat.apiUrl');
const claimInscriptionUtxoTxid = Buffer.from(
  config.get<string>('claimInscriptionUtxo.txid'),
  'hex',
);
const claimInscriptionUtxoTxHex = config.get<string>(
  'claimInscriptionUtxo.txhex',
);
const claimInscriptionUtxoVout = config.get<number>(
  'claimInscriptionUtxo.vout',
);
const claimInscriptionSatoshi = config.get<number>(
  'claimInscriptionUtxo.satoshi',
);
const claimTtxid = Buffer.from(config.get<string>('claimUtxo.txid'), 'hex');
const claimVout = config.get<number>('claimUtxo.vout');
const claimSatoshi = config.get<number>('claimUtxo.satoshi');
const blockheight = config.get<number>('blockheight');
const stakeSize = config.get<number>('stakeSize');
const claimSize = config.get<number>('claimSize');

export class PsbtService {
  private unisatConnector: UnisatConnector;

  constructor() {
    this.unisatConnector = new UnisatConnector(unisatApiUrl, unisatApiToken);
  }

  public async stake(
    taprootAddress: string,
    pubkeyHex: string,
    inscriptionTxid: string,
    inscriptionVout: number,
  ): Promise<string> {
    const pubkey = this.getPubkey(pubkeyHex);
    const internalPubkey = this.getInternalPubkey(pubkey);
    const stakerPayment = this.getStakerPayment(internalPubkey);
    const cltvPayment = this.getCltvPayment(pubkey);

    const fastestFee = await getFastestFee();
    const stakeFee = stakeSize * fastestFee;

    const btcUtxo = await this.findBtcUtxo(taprootAddress, stakeFee);
    if (btcUtxo == undefined) {
      throw new Error('BTC UTXO not found');
    }

    const inscriptionUtxo = await this.findInscriptionUtxo(
      taprootAddress,
      inscriptionTxid,
      inscriptionVout,
    );
    if (inscriptionUtxo == undefined) {
      throw new Error('Inscription UTXO not found');
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
        value: btcUtxo.satoshi - stakeFee,
        address: stakerPayment.address!,
      });

    return psbt.toBase64();
  }

  public async claim(
    taprootAddress: string,
    pubkeyHex: string,
  ): Promise<string> {
    const pubkey = this.getPubkey(pubkeyHex);
    const internalPubkey = this.getInternalPubkey(pubkey);
    const stakerPayment = this.getStakerPayment(internalPubkey);
    const cltvPayment = this.getCltvPayment(pubkey);

    const fastestFee = await getFastestFee();
    const claimFee = claimSize * fastestFee;

    const lockTime = this.getLocktime();

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
      });

    return psbt.toBase64();
  }

  private async findBtcUtxo(
    taprootAddress: string,
    stakeFee: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = [];
    let utxo = undefined;
    let cursor = 0;
    const size = 16;

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        taprootAddress,
        cursor * size,
        size,
      );
      utxos = result.data.utxo;
      utxo = utxos.find((u: { satoshi: number }) => u.satoshi >= stakeFee);
      cursor++;
    } while (utxos.size > 0 && utxo === undefined);

    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined;
  }

  private async findInscriptionUtxo(
    taprootAddress: string,
    inscriptionTxid: string,
    inscriptionVout: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = [];
    let utxo = undefined;
    let cursor = 0;
    const size = 16;

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        taprootAddress,
        cursor * size,
        size,
      );
      utxos = result.data.utxo;
      utxo = utxos.find(
        (u: { txid: string; vout: number }) =>
          u.txid === inscriptionTxid && u.vout === inscriptionVout,
      );
      cursor++;
    } while (utxos.size > 0 && utxo === undefined);

    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined;
  }

  private getStakerPayment(internalPubkey: Buffer): Payment {
    const stakerPayment = bitcoin.payments.p2tr({
      internalPubkey,
      network,
    });

    return stakerPayment;
  }

  private getCltvPayment(pubkey: Buffer): Payment {
    const redeemScript = this.getCltvRedeemScript(pubkey);
    const cltvPayment = bitcoin.payments.p2sh({
      redeem: { output: redeemScript },
      network,
    });

    return cltvPayment;
  }

  private getCltvRedeemScript(pubkey: Buffer): Buffer {
    const lockTime = this.getLocktime();
    const redeemScript = bitcoin.script.compile([
      bitcoin.script.number.encode(lockTime),
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      pubkey,
      bitcoin.opcodes.OP_CHECKSIG,
    ]);

    return redeemScript;
  }

  private getLocktime(): number {
    const lockTime = bip65.encode({ blocks: blockheight });

    return lockTime;
  }

  private getInternalPubkey(pubkey: Buffer): Buffer {
    const internalPubkey = toXOnly(pubkey);

    return internalPubkey;
  }

  private getPubkey(pubkeyHex: string): Buffer {
    const pubkey = Buffer.from(pubkeyHex, 'hex');

    return pubkey;
  }
}
