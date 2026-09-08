import { CoursesService } from "./courses.service";
import type { PrismaService } from "../../infra/prisma/prisma.service";

describe("CoursesService.videoLibrary", () => {
  it("отдаёт только уроки со статусом ready/processing и маппит их в плоские строки", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: "l1",
        courseProductId: "en-group-3mo",
        order: 5,
        title: "Present Simple",
        videoStatus: "ready",
        videoDurationSec: 742,
        courseProduct: {
          title: "English · 3 месяца",
          language: "en",
          format: "GROUP",
          durationMonths: 3,
        },
      },
    ]);
    const service = new CoursesService({ lesson: { findMany } } as unknown as PrismaService);

    const rows = await service.videoLibrary();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { videoAssetId: { not: null }, videoStatus: { in: ["ready", "processing"] } },
      }),
    );
    expect(rows).toEqual([
      {
        productId: "en-group-3mo",
        productTitle: "English · 3 месяца",
        language: "en",
        format: "GROUP",
        durationMonths: 3,
        lessonId: "l1",
        order: 5,
        lessonTitle: "Present Simple",
        videoStatus: "ready",
        videoDurationSec: 742,
      },
    ]);
  });
});
