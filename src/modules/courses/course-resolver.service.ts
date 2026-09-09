import { Injectable, NotFoundException } from "@nestjs/common";
import { CourseProduct, Lang, CourseType } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";

/**
 * Резолвит, каким `CourseProduct` (и, соответственно, каким набором `Lesson`)
 * пользуется конкретный актор — группа или студент. Централизует правило: GROUP —
 * через `Group.courseProductId`, INDIVIDUAL — единственный продукт на язык (BACKEND.md §4/§6).
 *
 * perf: `CourseProduct` практически неизменен (эндпоинта редактирования продукта
 * нет), а `countLessons` меняется только при создании/удалении урока. Поэтому оба
 * держим в процессной памяти с TTL — это снимает десятки повторных запросов на
 * каждый список учеников/групп. Кэш счётчика уроков явно сбрасывается из
 * `LessonsService` при create/remove (`invalidate`).
 */
@Injectable()
export class CourseResolverService {
  private static readonly TTL_MS = 5 * 60_000;
  private readonly productCache = new Map<string, { value: CourseProduct; exp: number }>();
  private readonly lessonCountCache = new Map<string, { value: number; exp: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private fresh<T>(entry: { value: T; exp: number } | undefined): T | undefined {
    return entry && entry.exp > Date.now() ? entry.value : undefined;
  }

  private rememberProduct(product: CourseProduct): CourseProduct {
    this.productCache.set(product.id, {
      value: product,
      exp: Date.now() + CourseResolverService.TTL_MS,
    });
    return product;
  }

  async byId(courseProductId: string): Promise<CourseProduct> {
    const hit = this.fresh(this.productCache.get(courseProductId));
    if (hit) return hit;
    const product = await this.prisma.courseProduct.findUnique({ where: { id: courseProductId } });
    if (!product) throw new NotFoundException("Продукт не найден");
    return this.rememberProduct(product);
  }

  forGroup(courseProductId: string): Promise<CourseProduct> {
    return this.byId(courseProductId);
  }

  async forIndividual(language: Lang): Promise<CourseProduct> {
    const key = `ind:${language}`;
    const hit = this.fresh(this.productCache.get(key));
    if (hit) return hit;
    const product = await this.prisma.courseProduct.findFirst({
      where: { language, format: "INDIVIDUAL" },
    });
    if (!product) throw new NotFoundException("Индивидуальный продукт не найден");
    this.productCache.set(key, { value: product, exp: Date.now() + CourseResolverService.TTL_MS });
    return this.rememberProduct(product);
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

  async countLessons(courseProductId: string): Promise<number> {
    const hit = this.fresh(this.lessonCountCache.get(courseProductId));
    if (hit !== undefined) return hit;
    const count = await this.prisma.lesson.count({ where: { courseProductId } });
    this.lessonCountCache.set(courseProductId, {
      value: count,
      exp: Date.now() + CourseResolverService.TTL_MS,
    });
    return count;
  }

  /** Все продукты одним запросом + прогрев кэша (для списков — без N+1 резолва по строке). */
  async allProducts(): Promise<CourseProduct[]> {
    const products = await this.prisma.courseProduct.findMany();
    for (const p of products) this.rememberProduct(p);
    return products;
  }

  /** Кол-во уроков по каждому продукту одним `groupBy` (для списков учеников/групп). */
  async lessonCountsByProduct(): Promise<Map<string, number>> {
    const rows = await this.prisma.lesson.groupBy({
      by: ["courseProductId"],
      _count: { _all: true },
    });
    const map = new Map<string, number>();
    const exp = Date.now() + CourseResolverService.TTL_MS;
    for (const r of rows) {
      map.set(r.courseProductId, r._count._all);
      this.lessonCountCache.set(r.courseProductId, { value: r._count._all, exp });
    }
    return map;
  }

  /** Сбросить кэш продукта и его счётчика уроков (вызывать при create/remove урока). */
  invalidate(courseProductId?: string): void {
    if (courseProductId) {
      this.productCache.delete(courseProductId);
      this.lessonCountCache.delete(courseProductId);
      return;
    }
    this.productCache.clear();
    this.lessonCountCache.clear();
  }
}
