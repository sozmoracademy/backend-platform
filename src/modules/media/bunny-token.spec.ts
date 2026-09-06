import { createHash } from "node:crypto";
import { mapWebhookStatus, signedPlaylistUrl, tusUploadSignature } from "./bunny-token";
import { parseBunnyWebhook } from "./dto/bunny-webhook.dto";

const NOW = 1_700_000_000_000; // фиксированное «сейчас» в мс

describe("tusUploadSignature", () => {
  it("подписывает sha256(libraryId + apiKey + expire + videoId) в hex", () => {
    const { signature, expire } = tusUploadSignature(
      { libraryId: 123, apiKey: "secret", videoId: "vid-1" },
      3600,
      NOW,
    );
    expect(expire).toBe(Math.floor(NOW / 1000) + 3600);
    const expected = createHash("sha256").update(`123secret${expire}vid-1`).digest("hex");
    expect(signature).toBe(expected);
  });

  it("expire сдвигается вместе с ttl", () => {
    const a = tusUploadSignature({ libraryId: 1, apiKey: "k", videoId: "v" }, 100, NOW);
    const b = tusUploadSignature({ libraryId: 1, apiKey: "k", videoId: "v" }, 200, NOW);
    expect(b.expire - a.expire).toBe(100);
    expect(a.signature).not.toBe(b.signature);
  });
});

describe("signedPlaylistUrl", () => {
  it("строит directory-token URL в формате пути (bcdn_token в префиксе)", () => {
    const url = signedPlaylistUrl(
      { cdnHostname: "vz-x.b-cdn.net", tokenKey: "tk", videoId: "abc" },
      21600,
      NOW,
    );
    const expires = Math.floor(NOW / 1000) + 21600;
    // Bunny v1 directory-token: sha256(key + token_path + expires + "token_path=" + token_path)
    const rawToken = createHash("sha256")
      .update(`tk/abc/${expires}token_path=/abc/`)
      .digest("base64");
    const token = rawToken.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    expect(url).toBe(
      `https://vz-x.b-cdn.net/bcdn_token=${token}&expires=${expires}` +
        `&token_path=${encodeURIComponent("/abc/")}/abc/playlist.m3u8`,
    );
  });

  it("совпадает с токеном, который сгенерил встроенный плеер Bunny", () => {
    // Зафиксированный реальный вектор: videoId + expires + token из iframe.mediadelivery.net.
    const url = signedPlaylistUrl(
      {
        cdnHostname: "vz-b34b5ad0-adc.b-cdn.net",
        tokenKey: "7e5d05a8-cea9-4140-9cb2-26930c6d50f3",
        videoId: "e26654db-6485-459b-8d4c-c1c1a0fdbc2b",
      },
      0,
      1788757772_000,
    );
    expect(url).toContain("bcdn_token=YUmnwRjp816AEGsk86vTI5JlW4ZOAPYDZgmZJIq7Pmo&");
    expect(url.endsWith("/e26654db-6485-459b-8d4c-c1c1a0fdbc2b/playlist.m3u8")).toBe(true);
  });

  it("token base64url-безопасен (без + / =)", () => {
    const url = signedPlaylistUrl(
      { cdnHostname: "h", tokenKey: "tk", videoId: "v" },
      60,
      NOW,
    );
    const token = url.match(/bcdn_token=([^&]+)&/)![1];
    expect(token).not.toMatch(/[+/=]/);
  });

  it("через playbackTtl секунд ссылка «протухает» — expires в прошлом при следующей проверке", () => {
    const url = signedPlaylistUrl({ cdnHostname: "h", tokenKey: "tk", videoId: "v" }, 6 * 3600, NOW);
    const expires = Number(url.match(/&expires=(\d+)&/)![1]);
    expect(expires * 1000).toBeGreaterThan(NOW);
    expect(expires * 1000).toBeLessThan(NOW + 7 * 3600 * 1000);
  });
});

describe("parseBunnyWebhook", () => {
  it("извлекает VideoGuid/Status и игнорирует лишние поля Bunny", () => {
    expect(parseBunnyWebhook({ VideoGuid: "abc", Status: 3, VideoLibraryId: 745530 })).toEqual({
      videoGuid: "abc",
      status: 3,
    });
  });

  it.each([
    null,
    "not-json",
    {},
    { VideoGuid: "abc" },
    { Status: 3 },
    { VideoGuid: "", Status: 3 },
    { VideoGuid: "abc", Status: "3" },
  ])("отбраковывает некорректное тело %p", (body) => {
    expect(parseBunnyWebhook(body)).toBeNull();
  });
});

describe("mapWebhookStatus", () => {
  it.each([
    [0, "processing"],
    [1, "processing"],
    [2, "processing"],
    [3, "ready"],
    [4, "ready"],
    [5, "failed"],
  ] as const)("Status %i → %s", (input, expected) => {
    expect(mapWebhookStatus(input)).toBe(expected);
  });
});
