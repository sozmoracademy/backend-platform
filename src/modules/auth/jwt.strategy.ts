import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../infra/prisma/prisma.service";
import type { CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import type { AccessTokenPayload } from "./jwt.types";

/**
 * Проверяет access-JWT, кладёт `req.user = { userId, role, studentId? }`
 * (BACKEND.md §5.3) — `studentId` подтягивается из `User.student`. Сверяет
 * `ver` из токена с текущим `User.tokenVersion` — logout/смена пароля
 * инвалидируют уже выданные access-токены без ожидания их естественного TTL.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("jwt.accessSecret")!,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<CurrentUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { student: { select: { id: true } } },
    });
    if (!user || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException("Сессия истекла");
    }
    return {
      userId: user.id,
      role: user.role,
      studentId: user.student?.id,
    };
  }
}
