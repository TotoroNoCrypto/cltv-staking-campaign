import axios, { AxiosError } from 'axios'

class ApiClient {
  baseUrl: string
  token: string
  timeout: number
  headers: object

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl
    this.token = token
    this.timeout = 30000
    this.headers = {
      Authorization: `Bearer ${this.token}`,
      'User-Agent': 'Unisat-Node-Client',
      'Content-Type': 'application/json',
    }
  }

  async makeRequest(method: string, path: string, data = {}) {
    const url = this.baseUrl + path
    console.log(`Starting request: ${method} ${url}`)

    try {
      const response = await axios({
        method: method,
        url: url,
        headers: this.headers,
        data: data,
        timeout: this.timeout,
      })

      console.log(
        `Response received: ${response.status} ${response.statusText}`,
      )
      return response.data
    } catch (error) {
      if (error instanceof AxiosError) {
        console.error(
          `Error during ${method} request to ${url}: ${error.message}`,
        )
        if (error.response) {
          console.error(
            `Error details: ${error.response.status} ${error.response.statusText}`,
          )
          console.log('Error response body:', error.response.data)
        }
      }
      throw error
    }
  }
}

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

  getQuoteSwap(
    address: string,
    tickIn: string,
    tickOut: string,
    amount: string,
    exactType: string,
  ) {
    return this.makeRequest(
      'GET',
      `/v1/brc20-swap/quote_swap?address=${address}&tickIn=${tickIn}&tickOut=${tickOut}&amount=${amount}&exactType=${exactType}`,
    )
  }
}

class Market extends ApiClient {
  constructor(client: { baseUrl: string; token: string }) {
    super(client.baseUrl, client.token)
  }

  getBRC20Types(
    ticker: string,
    start: number,
    limit: number,
  ) {
    return this.makeRequest(
      'POST',
      '/v3/market/brc20/auction/brc20_types',
      {
        "ticks": [
          ticker
        ],
        "start": start,
        "limit": limit
      },
    )
  }

  getRuneTypes(
    start: number,
    limit: number,
  ) {
    return this.makeRequest(
      'POST',
      '/v3/market/runes/auction/runes_types',
      {
        "start": start,
        "limit": limit
      },
    )
  }
}

export class UnisatConnector {
  general: General
  brc20: BRC20
  market: Market

  constructor(baseUrl: string, token: string) {
    this.general = new General({ baseUrl, token })
    this.brc20 = new BRC20({ baseUrl, token })
    this.market = new Market({ baseUrl, token })
  }
}
