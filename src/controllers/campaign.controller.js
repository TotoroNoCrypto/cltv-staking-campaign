import { Campaign } from "../models/Campaign.js";

export async function getCampaigns(_, res) {
    try {
        const campaigns = await Campaign.findAll({
            atributes: ["id", "name", "quantity", "blockStart", "blockEnd", "lastBlockReward"],
        });
        res.json(campaigns);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function createCampaign(req, res) {
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
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function getCampaign(req, res) {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findOne({
            where: {
                id
            }
        });
        res.json(campaign);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, quantity, blockStart, blockEnd, lastBlockReward } = req.body;

        const campaign = await Campaign.findByPk(id);
        campaign.name = name;
        campaign.quantity = quantity;
        campaign.blockStart = blockStart;
        campaign.blockEnd = blockEnd;
        campaign.lastBlockReward = lastBlockReward;
        await campaign.save();

        res.json(campaign);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export async function deleteCampaign(req, res) {
    try {
        const { id } = req.params;
        await Campaign.destroy({
            where: {
                id,
            },
        });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
