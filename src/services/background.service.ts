import { StakingRepository } from '../repositories/staking.repository'
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
}
