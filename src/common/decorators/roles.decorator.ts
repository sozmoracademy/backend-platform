import { SetMetadata } from "@nestjs/common";
import type { Role } from "@prisma/client";

export const ROLES_KEY = "roles";
/** `@Roles('CURATOR')` — читается `RolesGuard`; без декоратора доступ любому аутентифицированному. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
