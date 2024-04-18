import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";
import { Staking } from "./Staking.js";
import { Reward } from "./Reward.js";

export const Campaign = sequelize.define(
    "campaigns",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            unique: true
        },
        quantity: {
            type: DataTypes.INTEGER
        },
        blockStart: {
            type: DataTypes.INTEGER
        },
        blockEnd: {
            type: DataTypes.INTEGER
        },
        lastBlockReward: {
            type: DataTypes.INTEGER
        }
    }
);

Staking.belongsTo(Campaign, {
    foreinkey: "campaignId",
    targetId: "id"
});

Reward.belongsTo(Campaign, {
    foreinkey: "campaignId",
    targetId: "id"
});
