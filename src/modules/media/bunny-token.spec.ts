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
  it("строит URL с token / expires / token_path", () => {
    const url = signedPlaylistUrl(
      { cdnHostname: "vz-x.b-cdn.net", tokenKey: "tk", videoId: "abc" },
      21600,
      NOW,
    );
    const expires = Math.floor(NOW / 1000) + 21600;
    const rawToken = createHash("sha256").update(`tk/abc/${expires}`).digest("base64");
    const token = rawToken.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    expect(url).toBe(
      `https://vz-x.b-cdn.net/abc/playlist.m3u8?token=${token}&expires=${expires}` +
        `&token_path=${encodeURIComponent("/abc/")}`,
    );
  });

  it("token base64url-безопасен (без + / =)", () => {
    const url = signedPlaylistUrl(
      { cdnHostname: "h", tokenKey: "tk", videoId: "v" },
      60,
      NOW,
    );
    const token = new URL(url).searchParams.get("token")!;
    expect(token).not.toMatch(/[+/=]/);
  });

  it("через playbackTtl секунд ссылка «протухает» — expires в прошлом при следующей проверке", () => {
    const url = signedPlaylistUrl({ cdnHostname: "h", tokenKey: "tk", videoId: "v" }, 6 * 3600, NOW);
    const expires = Number(new URL(url).searchParams.get("expires"));
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
