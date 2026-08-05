export const ROLES = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
} as const;

export type RoleValue = (typeof ROLES)[keyof typeof ROLES];
