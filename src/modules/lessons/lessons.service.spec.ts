import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Lesson, VideoStatus } from "@prisma/client";
import { LessonsService } from "./lessons.service";
import type { LessonsRepository } from "./lessons.repository";
import type { CourseResolverService } from "../courses/course-resolver.service";
import type { BunnyStreamService } from "../media/bunny-stream.service";
import type { MediaService } from "../media/media.service";
import type { PrismaService } from "../../infra/prisma/prisma.service";

/** Минимальный `Lesson` для юнита `linkVideoFrom` — только скалярные поля. */
function lesson(over: Partial<Lesson>): Lesson {
  return {
    id: "l-target",
    courseProductId: "en-group-6mo",
    order: 3,
    title: "Target lesson",
    description: "",
    videoUrl: "https://cdn/fallback.mp4",
    videoAssetId: null,
    videoStatus: "none",
    videoDurationSec: null,
    duration: "00:00",
    block: "m1",
    ...over,
  } as unknown as Lesson;
}

describe("LessonsService.linkVideoFrom", () => {
  const body = { sourceProductId: "en-group-3mo", sourceOrder: 5 };

  let repo: {
    findByOrder: jest.Mock;
    update: jest.Mock;
    countOpened: jest.Mock;
    countCompleted: jest.Mock;
    countInProgress: jest.Mock;
  };
  let resolver: { byId: jest.Mock };
  let bunny: { signedPlaylistUrl: jest.Mock };
  let service: LessonsService;

  beforeEach(() => {
    repo = {
      findByOrder: jest.fn(),
      update: jest.fn(),
      countOpened: jest.fn().mockResolvedValue(0),
      countCompleted: jest.fn().mockResolvedValue(0),
      countInProgress: jest.fn().mockResolvedValue(0),
    };
    resolver = {
      byId: jest.fn().mockResolvedValue({ id: "en-group-6mo", language: "en", format: "GROUP" }),
    };
    bunny = { signedPlaylistUrl: jest.fn().mockReturnValue("https://cdn/signed.m3u8") };
    service = new LessonsService(
      repo as unknown as LessonsRepository,
      resolver as unknown as CourseResolverService,
      bunny as unknown as BunnyStreamService,
      {} as MediaService,
      {} as PrismaService,
    );
  });

  it("копирует весь видеоблок урока-донора в целевой урок, Bunny не трогает", async () => {
    const target = lesson({ id: "l-target" });
    const source = lesson({
      id: "l-source",
      courseProductId: "en-group-3mo",
      order: 5,
      videoAssetId: "bunny-guid-1",
      videoStatus: "ready",
      videoDurationSec: 742,
      duration: "12:22",
      videoUrl: "https://cdn/source-fallback.mp4",
    });
    repo.findByOrder.mockResolvedValueOnce(target).mockResolvedValueOnce(source);
    repo.update.mockResolvedValue(
      lesson({
        id: "l-target",
        videoAssetId: "bunny-guid-1",
        videoStatus: "ready",
        videoDurationSec: 742,
        duration: "12:22",
        videoUrl: "https://cdn/source-fallback.mp4",
      }),
    );

    const dto = await service.linkVideoFrom("en-group-6mo", 3, body);

    expect(repo.update).toHaveBeenCalledWith("en-group-6mo", 3, {
      videoAssetId: "bunny-guid-1",
      videoStatus: "ready",
      videoDurationSec: 742,
      duration: "12:22",
      videoUrl: "https://cdn/source-fallback.mp4",
    });
    // ready → в редакторе отдаётся подписанный Bunny-HLS, а не fallback.
    expect(dto.videoUrl).toBe("https://cdn/signed.m3u8");
    expect(dto.videoStatus).toBe("ready");
    expect(dto.duration).toBe("12:22");
  });

  it("404, если целевой урок не найден (repo.update не вызывается)", async () => {
    repo.findByOrder.mockResolvedValueOnce(null);
    await expect(service.linkVideoFrom("en-group-6mo", 999, body)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("404, если урок-донор не найден", async () => {
    repo.findByOrder.mockResolvedValueOnce(lesson({ id: "l-target" })).mockResolvedValueOnce(null);
    await expect(service.linkVideoFrom("en-group-6mo", 3, body)).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("400 при попытке привязать урок к самому себе", async () => {
    const same = lesson({ id: "l-same", videoAssetId: "g", videoStatus: "ready" });
    repo.findByOrder.mockResolvedValueOnce(same).mockResolvedValueOnce(same);
    await expect(service.linkVideoFrom("en-group-6mo", 3, body)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it.each(["none", "failed"] as VideoStatus[])("400, если у донора видео в статусе %s", async (status) => {
    repo.findByOrder.mockResolvedValueOnce(lesson({ id: "l-target" })).mockResolvedValueOnce(
      lesson({
        id: "l-source",
        videoAssetId: status === "failed" ? "g" : null,
        videoStatus: status,
      }),
    );
    await expect(service.linkVideoFrom("en-group-6mo", 3, body)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("привязывает донора со статусом processing — webhook догонит оба урока", async () => {
    repo.findByOrder
      .mockResolvedValueOnce(lesson({ id: "l-target" }))
      .mockResolvedValueOnce(lesson({ id: "l-source", videoAssetId: "g2", videoStatus: "processing" }));
    repo.update.mockResolvedValue(lesson({ id: "l-target", videoAssetId: "g2", videoStatus: "processing" }));

    const dto = await service.linkVideoFrom("en-group-6mo", 3, body);

    expect(dto.videoStatus).toBe("processing");
    expect(bunny.signedPlaylistUrl).not.toHaveBeenCalled();
  });
});
