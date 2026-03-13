import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const OtpVerification = sequelize.define(
  "OtpVerification",
  {
    otp_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    channel: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    code_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    consumed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "OtpVerification",
    freezeTableName: true,
    timestamps: false,
  }
);

export default OtpVerification;