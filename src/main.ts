import "reflect-metadata";
import { NestFactory, Reflector } from "@nestjs/core";
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  // За обратным прокси (Railway/облако): доверяем первому X-Forwarded-* хопу —
  // корректный req.ip для троттлинга и req.protocol=https для Secure-cookie.
  app.set("trust proxy", 1);

  app.use(helmet());
  // gzip/deflate на JSON-ответы — списки учеников/групп/каталог уроков едут в разы
  // меньше по объёму (заметно на медленных каналах).
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string[]>("cors.origin"),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Защита в глубину (BACKEND.md §8): применяет @Exclude()/@Expose() из Response DTO,
  // если сервис когда-нибудь вернёт объект как экземпляр класса, а не только вручную
  // замапленный литерал (как сейчас делают все мапперы).
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  if (config.get<string>("env") !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Sozmor Academy API")
        .setDescription("Бэкенд платформы онлайн-школы Sozmor Academy")
        .setVersion("1.0")
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup("api/docs", app, document, {
      jsonDocumentUrl: "api/docs-json",
    });
  }

  const port = config.get<number>("port") ?? 3000;
  await app.listen(port);

  app.get(Logger).log(`Sozmor backend запущен на :${port}`);
}

void bootstrap();
