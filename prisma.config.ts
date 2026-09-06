// Prisma 7 больше не читает `url` из блока `datasource` в schema.prisma и не
// подхватывает `.env` автоматически. Строку подключения для CLI (`migrate`,
// `db push`, `db execute`, `introspect`) задаём здесь; рантайм-клиент получает
// её через driver adapter (см. src/infra/prisma/prisma.service.ts).
//
// `.env` грузим сами. `dotenv` НЕ переопределяет уже выставленные переменные,
// поэтому e2e-прогон (test/global-setup.js прокидывает DATABASE_URL от .env.test
// в дочерний процесс `prisma migrate deploy`) продолжает работать с тестовой БД.
import { join } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: join(__dirname, ".env") });

export default defineConfig({
  schema: join("prisma", "schema.prisma"),
  migrations: {
    path: join("prisma", "migrations"),
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
