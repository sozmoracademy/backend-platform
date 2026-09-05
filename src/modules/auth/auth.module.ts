import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from "./auth.tokens";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    {
      provide: ACCESS_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>("jwt.accessSecret"),
          signOptions: {
            expiresIn: config.get<string>("jwt.accessTtl") as `${number}${"s" | "m" | "h" | "d"}`,
          },
        }),
      inject: [ConfigService],
    },
    {
      provide: REFRESH_JWT_SERVICE,
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>("jwt.refreshSecret"),
          signOptions: {
            expiresIn: config.get<string>("jwt.refreshTtl") as `${number}${"s" | "m" | "h" | "d"}`,
          },
        }),
      inject: [ConfigService],
    },
    // Глобальные гварды (BACKEND.md §5.3) — регистрируются здесь, т.к. им нужна
    // `JwtStrategy` этого модуля; Nest применяет их ко всему приложению независимо
    // от того, в каком модуле объявлен провайдер APP_GUARD.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
