import { z } from "zod";

/** Валидируется при старте (`ConfigModule.forRoot({ validate })`) — падаем, если чего-то нет. */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  ACCESS_TTL: z.string().default("15m"),
  REFRESH_TTL: z.string().default("7d"),

  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  COOKIE_DOMAIN: z.string().default("localhost"),

  SCHOOL_TZ: z.string().default("Asia/Bishkek"),
  SEED_TODAY: z.string().default("2026-08-18"),

  THROTTLE_TTL: z.coerce.number().int().positive().default(300),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(`Некорректная конфигурация окружения:\n${parsed.error.toString()}`);
  }
  return parsed.data;
}
