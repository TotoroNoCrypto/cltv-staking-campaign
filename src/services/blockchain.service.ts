import { Client } from 'bitcoin-simple-rpc'
import config from 'config'

const bitcoinUrl = config.get<string>('bitcoin.url')
const bitcoinUsername = config.get<string>('bitcoin.username')
const bitcoinPassword = config.get<string>('bitcoin.password')

export class BlockchainService {
  private static client: Client = new Client({
    baseURL: bitcoinUrl,
    auth: { username: bitcoinUsername, password: bitcoinPassword },
  })

  public static async broadcast(txHex: string): Promise<void> {
    await this.client.sendRawTransaction(txHex)
  }
}
