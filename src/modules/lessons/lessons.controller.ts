import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { ProductOrderParamDto, ProductParamDto } from "../../common/dto/product-order-param.dto";
import { LessonsService } from "./lessons.service";
import { CreateLessonRequestDto } from "./dto/create-lesson.dto";
import { LessonCatalogItemDto } from "./dto/lesson-catalog-item.dto";
import { LessonEditorDto, UpdateLessonRequestDto } from "./dto/lesson-editor.dto";
import { VideoUploadTicketDto } from "./dto/video-upload-ticket.dto";

/**
 * `courses/products/:productId/lessons` — каталог доступен обеим ролям, редактор
 * (+статистика) и PATCH — только curator (BACKEND.md §2.3, §12). Каждый продукт
 * (язык × формат × длительность) имеет свой независимый набор уроков.
 */
@ApiTags("lessons")
@Controller("courses/products/:productId/lessons")
export class LessonsController {
  constructor(private readonly lessons: LessonsService) {}

  @Get()
  catalog(@Param() params: ProductParamDto): Promise<LessonCatalogItemDto[]> {
    return this.lessons.catalog(params.productId);
  }

  // Урок добавляется в конец набора продукта — `order` присваивает сервер
  // (TЗ §15 п.9). Массового создания нет: один запрос — один урок.
  @Roles("CURATOR")
  @Post()
  create(@Param() params: ProductParamDto, @Body() body: CreateLessonRequestDto): Promise<LessonEditorDto> {
    return this.lessons.create(params.productId, body);
  }

  @Roles("CURATOR")
  @Get(":order")
  editor(@Param() params: ProductOrderParamDto): Promise<LessonEditorDto> {
    return this.lessons.editor(params.productId, params.order);
  }

  // Разрешение на прямую TUS-заливку видео в Bunny — файл на бэкенд не идёт.
  @Roles("CURATOR")
  @Post(":order/video/upload")
  requestVideoUpload(@Param() params: ProductOrderParamDto): Promise<VideoUploadTicketDto> {
    return this.lessons.requestVideoUpload(params.productId, params.order);
  }

  @Roles("CURATOR")
  @Patch(":order")
  update(
    @Param() params: ProductOrderParamDto,
    @Body() body: UpdateLessonRequestDto,
  ): Promise<LessonEditorDto> {
    return this.lessons.update(params.productId, params.order, body);
  }

  @Roles("CURATOR")
  @Delete(":order")
  @HttpCode(204)
  remove(@Param() params: ProductOrderParamDto): Promise<void> {
    return this.lessons.remove(params.productId, params.order);
  }
}
