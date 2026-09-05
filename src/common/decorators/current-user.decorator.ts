import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Role } from "@prisma/client";

export interface CurrentUserPayload {
  userId: string;
  role: Role;
  /** Присутствует только для `role === 'STUDENT'`. */
  studentId?: string;
}

/** `@CurrentUser()` — читает `req.user`, положенный `JwtAuthGuard` (BACKEND.md §5.3). */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as CurrentUserPayload;
});
