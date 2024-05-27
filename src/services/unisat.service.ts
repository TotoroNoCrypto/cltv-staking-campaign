import config from 'config'

import { UnisatConnector } from '../unisatConnector'

const unisatApiToken = config.get<string>('unisat.apiToken')
const unisatApiUrl = config.get<string>('unisat.apiUrl')

export class UnisatService {
  private static unisatConnector: UnisatConnector = new UnisatConnector(
    unisatApiUrl,
    unisatApiToken,
  )

  public static async findBtcUtxo(
    address: string,
    stakeFee: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 16
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        address,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      resultSize = utxos.length
      utxo = utxos.find((u: { satoshi: number }) => u.satoshi >= stakeFee)
      cursor++
    } while (resultSize === size && utxo === undefined)

    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined
  }

  public static async findInscriptionUtxo(
    address: string,
    inscriptionTxid: string,
    inscriptionVout: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 16
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        address,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      resultSize = utxos.length
      utxo = utxos.find(
        (u: { txid: string; vout: number }) =>
          u.txid === inscriptionTxid && u.vout === inscriptionVout,
      )
      cursor++
    } while (resultSize === size && utxo === undefined)

    return utxo != undefined
      ? { txid: utxo.txid, vout: utxo.vout, satoshi: utxo.satoshi }
      : undefined
  }

  public static async getBtcUtxos(
    address: string,
  ): Promise<Array<{ txid: string; vout: number; satoshi: number }>> {
    let utxos: Array<{ txid: string; vout: number; satoshi: number }> = []
    let cursor = 0
    const size = 16
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        address,
        cursor * size,
        size,
      )
      resultSize = result.data.utxo.length
      utxos = utxos.concat(result.data.utxo)
      cursor++
    } while (resultSize === size)

    return utxos
  }

  public static async getInscriptionUtxos(
    address: string,
  ): Promise<Array<{ txid: string; vout: number; satoshi: number }>> {
    let utxos: Array<{ txid: string; vout: number; satoshi: number }> = []
    let cursor = 0
    const size = 16
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        address,
        cursor * size,
        size,
      )
      resultSize = result.data.utxo.length
      const filteredUtxos = result.data.utxo.filter(
        (u: {
          txid: string
          vout: number
          inscriptions: { moved: boolean }[]
        }) =>
          u.inscriptions.find((i: { moved: boolean }) => !i.moved) !==
          undefined,
      )

      if (filteredUtxos.length === 0) {
        break
      }

      utxos = utxos.concat(filteredUtxos)
      cursor++
    } while (resultSize === size)

    return utxos
  }

  public static async findConfirmedInscription(
    address: string,
    inscriptionid: string,
    inscriptionOffset: number,
  ): Promise<number | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 16
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getInscriptionUtxo(
        address,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      resultSize = utxos.length
      utxo = utxos.find(
        (u: {
          txid: string
          vout: number
          inscriptions: { inscriptionId: string; offset: number }[]
        }) =>
          u.inscriptions.find(
            (i: { inscriptionId: string; offset: number }) =>
              i.inscriptionId === inscriptionid &&
              i.offset === inscriptionOffset,
          ) !== undefined,
      )
      cursor++
    } while (resultSize === size && utxo === undefined)

    return utxo != undefined ? utxo.height : undefined
  }
}
