import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { toAuthUserDto } from "./auth.mapper";
import type { AuthUserDto } from "./dto/auth-user.dto";
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from "./auth.tokens";
import type { AccessTokenPayload, RefreshTokenPayload } from "./jwt.types";
import type { User } from "@prisma/client";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * `auth` — BACKEND.md §5.2. Не знает про req/res/cookie (контроллер выставляет
 * `Set-Cookie`) — только выдаёт значения токенов и доменные исключения.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    @Inject(ACCESS_JWT_SERVICE) private readonly accessJwt: JwtService,
    @Inject(REFRESH_JWT_SERVICE) private readonly refreshJwt: JwtService,
  ) {}

  private issueTokenPair(user: User): TokenPair {
    const accessPayload: AccessTokenPayload = { sub: user.id, role: user.role, ver: user.tokenVersion };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, ver: user.tokenVersion };
    return {
      accessToken: this.accessJwt.sign(accessPayload),
      refreshToken: this.refreshJwt.sign(refreshPayload),
    };
  }

  private async buildAuthUser(user: User): Promise<AuthUserDto> {
    const student =
      user.role === "STUDENT" ? await this.prisma.student.findUnique({ where: { userId: user.id } }) : null;
    return toAuthUserDto(user, student);
  }

  /** `login`: сообщение об ошибке одинаковое для «нет логина» и «неверный пароль» (BACKEND.md §5.2). */
  async login(loginInput: string, password: string): Promise<TokenPair & { user: AuthUserDto }> {
    const user = await this.users.findByLogin(loginInput.trim().toLowerCase());
    if (!user || !(await this.users.validatePassword(user, password))) {
      throw new UnauthorizedException("Неверный логин или пароль");
    }
    const tokens = this.issueTokenPair(user);
    const authUser = await this.buildAuthUser(user);
    return { ...tokens, user: authUser };
  }

  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    if (!refreshToken) throw new UnauthorizedException("Сессия истекла");
    let payload: RefreshTokenPayload;
    try {
      payload = this.refreshJwt.verify<RefreshTokenPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException("Сессия истекла");
    }
    const user = await this.users.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.ver) {
      throw new UnauthorizedException("Сессия истекла");
    }
    return this.issueTokenPair(user);
  }

  /** `tokenVersion++` — инвалидирует все выданные access/refresh токены (BACKEND.md §5.1). */
  async logout(userId: string): Promise<void> {
    await this.users.bumpTokenVersion(userId);
  }

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException("Не авторизован");
    return this.buildAuthUser(user);
  }
}
