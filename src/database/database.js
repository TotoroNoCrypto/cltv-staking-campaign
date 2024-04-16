import Sequelize from "sequelize";

export const sequelize = new Sequelize(
    "cltv",
    "postgres",
    "postgres", 
    {
        host: "localhost",
        dialect: "postgres",
    }
);
