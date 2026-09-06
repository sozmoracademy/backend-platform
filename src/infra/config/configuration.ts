import type { Env } from "./env.validation";

/** Раскладка `.env` по namespace'ам — `config.get('jwt.accessSecret')`. */
export default function configuration() {
  const env = process.env as unknown as Env;
  return {
    env: env.NODE_ENV,
    port: Number(env.PORT ?? 3000),
    database: {
      url: env.DATABASE_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.ACCESS_TTL ?? "15m",
      refreshTtl: env.REFRESH_TTL ?? "7d",
    },
    cors: {
      // CORS_ORIGIN — один origin или список через запятую (dev: Vite может уйти
      // с 5173 на 5174, если порт занят). Пустой список → дефолт.
      origin: (env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    },
    cookie: {
      domain: env.COOKIE_DOMAIN ?? "localhost",
    },
    credentials: {
      encKey: env.CREDENTIALS_ENC_KEY,
    },
    school: {
      tz: env.SCHOOL_TZ ?? "Asia/Bishkek",
    },
    seed: {
      today: env.SEED_TODAY ?? "2026-08-18",
    },
    throttle: {
      ttl: Number(env.THROTTLE_TTL ?? 300),
      limit: Number(env.THROTTLE_LIMIT ?? 100),
    },
    bunny: {
      libraryId: Number(env.BUNNY_STREAM_LIBRARY_ID),
      apiKey: env.BUNNY_STREAM_API_KEY,
      cdnHostname: env.BUNNY_STREAM_CDN_HOSTNAME,
      tokenKey: env.BUNNY_STREAM_TOKEN_KEY,
      webhookKey: env.BUNNY_WEBHOOK_KEY,
      playbackTtl: Number(env.BUNNY_PLAYBACK_TTL ?? 21600),
    },
  };
}

export type AppConfig = ReturnType<typeof configuration>;
