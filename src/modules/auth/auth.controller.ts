import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginRequestDto } from "./dto/login-request.dto";
import { LoginResponseDto, RefreshResponseDto, AuthUserDto } from "./dto/auth-user.dto";

const REFRESH_COOKIE = "sozmor_refresh";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>("env") === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  }

  @Public()
  // Анти-брутфорс по паролю. 20 попыток/мин — с запасом для опечаток и dev,
  // но неприемлемо для перебора.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post("login")
  async login(
    @Body() body: LoginRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const { accessToken, refreshToken, user } = await this.auth.login(body.login, body.password);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Public()
  // Не брутфорс-цель: нужен валидный подписанный refresh-cookie. Лимит щедрый —
  // access-токен живёт в памяти, поэтому каждая перезагрузка/вкладка = один refresh.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<RefreshResponseDto> {
    const { accessToken, refreshToken } = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user.userId);
    this.clearRefreshCookie(res);
  }

  @Get("me")
  async me(@CurrentUser() user: CurrentUserPayload): Promise<AuthUserDto> {
    return this.auth.me(user.userId);
  }
}
