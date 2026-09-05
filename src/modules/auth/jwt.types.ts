import type { Role } from "@prisma/client";

/** BACKEND.md §5.1 — access: `{ sub, role, ver }`; refresh: `{ sub, ver }`. */
export interface AccessTokenPayload {
  sub: string;
  role: Role;
  ver: number;
}

export interface RefreshTokenPayload {
  sub: string;
  ver: number;
}
