import { ApiClient } from './apiClient'

class General extends ApiClient {
  constructor(client: { baseUrl: string; token: string }) {
    super(client.baseUrl, client.token)
  }

  getBlockchainInfo() {
    return this.makeRequest('GET', '/v1/indexer/blockchain/info')
  }

  getBlockTransactions(height: number, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest('GET', `/v1/indexer/block/${height}/txs${params}`)
  }

  getTxInfo(txid: string) {
    return this.makeRequest('GET', `/v1/indexer/tx/${txid}`)
  }

  getTxInputs(txid: string, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest('GET', `/v1/indexer/tx/${txid}/ins${params}`)
  }

  getTxOutputs(txid: string, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest('GET', `/v1/indexer/tx/${txid}/outs${params}`)
  }

  getAddressBalance(address: string) {
    return this.makeRequest('GET', `/v1/indexer/address/${address}/balance`)
  }

  getAddressHistory(address: string, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/history${params}`,
    )
  }

  getBtcUtxo(address: string, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/utxo-data${params}`,
    )
  }

  getInscriptionUtxo(address: string, cursor: number, size: number) {
    const params = `?cursor=${cursor}&size=${size}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/inscription-utxo-data${params}`,
    )
  }

  getInscriptionInfo(inscriptionId: string) {
    return this.makeRequest(
      'GET',
      `/v1/indexer/inscription/info/${inscriptionId}`,
    )
  }
}

class BRC20 extends ApiClient {
  constructor(client: { baseUrl: string; token: string }) {
    super(client.baseUrl, client.token)
  }

  getBestBlockHeight() {
    return this.makeRequest('GET', '/v1/indexer/brc20/bestheight')
  }

  getBrc20List(start: number, limit: number) {
    const params = `?start=${start}&limit=${limit}`
    return this.makeRequest('GET', `/v1/indexer/brc20/list${params}`)
  }

  getBrc20Info(ticker: string) {
    return this.makeRequest('GET', `/v1/indexer/brc20/${ticker}/info`)
  }

  getBrc20Holders(ticker: string, start: number, limit: number) {
    const params = `?start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/brc20/${ticker}/holders${params}`,
    )
  }

  getBrc20History(
    ticker: string,
    type_: string,
    height: number,
    start: number,
    limit: number,
  ) {
    const params = `?type=${type_}&height=${height}&start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/brc20/${ticker}/history${params}`,
    )
  }

  getBrc20TxHistory(
    ticker: string,
    txid: string,
    type_: string,
    start: number,
    limit: number,
  ) {
    const params = `?type=${type_}&start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/brc20/${ticker}/tx/${txid}/history${params}`,
    )
  }

  getAddressBrc20Summary(address: string, start: number, limit: number) {
    const params = `?start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/brc20/summary${params}`,
    )
  }

  getAddressBrc20TickerInfo(address: string, ticker: string) {
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/brc20/${ticker}/info`,
    )
  }

  getAddressBrc20History(
    address: string,
    ticker: string,
    type_: string,
    start: number,
    limit: number,
  ) {
    const params = `?type=${type_}&start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/brc20/${ticker}/history${params}`,
    )
  }

  getTransferableInscription(
    address: string,
    ticker: string,
    start: number,
    limit: number,
  ) {
    const params = `?start=${start}&limit=${limit}`
    return this.makeRequest(
      'GET',
      `/v1/indexer/address/${address}/brc20/${ticker}/transferable-inscriptions${params}`,
    )
  }
}

export class UnisatConnector {
  general: General
  brc20: BRC20

  constructor(baseUrl: string, token: string) {
    this.general = new General({ baseUrl, token })
    this.brc20 = new BRC20({ baseUrl, token })
  }
}
