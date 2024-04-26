import mempoolJS from '@mempool/mempool.js'

export async function getFastestFee(): Promise<number> {
  const {
    bitcoin: { fees },
  } = mempoolJS({ hostname: 'mempool.space' })
  const feesRecmmended = await fees.getFeesRecommended()

  return feesRecmmended.fastestFee
}
