const landingPageByRole = {
  GUEST: "/",
  CUSTOMER: "/",
  RESTAURANT: "/merchant/orders",
  DELIVERY_PARTNER: "/rider/assignments",
  ADMIN: "/admin/dashboard",
  CUSTOMER_SUPPORT: "/support/cases",
  PAYMENT_GATEWAY: null,
  MAP_GPS_PROVIDER: null,
  NOTIFICATION_SERVICE: null,
};

const appByRole = {
  GUEST: "public_site",
  CUSTOMER: "customer_app",
  RESTAURANT: "merchant_portal",
  DELIVERY_PARTNER: "rider_app",
  ADMIN: "admin_portal",
  CUSTOMER_SUPPORT: "support_portal",
  PAYMENT_GATEWAY: "integration",
  MAP_GPS_PROVIDER: "integration",
  NOTIFICATION_SERVICE: "integration",
};

export const buildAuthClaims = (user) => {
  const roleName = user?.Role?.role_name || null;

  const permissions =
    user?.Role?.Permissions?.map((permission) => permission.permission_code).sort() || [];

  return {
    sub: user.user_id,
    role_id: user.role_id,
    role: roleName,
    permissions,
    app: appByRole[roleName] || "unknown",
    redirect_to: landingPageByRole[roleName] || "/",
    account_status: user.account_status,
    otp_enabled: user.otp_enabled,
  };
};