import "reflect-metadata";
import { NestFactory, Reflector } from "@nestjs/core";
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.get<string>("cors.origin"),
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

  console.log(`Sozmor backend запущен на :${port}`);
}

void bootstrap();
