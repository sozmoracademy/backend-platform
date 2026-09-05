import { config } from "dotenv";
import { join } from "path";

// dotenv не перезаписывает уже выставленные process.env — безопасно вызывать
// даже если переменные уже пришли из окружения CI.
config({ path: join(__dirname, "..", ".env.test") });
