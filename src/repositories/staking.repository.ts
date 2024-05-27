import { StakingModel, Staking } from '../models/staking.model'

export class StakingRepository {
  public static async getStakings(): Promise<StakingModel[]> {
    const stakings = await Staking.findAll({
      attributes: ['id', 'campaignId', 'address', 'quantity', 'block'],
    })

    return stakings
  }

  public static async createStaking(
    campaignId: number,
    taproot: string,
    quantity: number,
    block: number,
  ): Promise<StakingModel> {
    const newStaking = await Staking.create(
      {
        campaignId,
        address: taproot,
        quantity,
        block,
      },
      {
        fields: ['campaignId', 'address', 'quantity', 'block'],
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
