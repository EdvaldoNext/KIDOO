export type UserRole = "owner" | "parent" | "child";
export type AgeGroup = "6_9" | "10_13" | "14_plus";

export type AppClaims = {
  sub?: string;
  email?: string;
  app_metadata?: {
    role?: UserRole;
    family_id?: string;
    platform_admin?: boolean;
  };
};

export function isPlatformAdmin(claims: AppClaims | null | undefined) {
  return claims?.app_metadata?.platform_admin === true;
}

export function familyRole(claims: AppClaims | null | undefined): UserRole | null {
  return claims?.app_metadata?.role ?? null;
}

export function isParentRole(role: UserRole | null | undefined) {
  return role === "owner" || role === "parent";
}

export function postLoginPath(claims: AppClaims | null | undefined) {
  if (isPlatformAdmin(claims)) return "/admin";
  const role = familyRole(claims);
  if (role === "child") return "/app/kids";
  if (isParentRole(role)) return "/app";
  return "/onboarding";
}

export function ageGroupLabel(group: AgeGroup | null | undefined) {
  if (group === "6_9") return "6–9 anos";
  if (group === "10_13") return "10–13 anos";
  if (group === "14_plus") return "14+ anos";
  return "Não informado";
}
