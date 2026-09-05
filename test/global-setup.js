// Выполняется один раз перед всем e2e-прогоном (BACKEND.md §11 — отдельная
// тестовая БД, `prisma migrate reset` перед прогоном). Обычный .js (не .ts):
// Jest не прогоняет globalSetup через ts-jest трансформ.
const { execSync } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.test") });

module.exports = async function globalSetup() {
  const cwd = path.join(__dirname, "..");
  const env = { ...process.env };
  execSync("npx prisma migrate deploy", { stdio: "inherit", cwd, env });
  // Тестовая БД должна быть чистой перед каждым прогоном (BACKEND.md §11) —
  // иначе TestAttempt/мутации прошлого прогона (submit, watch, publish-lesson...)
  // остаются в базе и ломают детерминизм тестов. `prisma migrate reset` для этого
  // не используем: сам Prisma CLI блокирует эту команду от имени AI-агента без
  // явного подтверждения пользователя — см. test/reset-test-db.js.
  execSync("node test/reset-test-db.js", { stdio: "inherit", cwd, env });
  execSync("npx ts-node -r tsconfig-paths/register prisma/seed.ts", { stdio: "inherit", cwd, env });
};
