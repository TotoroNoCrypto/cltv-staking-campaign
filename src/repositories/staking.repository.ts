import { StakingModel, Staking } from '../models/staking.model'

export class StakingRepository {
  public static async getStakings(): Promise<StakingModel[]> {
    const stakings = await Staking.findAll({
      attributes: [
        'id',
        'campaignId',
        'walletAddress',
        'scriptAddress',
        'quantity',
        'block',
      ],
    })

    return stakings
  }

  public static async createStaking(
    campaignId: number,
    walletAddress: string,
    scriptAddress: string,
    quantity: number,
  ): Promise<StakingModel> {
    const newStaking = await Staking.create(
      {
        campaignId,
        walletAddress,
        scriptAddress,
        quantity,
      },
      {
        fields: ['campaignId', 'walletAddress', 'scriptAddress', 'quantity'],
      },
    )

    return newStaking
  }

  public static async getStaking(id: number): Promise<StakingModel | null> {
    const staking = await Staking.findOne({
      where: {
        id,
      },
    })

    return staking
  }
}
