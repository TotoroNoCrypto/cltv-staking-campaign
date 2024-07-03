import { StakingRepository } from '../repositories/staking.repository'
import { RewardRepository } from '../repositories/reward.repository'
import { UnisatService } from '../services/unisat.service'

export class BackgroundService {
  public static async recordUnconfirmedStakings(): Promise<void> {
    console.log('Checking for unconfirmed stakings')

    const stakings = await StakingRepository.findUnconfirmedStakings()
    for (let index = 0; index < stakings.length; index++) {
      const staking = stakings[index]
      const blockheight = await UnisatService.findConfirmedInscription(
        staking.scriptAddress,
        `${staking.inscriptionTxId}i0`,
        staking.inscriptionVout,
      )

      if (blockheight !== undefined) {
        await StakingRepository.updateStaking(staking.id, blockheight)
      }

      const sleep = (delay: number) =>
        new Promise(resolve => setTimeout(resolve, delay))
      await sleep(500)
    }
  }

  public static async recordUnconfirmedRuneStakings(): Promise<void> {
    console.log('Checking for unconfirmed rune stakings')

    // const stakings = await StakingRepository.findUnconfirmedStakings()
    // for (let index = 0; index < stakings.length; index++) {
    //   const staking = stakings[index]
    //   const blockheight = await UnisatService.findConfirmedRune(
    //     staking.scriptAddress,
    //     staking.inscriptionTxId,
    //     staking.inscriptionVout,
    //   )

    //   if (blockheight !== undefined) {
    //     await StakingRepository.updateStaking(staking.id, blockheight)
    //   }

    //   const sleep = (delay: number) =>
    //     new Promise(resolve => setTimeout(resolve, delay))
    //   await sleep(500)
    // }
  }

  public static async recordUnconfirmedBTCStakings(): Promise<void> {
    console.log('Checking for unconfirmed BTC stakings')

    const stakings = await StakingRepository.findUnconfirmedStakings()
    for (let index = 0; index < stakings.length; index++) {
      const staking = stakings[index]
      const blockheight = await UnisatService.findConfirmedBTC(
        staking.scriptAddress,
        staking.quantity,
      )

      if (blockheight !== undefined) {
        await StakingRepository.updateStaking(staking.id, blockheight)
      }

      const sleep = (delay: number) =>
        new Promise(resolve => setTimeout(resolve, delay))
      await sleep(500)
    }
  }

  public static async refreshRewards(): Promise<void> {
    console.log('Refreshing rewards')

    // Unisat displays 1 bloc ahead
    const height = (await UnisatService.getBlockchainHeight()) - 1
    await RewardRepository.computeRewards(Number(height))
  }
}
