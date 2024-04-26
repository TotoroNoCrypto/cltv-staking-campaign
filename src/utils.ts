import mempoolJS from '@mempool/mempool.js'

export async function getFastestFee(): Promise<number> {
  if (process.env.NODE_ENV === 'mainnet') {
    const {
      bitcoin: { fees },
    } = mempoolJS({ hostname: 'mempool.space' })
    const feesRecmmended = await fees.getFeesRecommended()

    return feesRecmmended.fastestFee
  }

  return 1
}

export async function getTxHex(txid: string): Promise<string> {
  if (process.env.NODE_ENV === 'mainnet') {
    const {
      bitcoin: { transactions  },
    } = mempoolJS({ hostname: 'mempool.space' })
    const txHex = await transactions.getTxHex({ txid })

    return txHex
  } else if (process.env.NODE_ENV === 'mainnet') {
    const {
      bitcoin: { transactions },
    } = mempoolJS({ hostname: 'mempool.space',  network: 'testnet' })
    const txHex = await transactions.getTxHex({ txid })

    return txHex
  }
  
  return ''
}
