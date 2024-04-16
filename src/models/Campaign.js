import { DataTypes } from "sequelize";
import { sequelize } from "../database/database.js";

export const Campaign = sequelize.define(
    "campaigns",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING
        },
        quantity: {
            type: DataTypes.INTEGER
        },
        blockstart: {
            type: DataTypes.INTEGER
        },
        blockend: {
            type: DataTypes.INTEGER
        }
    }
);
