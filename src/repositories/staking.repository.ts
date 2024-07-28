import { Op, fn, col } from 'sequelize'
import { StakingModel, Staking } from '../models/staking.model'
import { CampaignRepository } from '../repositories/campaign.repository'
import { UnisatService } from '../services/unisat.service'
import config from 'config'

const teamAddress = config.get<string>('cltv.teamAddress')
const tvlInterval: number = 1800000

export class StakingRepository {
  private static cachedTVL: Map<
    string,
    { time: number; total: number; tvl: number }
  >

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
    if (this.cachedTVL === undefined) {
      this.cachedTVL = new Map()
    }

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
          if (this.cachedTVL.has(campaign!.name)) {
            const time = this.cachedTVL.get(campaign!.name)!.time
            if (Date.now() - time > tvlInterval) {
              console.log(`Delete entry for ${campaign!.name}`)
              this.cachedTVL.delete(campaign!.name)
            }
          }
          if (!this.cachedTVL.has(campaign!.name)) {
            let tvl = 0
            console.log(`Add entry for ${campaign!.name}`)
            const brc20Market = await UnisatService.findBRC20Market(
              campaign!.name,
            )
            if (brc20Market != undefined) {
              tvl = Math.floor(
                staking.dataValues.total *
                  brc20Market.satoshi! *
                  (brc20Market.BTCPrice / 100000000),
              )
            }
            this.cachedTVL.set(campaign!.name, {
              time: Date.now(),
              total: staking.dataValues.total,
              tvl: tvl,
            })
          }

          campaignTVL = campaignTVL.concat({
            name: campaign!.name,
            total: this.cachedTVL.get(campaign!.name)!.total,
            tvl: this.cachedTVL.get(campaign!.name)!.tvl,
          })
          totalTVL += this.cachedTVL.get(campaign!.name)!.tvl

          break

        case 'Rune':
          if (this.cachedTVL.has(campaign!.name)) {
            const time = this.cachedTVL.get(campaign!.name)!.time
            if (Date.now() - time > tvlInterval) {
              console.log(`Delete entry for ${campaign!.name}`)
              this.cachedTVL.delete(campaign!.name)
            }
          }
          if (!this.cachedTVL.has(campaign!.name)) {
            let tvl = 0
            console.log(`Add entry for ${campaign!.name}`)
            const runeMarket = await UnisatService.findRuneMarket(
              campaign!.name,
            )
            if (runeMarket != undefined) {
              tvl = Math.floor(
                staking.dataValues.total *
                  runeMarket.satoshi! *
                  (runeMarket.BTCPrice / 100000000),
              )
              if (campaign!.name === 'DOG•GO•TO•THE•MOON') {
                tvl = Math.floor(tvl / 10000)
              } else if (campaign!.name === 'DOTSWAP•DOTSWAP') {
                tvl = Math.floor(tvl / 100)
              }
            }
            this.cachedTVL.set(campaign!.name, {
              time: Date.now(),
              total: staking.dataValues.total,
              tvl: tvl,
            })
          }

          campaignTVL = campaignTVL.concat({
            name: campaign!.name,
            total: this.cachedTVL.get(campaign!.name)!.total,
            tvl: this.cachedTVL.get(campaign!.name)!.tvl,
          })
          totalTVL += this.cachedTVL.get(campaign!.name)!.tvl

          break

        default:
          if (this.cachedTVL.has(campaign!.name)) {
            const time = this.cachedTVL.get(campaign!.name)!.time
            if (Date.now() - time > tvlInterval) {
              console.log(`Delete entry for ${campaign!.name}`)
              this.cachedTVL.delete(campaign!.name)
            }
          }
          if (!this.cachedTVL.has(campaign!.name)) {
            let tvl = 0
            console.log(`Add entry for ${campaign!.name}`)
            const oshiMarket = await UnisatService.findBRC20Market('OSHI')
            if (oshiMarket != undefined) {
              tvl = Math.floor(
                staking.dataValues.total * (oshiMarket!.BTCPrice / 100000000),
              )
            }
            this.cachedTVL.set(campaign!.name, {
              time: Date.now(),
              total: staking.dataValues.total,
              tvl: tvl,
            })
          }

          campaignTVL = campaignTVL.concat({
            name: campaign!.name,
            total: this.cachedTVL.get(campaign!.name)!.total,
            tvl: this.cachedTVL.get(campaign!.name)!.tvl,
          })
          totalTVL += this.cachedTVL.get(campaign!.name)!.tvl

          break
      }
    }

    return { campaigns: campaignTVL, tvl: totalTVL }
  }
}
