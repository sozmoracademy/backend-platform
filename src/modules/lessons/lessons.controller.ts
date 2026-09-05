import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { LessonsService } from "./lessons.service";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";

/** `lessons` — каталог, доступен обеим ролям (BACKEND.md §2.3, §12). Редактор (PATCH + статистика) — шаг 6. */
@ApiTags("lessons")
@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  catalog(): Promise<LessonCatalogItemDto[]> {
    return this.lessons.catalog();
  }
}
