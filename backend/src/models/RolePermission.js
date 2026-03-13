import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const RolePermission = sequelize.define(
  "RolePermission",
  {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    permission_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    tableName: "RolePermission",
    freezeTableName: true,
    timestamps: false,
  }
);

export default RolePermission;