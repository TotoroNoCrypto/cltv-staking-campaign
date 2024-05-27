import { StakingModel, Staking } from '../models/staking.model'

export class StakingRepository {
  public static async getStakings(): Promise<StakingModel[]> {
    const stakings = await Staking.findAll({
      attributes: [
        'id',
        'campaignId',
        'walletAddress',
        'scriptAddress',
        'inscriptionTxId',
        'inscriptionVout',
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
    inscriptionTxId: string,
    inscriptionVout: number,
    quantity: number,
  ): Promise<StakingModel> {
    const newStaking = await Staking.create(
      {
        campaignId,
        walletAddress,
        scriptAddress,
        inscriptionTxId,
        inscriptionVout,
        quantity,
      },
      {
        fields: [
          'campaignId',
          'walletAddress',
          'scriptAddress',
          'inscriptionTxId',
          'inscriptionVout',
          'quantity',
        ],
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

  public static async updateStaking(
    id: number,
    block: number,
  ): Promise<StakingModel> {
    const staking = await Staking.findByPk(id)
    if (!staking) {
      throw new Error('Model not found')
    }

    staking.block = block
    await staking.save()

    return staking
  }

  public static async findUnconfirmedStakings(): Promise<StakingModel[]> {
    const stakings = await Staking.findAll({
      where: {
        block: null,
      },
      attributes: [
        'id',
        'campaignId',
        'walletAddress',
        'scriptAddress',
        'inscriptionTxId',
        'inscriptionVout',
        'quantity',
        'block',
      ],
    })

    return stakings
  }
}
