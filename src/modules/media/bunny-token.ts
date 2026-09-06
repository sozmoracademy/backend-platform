import { createHash } from "node:crypto";

/**
 * Чистая криптография Bunny Stream — вынесена из `BunnyStreamService`, чтобы
 * форматы подписей (Bunny периодически правит `token_path` / порядок байт в
 * CDN Token Authentication) чинились в одном месте и покрывались unit-тестами
 * без сети. Сверять с актуальной страницей Bunny «CDN Token Authentication».
 */

export interface TusUploadSignature {
  /** Заголовок `AuthorizationSignature` для TUS-загрузки. */
  signature: string;
  /** Unix-секунды: `AuthorizationExpire`. */
  expire: number;
}

/**
 * Подпись для прямой TUS-загрузки из браузера:
 * `sha256(libraryId + apiKey + expire + videoId)` (hex).
 * API-ключ так на фронт не попадает — уходит только производный хэш.
 */
export function tusUploadSignature(
  params: { libraryId: number; apiKey: string; videoId: string },
  ttlSec = 3 * 3600,
  now: number = Date.now(),
): TusUploadSignature {
  const expire = Math.floor(now / 1000) + ttlSec;
  const signature = createHash("sha256")
    .update(`${params.libraryId}${params.apiKey}${expire}${params.videoId}`)
    .digest("hex");
  return { signature, expire };
}

/** base64url без паддинга — формат токена CDN Token Authentication у Bunny. */
function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\n/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Подписанный HLS-URL для Bunny Stream — directory-token в ФОРМАТЕ ПУТИ:
 *
 *   https://<host>/bcdn_token=<token>&expires=<e>&token_path=<enc(tp)>/<videoId>/playlist.m3u8
 *
 * Токен (v1-алгоритм CDN Token Authentication): `base64url(sha256(tokenKey +
 * token_path + expires + "token_path=" + token_path))`, где последний блок —
 * отсортированный `parameter_data` с НЕ-URL-кодированным значением. Сверено байт
 * в байт с токеном встроенного плеера Bunny (iframe.mediadelivery.net).
 *
 * Почему префикс в пути, а не `?token=...`: hls.js (и нативный HLS в Safari)
 * резолвят относительные ссылки на `<res>/video.m3u8` и `.ts` через
 * `new URL(rel, base)` — сегмент пути `bcdn_token=.../` при этом сохраняется
 * автоматически, поэтому один токен покрывает все дочерние запросы БЕЗ кастомного
 * лоадера. `token_path=/<videoId>/` задаёт зону действия токена. Живёт `ttlSec` с.
 */
export function signedPlaylistUrl(
  params: { cdnHostname: string; tokenKey: string; videoId: string },
  ttlSec: number,
  now: number = Date.now(),
): string {
  const expires = Math.floor(now / 1000) + ttlSec;
  const tokenPath = `/${params.videoId}/`;
  const token = base64Url(
    createHash("sha256")
      .update(`${params.tokenKey}${tokenPath}${expires}token_path=${tokenPath}`)
      .digest(),
  );
  const prefix = `bcdn_token=${token}&expires=${expires}&token_path=${encodeURIComponent(tokenPath)}`;
  return `https://${params.cdnHostname}/${prefix}/${params.videoId}/playlist.m3u8`;
}

export type VideoStatusValue = "none" | "processing" | "ready" | "failed";

/**
 * Числовой `Status` из webhook Bunny → наш конечный автомат.
 * 0 Queued · 1 Processing · 2 Encoding · 3 Finished · 4 ResolutionFinished ·
 * 5 Failed · 6 PresignedUploadStarted. «Готово» — от 3 и не 5.
 */
export function mapWebhookStatus(status: number): VideoStatusValue {
  if (status === 5) return "failed";
  if (status >= 3) return "ready";
  return "processing";
}
