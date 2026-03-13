import Role from "./Role.js";
import UserAccount from "./UserAccount.js";
import Permission from "./Permission.js";
import RolePermission from "./RolePermission.js";
import SessionToken from "./SessionToken.js";

Role.hasMany(UserAccount, {
  foreignKey: "role_id",
});

UserAccount.belongsTo(Role, {
  foreignKey: "role_id",
});

Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: "role_id",
  otherKey: "permission_id",
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: "permission_id",
  otherKey: "role_id",
});

UserAccount.hasMany(SessionToken, {
  foreignKey: "user_id",
});

SessionToken.belongsTo(UserAccount, {
  foreignKey: "user_id",
});

export {
  Role,
  UserAccount,
  Permission,
  RolePermission,
  SessionToken,
};