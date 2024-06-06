import config from 'config'

import { UnisatConnector } from '../unisatConnector'

const unisatApiToken = config.get<string>('unisat.apiToken')
const unisatApiUrl = config.get<string>('unisat.apiUrl')

export class UnisatService {
  private static unisatConnector: UnisatConnector = new UnisatConnector(
    unisatApiUrl,
    unisatApiToken,
  )

  public static async getBlockchainHeight(): Promise<number> {
    const info = await this.unisatConnector.general.getBlockchainInfo()

    return info.data.blocks
  }

  public static async findBtcUtxo(
    address: string,
    fee: number,
  ): Promise<{ txid: string; vout: number; satoshi: number } | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 50
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        address,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      resultSize = utxos.length
      utxo = utxos.find((u: { satoshi: number }) => u.satoshi >= fee)
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
    const size = 50
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
    const size = 50
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
    const size = 50
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
    const size = 50
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

    return utxo != undefined
      ? utxo.height < 900000
        ? utxo.height
        : (await this.getBlockchainHeight()) - 1
      : undefined
  }

  public static async findConfirmedBTC(
    address: string,
    amount: number,
  ): Promise<number | undefined> {
    let utxos = []
    let utxo = undefined
    let cursor = 0
    const size = 50
    let resultSize = 0

    do {
      const result = await this.unisatConnector.general.getBtcUtxo(
        address,
        cursor * size,
        size,
      )
      utxos = result.data.utxo
      resultSize = utxos.length
      utxo = utxos.find(
        (u: { txid: string; vout: number; satoshi: number }) =>
          u.satoshi === amount,
      )
      cursor++
    } while (resultSize === size && utxo === undefined)

    return utxo != undefined
      ? utxo.height < 900000
        ? utxo.height
        : (await this.getBlockchainHeight()) - 1
      : undefined
  }

  public static async findBRC20Market(
    ticker: string
  ): Promise<{ satoshi: number, BTCPrice: number } | undefined> {
    let markets = []
    let market = undefined
    let cursor = 0
    const size = 50
    let resultSize = 0
    let BTCPrice = 0

    do {
      const result = await this.unisatConnector.market.getBRC20Types(
        ticker,
        cursor * size,
        size,
      )
      BTCPrice = result.data.BTCPrice
      markets = result.data.list
      resultSize = markets.length
      market = markets.find((m: { tick: string }) => m.tick.toUpperCase() === ticker.toUpperCase())
      cursor++
    } while (resultSize === size && market === undefined)

    return market != undefined
      ? { satoshi: market.curPrice, BTCPrice: BTCPrice }
      : undefined
  }

  public static async findRunesMarket(
    ticker: string
  ): Promise<{ satoshi: number, BTCPrice: number } | undefined> {
    let markets = []
    let market = undefined
    let cursor = 0
    const size = 50
    let resultSize = 0
    let BTCPrice = 0

    do {
      const result = await this.unisatConnector.market.getRuneTypes(
        cursor * size,
        size,
      )
      BTCPrice = result.data.BTCPrice
      markets = result.data.list
      resultSize = markets.length
      market = markets.find((m: { tick: string }) => m.tick.toUpperCase() === ticker.toUpperCase())
      cursor++
    } while (resultSize === size && market === undefined)

    return market != undefined
      ? { satoshi: market.curPrice, BTCPrice: BTCPrice }
      : undefined
  }
}
