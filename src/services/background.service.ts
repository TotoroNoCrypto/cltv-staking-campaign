import { StakingRepository } from '../repositories/staking.repository'
import { RewardRepository } from '../repositories/reward.repository'
import { UnisatService } from '../services/unisat.service'

export class BackgroundService {
  public static async recordUnconfirmedStakings(): Promise<void> {
    console.log('Checking for unconfirmed stakings')

    const stakings = await StakingRepository.findUnconfirmedStakings()
    stakings.forEach(async staking => {
      const blockheight = await UnisatService.findConfirmedInscription(
        staking.scriptAddress,
        `${staking.inscriptionTxId}i0`,
        staking.inscriptionVout,
      )
      if (blockheight !== undefined) {
        await StakingRepository.updateStaking(staking.id, blockheight)
      }
    })
  }

  public static async refreshRewards(): Promise<void> {
    console.log('Refreshing rewards')

    // Unisat displays 1 bloc ahead
    const height = await UnisatService.getBlockchainHeight() - 1
    await RewardRepository.computeRewards(Number(height))
  }
}
