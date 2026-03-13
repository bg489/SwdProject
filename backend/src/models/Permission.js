import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Permission = sequelize.define(
  "Permission",
  {
    permission_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    permission_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    permission_name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
  },
  {
    tableName: "Permission",
    freezeTableName: true,
    timestamps: false,
  }
);

export default Permission;