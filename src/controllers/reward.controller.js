import { Reward } from "../models/Reward.js";
import { Campaign } from "../models/Campaign.js";
import { Staking } from "../models/Staking.js";

export async function getRewards(_, res) {
    try {
        const rewards = await Reward.findAll({
            atributes: ["id", "campaignId", "address", "quantity"],
        });
        res.json(rewards);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function createReward(req, res) {
    try {
        const { campaignId, address, quantity } = req.body;
        let newReward = await Reward.create({
            campaignId,
            address,
            quantity
        },
        {
            fields: ["campaignId", "address", "quantity"],
        });
        return res.json(newReward);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function getReward(req, res) {
    try {
        const { id } = req.params;
        const reward = await Reward.findOne({
            where: {
                id
            }
        });
        res.json(reward);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export const updateReward = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const reward = await Reward.findByPk(id);
        reward.quantity = quantity;
        await reward.save();

        res.json(reward);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

export async function deleteReward(req, res) {
    try {
        const { id } = req.params;
        await Reward.destroy({
            where: {
                id,
            },
        });
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}

export async function computeRewards(req, res) {
    try {
        const { blockid } = req.params;
        const campaigns = await Campaign.findAll({
            atributes: ["id", "name", "quantity", "blockStart", "blockEnd", "lastBlockReward"],
        });
        const stakings = await Staking.findAll({
            atributes: ["id", "campaignId", "address", "quantity", "block"],
        });

        campaigns.forEach(async campaign => {
            const rewardPerBlock = campaign.quantity / (campaign.blockEnd - campaign.blockStart);

            const stakerRewards = new Map();
            const start = campaign.lastBlockReward > campaign.blockStart ?
                campaign.lastBlockReward :
                campaign.blockStart;
            const end = blockid;
            for (let block = start; block <= end; block++) {
                const share = stakerRewards.size > 0 ? rewardPerBlock / stakerRewards.size : 0;
                stakings.forEach(async staking => {
                    if (staking.campaignId == campaign.id && staking.block <= block) {
                        if (!stakerRewards.has(staking.address)) {
                            stakerRewards.set(staking.address, 0);
                        }
                        if (block > staking.block) {
                            let reward = stakerRewards.get(staking.address);
                            stakerRewards.set(staking.address, reward + share);
                        }
                    }
                });
            }

            stakerRewards.forEach(async (value, key) => {
                const [ reward, created ] = await Reward.findOrCreate({
                    where: {
                        campaignId: campaign.id,
                        address: key
                    },
                    quantity: 0
                });
                reward.quantity += value;
                reward.save();
            });

            campaign.lastBlockReward = blockid;
            await campaign.save();
        });
        
        return res.sendStatus(204);
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
}
