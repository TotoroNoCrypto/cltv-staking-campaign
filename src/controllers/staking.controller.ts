import { Request, Response } from 'express';
import { Staking } from "../models/Staking";

export async function getStakings(_: Request, res: Response) {
    try {
        const stakings = await Staking.findAll({
            attributes: ["id", "campaignId", "address", "quantity", "block"],
        });
        res.json(stakings);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export async function createStaking(req: Request, res: Response) {
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
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export async function getStaking(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const staking = await Staking.findOne({
            where: {
                id
            }
        });
        res.json(staking);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({ message: error.message });
        }
    }
}
