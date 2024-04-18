import { Staking } from "../models/Staking.js";

export async function getStakings(_, res) {
    try {
        const stakings = await Staking.findAll({
            atributes: ["id", "campaignId", "address", "quantity", "block"],
        });
        res.json(stakings);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function createStaking(req, res) {
    try {
        const { campaignId, address, quantity, block } = req.body;
        let newStaking = await Staking.create({
            campaignId,
            address,
            quantity,
            block
        },
        {
            fields: ["campaignId", "address", "quantity", "block"],
        });
        return res.json(newStaking);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function getStaking(req, res) {
    try {
        const { id } = req.params;
        const staking = await Staking.findOne({
            where: {
                id
            }
        });
        res.json(staking);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}
