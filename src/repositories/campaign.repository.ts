import { CampaignModel, Campaign } from '../models/campaign.model'

export class CampaignRepository {
  public static async getCampaigns(): Promise<CampaignModel[]> {
    const campaigns = await Campaign.findAll({
      attributes: [
        'id',
        'type',
        'name',
        'quantity',
        'blockStart',
        'blockEnd',
        'lastBlockReward',
      ],
    })
    return campaigns
  }

  public static async createCampaign(
    type: string,
    name: string,
    quantity: number,
    blockStart: number,
    blockEnd: number,
  ): Promise<CampaignModel> {
    const newCampaign = await Campaign.create(
      {
        type,
        name,
        quantity,
        blockStart,
        blockEnd,
      },
      {
        fields: ['type', 'name', 'quantity', 'blockStart', 'blockEnd'],
      },
    )
    return newCampaign
  }

  public static async getCampaign(id: number): Promise<CampaignModel | null> {
    const campaign = await Campaign.findOne({
      where: {
        id,
      },
    })
    return campaign
  }

  public static async getCampaignByName(
    name: string,
  ): Promise<CampaignModel | null> {
    const campaign = await Campaign.findOne({
      where: {
        name,
      },
    })
    return campaign
  }

  public static async updateCampaign(
    id: number,
    type: string,
    name: string,
    quantity: number,
    blockStart: number,
    blockEnd: number,
    lastBlockReward: number,
  ): Promise<CampaignModel> {
    const campaign = await Campaign.findByPk(id)
    if (!campaign) {
      throw new Error('Model not found')
    }

    campaign.type = type
    campaign.name = name
    campaign.quantity = quantity
    campaign.blockStart = blockStart
    campaign.blockEnd = blockEnd
    campaign.lastBlockReward = lastBlockReward
    await campaign.save()

    return campaign
  }

  public static async deleteCampaign(id: number) {
    await Campaign.destroy({
      where: {
        id,
      },
    })
  }
}
