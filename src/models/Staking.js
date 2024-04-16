import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Staking = sequelize.define(
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

