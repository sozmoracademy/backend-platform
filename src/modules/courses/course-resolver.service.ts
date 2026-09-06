import { Injectable, NotFoundException } from "@nestjs/common";
import { CourseProduct, Lang, CourseType } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

/**
 * Резолвит, каким `CourseProduct` (и, соответственно, каким набором `Lesson`)
 * пользуется конкретный актор — группа или студент. Централизует правило: GROUP —
 * через `Group.courseProductId`, INDIVIDUAL — единственный продукт на язык (BACKEND.md §4/§6).
 */
@Injectable()
export class CourseResolverService {
  constructor(private readonly prisma: PrismaService) {}

  async byId(courseProductId: string): Promise<CourseProduct> {
    const product = await this.prisma.courseProduct.findUnique({ where: { id: courseProductId } });
    if (!product) throw new NotFoundException("Продукт не найден");
    return product;
  }

  forGroup(courseProductId: string): Promise<CourseProduct> {
    return this.byId(courseProductId);
  }

  async forIndividual(language: Lang): Promise<CourseProduct> {
    const product = await this.prisma.courseProduct.findFirst({
      where: { language, format: "INDIVIDUAL" },
    });
    if (!product) throw new NotFoundException("Индивидуальный продукт не найден");
    return product;
  }

  async forStudent(student: {
    language: Lang;
    type: CourseType;
    groupId: string | null;
  }): Promise<CourseProduct> {
    if (student.type === "INDIVIDUAL") return this.forIndividual(student.language);
    if (!student.groupId) throw new NotFoundException("У группового студента не задана группа");
    const group = await this.prisma.group.findUnique({ where: { id: student.groupId } });
    if (!group) throw new NotFoundException("Группа студента не найдена");
    return this.forGroup(group.courseProductId);
  }

  lessonsFor(courseProductId: string) {
    return this.prisma.lesson.findMany({ where: { courseProductId }, orderBy: { order: "asc" } });
  }

  countLessons(courseProductId: string) {
    return this.prisma.lesson.count({ where: { courseProductId } });
  }
}
