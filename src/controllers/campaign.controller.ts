import { Request, Response } from 'express';
import { Campaign } from "../models/Campaign";

export async function getCampaigns(_: Request, res: Response) {
    try {
        const campaigns = await Campaign.findAll({
            attributes: ["id", "name", "quantity", "blockStart", "blockEnd", "lastBlockReward"],
        });
        res.json(campaigns);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export async function createCampaign(req: Request, res: Response) {
    try {
        const { name, quantity, blockStart, blockEnd, lastBlockReward } = req.body;
        let newCampaign = await Campaign.create({
            name,
            quantity,
            blockStart,
            blockEnd,
            lastBlockReward
        },
        {
            fields: ["name", "quantity", "blockStart", "blockEnd", "lastBlockReward"],
        });
        return res.json(newCampaign);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export async function getCampaign(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findOne({
            where: {
                id
            }
        });
        res.json(campaign);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const updateCampaign = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, quantity, blockStart, blockEnd, lastBlockReward } = req.body;

        const campaign = await Campaign.findByPk(id);
        if (!campaign) {
            throw new Error('Model not found')
        }
        
        campaign.name = name;
        campaign.quantity = quantity;
        campaign.blockStart = blockStart;
        campaign.blockEnd = blockEnd;
        campaign.lastBlockReward = lastBlockReward;
        await campaign.save();

        res.json(campaign);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
    }
};

export async function deleteCampaign(req: Request, res: Response) {
    try {
        const { id } = req.params;
        await Campaign.destroy({
            where: {
                id,
            },
        });
        return res.sendStatus(204);
    } catch (error) {
        if (error instanceof Error) {
            return res.status(500).json({ message: error.message });
        }
    }
}
