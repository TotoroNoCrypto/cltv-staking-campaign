import { Op, fn, col } from 'sequelize'
import { StakingModel, Staking } from '../models/staking.model'
import { CampaignRepository } from '../repositories/campaign.repository'
import { UnisatService } from '../services/unisat.service'
import config from 'config'

const teamAddress = config.get<string>('cltv.teamAddress')

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
        'runeId',
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
    inscriptionTxId: string | null,
    inscriptionVout: number | null,
    runeId: string | null,
    quantity: number,
  ): Promise<StakingModel> {
    const newStaking = await Staking.create(
      {
        campaignId,
        walletAddress,
        scriptAddress,
        inscriptionTxId,
        inscriptionVout,
        runeId,
        quantity,
      },
      {
        fields: [
          'campaignId',
          'walletAddress',
          'scriptAddress',
          'inscriptionTxId',
          'inscriptionVout',
          'runeId',
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

  public static async getStakingsByWalletAddress(
    walletAddress: string,
  ): Promise<StakingModel[]> {
    const stakings = await Staking.findAll({
      where: {
        walletAddress,
        block: { [Op.not]: null },
      },
      attributes: [
        'id',
        'campaignId',
        'walletAddress',
        'scriptAddress',
        'inscriptionTxId',
        'inscriptionVout',
        'runeId',
        'quantity',
        'block',
      ],
    })

    return stakings
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
        'runeId',
        'quantity',
        'block',
      ],
    })

    return stakings
  }

  public static async totalOnStaking(
    campaignId: number,
    walletAddress: string,
  ): Promise<number> {
    const staking = await Staking.findOne({
      group: 'scriptAddress',
      where: {
        campaignId,
        walletAddress,
        block: { [Op.not]: null },
      },
      attributes: [[fn('SUM', col('quantity')), 'total']],
    })

    return staking?.dataValues.total
  }

  public static async getTVL(): Promise<{
    campaigns: { name: string; total: number; tvl: number }[]
    tvl: number
  }> {
    const groupStakings = await Staking.findAll({
      group: 'campaignId',
      where: {
        block: { [Op.not]: null },
        campaignId: { [Op.gt]: 2 },
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

      switch (campaign!.type) {
        case 'BRC20':
          const brc20Market = await UnisatService.findBRC20Market(
            campaign!.name,
          )
          if (brc20Market != undefined) {
            const tvl = Math.floor(
              staking.dataValues.total *
                brc20Market.satoshi! *
                (brc20Market.BTCPrice / 100000000),
            )
            campaignTVL = campaignTVL.concat({
              name: campaign!.name,
              total: staking.dataValues.total,
              tvl: tvl,
            })
            totalTVL += tvl
          }

          break

        case 'Rune':
          const runeMarket = await UnisatService.findRuneMarket(campaign!.name)
          if (runeMarket != undefined) {
            let tvl = Math.floor(
              staking.dataValues.total *
                runeMarket.satoshi! *
                (runeMarket.BTCPrice / 100000000),
            )
            if (campaign!.name === 'DOG•GO•TO•THE•MOON') {
              tvl = Math.floor(tvl / 10000)
            } else if (campaign!.name === 'DOTSWAP•DOTSWAP') {
              tvl = Math.floor(tvl / 100)
            }
            campaignTVL = campaignTVL.concat({
              name: campaign!.name,
              total: staking.dataValues.total,
              tvl: tvl,
            })
            totalTVL += tvl
          }

          break

        default:
          const oshiMarket = await UnisatService.findBRC20Market('OSHI')
          const tvl = Math.floor(
            staking.dataValues.total * (oshiMarket!.BTCPrice / 100000000),
          )
          campaignTVL = campaignTVL.concat({
            name: campaign!.name,
            total: staking.dataValues.total,
            tvl: tvl,
          })
          totalTVL += tvl

          break
      }
    }

    return { campaigns: campaignTVL, tvl: totalTVL }
  }
}
