import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Reward = sequelize.define(
    "rewards",
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
        }
    },
    {
        indexes: [
            {
                unique: true,
                fields: ['campaignId', 'address']
            }
        ]
    }
);
