import {
    ECPair,
    ECPairInterface,
  } from '@unisat/wallet-sdk/lib/bitcoin-core';
import { AddressType } from '@unisat/wallet-sdk/lib/';
import { NetworkType } from '@unisat/wallet-sdk/lib/network';
import { LocalWallet } from '@unisat/wallet-sdk/lib/wallet';
import { Network } from 'bitcoinjs-lib/src/networks'
import { Psbt } from 'bitcoinjs-lib/src/psbt'
import config from 'config'

const network = config.get<Network>('bitcoin.network')
const networkType = config.get<NetworkType>('bitcoin.networkType');
const wif = config.get<string>('wallet.wif')

export class SignatureService {
  public async stake(
    psbtHex: string,
  ): Promise<{ txSize: number; psbtHex: string; txHex: string; }> {
    const signer = this.getSigner();
    const wallet = this.getWallet(signer);
    const psbt = Psbt.fromHex(psbtHex);
    await wallet.signPsbt(psbt, {
      toSignInputs: [
        { index: 0, publicKey: wallet.pubkey },
        { index: 1, publicKey: wallet.pubkey },
      ],
    });

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction(true);

    return { txSize: tx.virtualSize(), psbtHex: psbt.toHex(), txHex: tx.toHex() } 
  }

  private getWallet(signer: ECPairInterface): LocalWallet {
    const wallet = new LocalWallet(
      signer.toWIF(),
      AddressType.P2WPKH,
      networkType,
    );

    return wallet;
  }

  private getSigner(): ECPairInterface {
    const signer = ECPair.fromWIF(wif, network);

    return signer;
  }
}
