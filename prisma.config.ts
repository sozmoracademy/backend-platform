// Prisma 7 больше не читает `url` из блока `datasource` в schema.prisma и не
// подхватывает `.env` автоматически. Строку подключения для CLI (`migrate`,
// `db push`, `db execute`, `introspect`) задаём здесь; рантайм-клиент получает
// её через driver adapter (см. src/infra/prisma/prisma.service.ts).
//
// Осознанно без импорта из `prisma/config` (`defineConfig`/`env` — лишь
// type-хелперы): этот файл копируется в рантайм-образ Docker, где сам пакет
// `prisma` может отсутствовать после `npm ci --omit=dev`. Единственная внешняя
// зависимость — `dotenv` (prod, тянется через @nestjs/config).
//
// `.env` грузим сами. `dotenv` НЕ переопределяет уже выставленные переменные,
// поэтому e2e-прогон (test/global-setup.js прокидывает DATABASE_URL от .env.test
// в дочерний процесс `prisma migrate deploy`) и прод (Railway задаёт DATABASE_URL
// в окружении) продолжают работать.
import { join } from "node:path";

import { config as loadEnv } from "dotenv";

loadEnv({ path: join(__dirname, ".env") });

export default {
  schema: join("prisma", "schema.prisma"),
  migrations: {
    path: join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
