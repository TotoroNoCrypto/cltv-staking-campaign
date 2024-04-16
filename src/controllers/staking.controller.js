import { Staking } from "../models/Staking.js";

export async function getStakings(_, res) {
    try {
        const Stakings = await Staking.findAll({
            atributes: ["id", "campaignId", "address", "quantity", "block"],
        });
        res.json(Stakings);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}

export async function createStaking(req, res) {
    const { campaignId, address, quantity, block } = req.body;
    try {
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
    res.json("received");
}

export async function getStaking(req, res) {
    const { id } = req.params;
    try {
        const Staking = await Staking.findOne({
            where: {
                id
            }
        });
        res.json(Staking);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
}
