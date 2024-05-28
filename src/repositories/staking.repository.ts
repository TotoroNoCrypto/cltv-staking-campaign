import { Op, fn, col } from 'sequelize'
import { StakingModel, Staking } from '../models/staking.model'
import { CampaignRepository } from '../repositories/campaign.repository'
import { UnisatService } from '../services/unisat.service'

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

  public static async getTVL(): Promise<{
    campaigns: { name: string; total: number; tvl: number }[]
    tvl: number
  }> {
    const groupStakings = await Staking.findAll({
      group: 'campaignId',
      where: {
        block: { [Op.not]: null },
      },
      attributes: ['campaignId', [fn('SUM', col('quantity')), 'total']],
    })

    let campaignTVL: { name: string; total: number; tvl: number }[] = []
    let totalTVL = 0

    for (let i = 0; i < groupStakings.length; i++) {
      const staking = groupStakings[i]
      const campaign = await CampaignRepository.getCampaign(
        staking.dataValues.campaignId,
      )
      const quote = await UnisatService.getQuote(
        'bc1pafup76rku5y3h689hpvesfgzdq28wkn6uuagepehdj9a2elzsnxqqmh9n3',
        campaign!.name,
        'sats',
        '1',
        'exactIn',
      )
      const tvl = Math.floor(staking.dataValues.total * quote)
      campaignTVL = campaignTVL.concat({
        name: campaign!.name,
        total: staking.dataValues.total,
        tvl: tvl,
      })
      totalTVL += tvl
    }

    return { campaigns: campaignTVL, tvl: totalTVL }
  }
}
