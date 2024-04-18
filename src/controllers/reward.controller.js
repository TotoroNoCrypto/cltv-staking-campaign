import { Reward } from "../models/Reward.js";

export async function getRewards(_, res) {
    try {
        const Rewards = await Reward.findAll({
            atributes: ["id", "campaignId", "address", "quantity"],
        });
        res.json(Rewards);
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
        const Reward = await Reward.findOne({
            where: {
                id
            }
        });
        res.json(Reward);
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
