import { Injectable, Logger, OnModuleInit, OnModuleDestroy, INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    // Prisma 7: строка подключения больше не берётся из schema.prisma —
    // рантайм-клиент подключается к БД через driver adapter (node-postgres).
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>("database.url"),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log("Prisma подключён к базе данных");
  }

  async onModuleDestroy() {
    // Prisma 7: закрываем пул соединений node-postgres из driver adapter,
    // иначе он остаётся висеть после app.close() (открытый handle в тестах).
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on("beforeExit", () => {
      void app.close();
    });
  }
}
