import { ExecutionContext, Injectable, CanActivate, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/** Глобальный (`APP_GUARD`, после `JwtAuthGuard`); без `@Roles()` — доступ любому аутентифицированному. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException("Доступ запрещён");
    }
    return true;
  }
}
