import { Body, Controller, Get, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CoursesService } from "./courses.service";
import {
  CourseBlockDto,
  CourseProductDto,
  PreviewVideoDto,
  SetPreviewVideoRequestDto,
} from "./dto/course-product.dto";

/** `courses` — справочники, доступны обеим ролям (BACKEND.md §2.3, §12). */
@ApiTags("courses")
@Controller("courses")
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get("products")
  products(): Promise<CourseProductDto[]> {
    return this.courses.products();
  }

  @Get("blocks")
  blocks(): Promise<CourseBlockDto[]> {
    return this.courses.blocks();
  }

  // Не входит в BACKEND.md §12 — расхождение с MSW-контрактом фронта (TЗ §4.3,
  // «тестовое видео»), см. отчёт по расхождениям в конце сессии.
  @Roles("CURATOR")
  @Get("preview-video")
  previewVideo(): Promise<PreviewVideoDto> {
    return this.courses.previewVideo();
  }

  @Roles("CURATOR")
  @Put("preview-video")
  setPreviewVideo(@Body() body: SetPreviewVideoRequestDto): Promise<PreviewVideoDto> {
    return this.courses.setPreviewVideo(body.url);
  }
}
