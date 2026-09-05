import type { Role as PrismaRole } from "@prisma/client";

export type ApiRole = "student" | "curator";

/** Prisma хранит роль в верхнем регистре (`STUDENT`/`CURATOR`); контракт фронта — в нижнем. */
export function roleToDto(role: PrismaRole): ApiRole {
  return role === "STUDENT" ? "student" : "curator";
}
