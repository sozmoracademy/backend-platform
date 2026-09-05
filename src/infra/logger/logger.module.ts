import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";

/**
 * `nestjs-pino` — структурные логи, requestId, redact для секретов (BACKEND.md §16).
 * Не логируем `authorization`/`password`/`set-cookie` даже по ошибке.
 */
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get<string>("env") === "production" ? "info" : "debug",
          genReqId: (req: { headers: Record<string, unknown> }) =>
            (req.headers["x-request-id"] as string) ?? randomUUID(),
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "res.headers['set-cookie']",
              "req.body.password",
            ],
            remove: true,
          },
          transport:
            config.get<string>("env") === "production"
              ? undefined
              : { target: "pino-pretty", options: { singleLine: true, colorize: true } },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
