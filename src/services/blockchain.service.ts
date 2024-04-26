import { Client } from 'bitcoin-simple-rpc'
import config from 'config'

const bitcoinUrl = config.get<string>('bitcoin.url')
const bitcoinUsername = config.get<string>('bitcoin.username')
const bitcoinPassword = config.get<string>('bitcoin.password')

export class BlockchainService {
    public static async stake(txHex: string): Promise<string> {
        const client = new Client({
        baseURL: bitcoinUrl,
        auth: { username: bitcoinUsername, password: bitcoinPassword },
    })
    const info = await client.getBlockchainInfo();
    console.log(`info: ${info.blocks}`)

    return ''
  }
}
