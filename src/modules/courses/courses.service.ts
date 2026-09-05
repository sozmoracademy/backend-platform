import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { CourseBlockDto, CourseLevelPlanEntryDto, CourseProductDto } from "./dto/course-product.dto";

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async products(): Promise<CourseProductDto[]> {
    const rows = await this.prisma.courseProduct.findMany({
      orderBy: [{ language: "asc" }, { format: "asc" }],
    });
    return rows.map((p) => ({
      id: p.id,
      language: p.language,
      format: p.format,
      title: p.title,
      durationMonths: p.durationMonths,
      price: p.price,
      currency: p.currency,
      features: p.features,
      levelPlan: p.levelPlan as unknown as CourseLevelPlanEntryDto[],
    }));
  }

  async blocks(): Promise<CourseBlockDto[]> {
    const rows = await this.prisma.courseBlock.findMany({ orderBy: { month: "asc" } });
    return rows.map((b) => ({
      block: b.name,
      title: b.title,
      level: b.level as CourseBlockDto["level"],
      month: b.month,
    }));
  }
}
