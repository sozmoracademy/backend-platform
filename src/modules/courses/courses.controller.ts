import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CoursesService } from "./courses.service";
import { CourseBlockDto, CourseProductDto } from "./dto/course-product.dto";

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
}
