import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { signedPlaylistUrl, tusUploadSignature } from "./bunny-token";

/** Данные для прямой TUS-загрузки из браузера — без API-ключа на фронте. */
export interface TusUploadTarget {
  endpoint: string;
  headers: Record<string, string>;
}

interface BunnyConfig {
  libraryId: number;
  apiKey: string;
  cdnHostname: string;
  tokenKey: string;
  webhookKey: string;
  playbackTtl: number;
}

interface BunnyVideo {
  guid: string;
  title: string;
  status: number;
  length: number;
}

/**
 * Единственное место, знающее про HTTP Bunny Stream (эндпоинты, заголовки,
 * форматы подписи). `LessonsService` и `StudentCabinetService` дёргают его через
 * узкий интерфейс — сменить видеопровайдера = переписать один этот сервис.
 */
@Injectable()
export class BunnyStreamService {
  private readonly logger = new Logger(BunnyStreamService.name);

  constructor(private readonly config: ConfigService) {}

  private get c(): BunnyConfig {
    return this.config.get<BunnyConfig>("bunny")!;
  }

  /** Создаёт запись видео в библиотеке, возвращает её guid. */
  async createVideo(title: string): Promise<string> {
    const res = await fetch(`https://video.bunnycdn.com/library/${this.c.libraryId}/videos`, {
      method: "POST",
      headers: { AccessKey: this.c.apiKey, "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      throw new Error(`Bunny createVideo ${res.status}: ${await res.text()}`);
    }
    return ((await res.json()) as BunnyVideo).guid;
  }

  /** Цель + заголовки для `tus-js-client` (заливка идёт мимо NestJS). */
  tusUpload(videoId: string): TusUploadTarget {
    const { signature, expire } = tusUploadSignature({
      libraryId: this.c.libraryId,
      apiKey: this.c.apiKey,
      videoId,
    });
    return {
      endpoint: "https://video.bunnycdn.com/tusupload",
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expire),
        LibraryId: String(this.c.libraryId),
        VideoId: videoId,
      },
    };
  }

  /** Свежий подписанный HLS-URL (живёт `playbackTtl` секунд). */
  signedPlaylistUrl(videoId: string): string {
    return signedPlaylistUrl(
      { cdnHostname: this.c.cdnHostname, tokenKey: this.c.tokenKey, videoId },
      this.c.playbackTtl,
    );
  }

  /** Длительность видео в секундах из Bunny (или null, если недоступно). */
  async getDurationSec(videoId: string): Promise<number | null> {
    try {
      const res = await fetch(
        `https://video.bunnycdn.com/library/${this.c.libraryId}/videos/${videoId}`,
        { headers: { AccessKey: this.c.apiKey } },
      );
      if (!res.ok) return null;
      const video = (await res.json()) as BunnyVideo;
      return Number.isFinite(video.length) && video.length > 0 ? Math.round(video.length) : null;
    } catch (err) {
      this.logger.warn(`Bunny getDurationSec(${videoId}) не удался: ${String(err)}`);
      return null;
    }
  }

  /** Секрет из query webhook-URL — сверяется в `MediaController`. */
  get webhookKey(): string {
    return this.c.webhookKey;
  }
}
