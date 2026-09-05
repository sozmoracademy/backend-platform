import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { OrderParamDto } from "../../common/dto/order-param.dto";
import { LessonsService } from "./lessons.service";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";
import { LessonEditorDto, UpdateLessonRequestDto } from "./dto/lesson-editor.dto";

/** `lessons` — каталог доступен обеим ролям, редактор (+статистика) и PATCH — только curator (BACKEND.md §2.3, §12). */
@ApiTags("lessons")
@Controller("lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  catalog(): Promise<LessonCatalogItemDto[]> {
    return this.lessons.catalog();
  }

  @Roles("CURATOR")
  @Get(":order")
  editor(@Param() params: OrderParamDto): Promise<LessonEditorDto> {
    return this.lessons.editor(params.order);
  }

  @Roles("CURATOR")
  @Patch(":order")
  update(@Param() params: OrderParamDto, @Body() body: UpdateLessonRequestDto): Promise<LessonEditorDto> {
    return this.lessons.update(params.order, body);
  }
}
