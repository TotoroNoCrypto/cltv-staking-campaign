import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database/database";

interface StakingModel extends Model {
    id: number;
    campaignId: number;
    address: string;
    quantity: number;
    block: number;
}

export const Staking = sequelize.define<StakingModel>(
    "stakings",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        address: {
            type: DataTypes.STRING
        },
        quantity: {
            type: DataTypes.INTEGER
        },
        block: {
            type: DataTypes.INTEGER
        }
    }
);

