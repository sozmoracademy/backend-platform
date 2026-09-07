import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { TeachersService } from "./teachers.service";
import {
  CreateTeacherRequestDto,
  TeacherDetailDto,
  TeacherListItemDto,
  TeachersListDto,
  UpdateTeacherRequestDto,
} from "./dto/teacher.dto";

/** `teachers` — роль curator (BACKEND.md §12). */
@ApiTags("teachers")
@Roles("CURATOR")
@Controller("teachers")
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  list(): Promise<TeachersListDto> {
    return this.teachers.list();
  }

  @Post()
  create(@Body() body: CreateTeacherRequestDto): Promise<TeacherListItemDto> {
    return this.teachers.create(body);
  }

  @Get(":id")
  detail(@Param() params: IdParamDto): Promise<TeacherDetailDto> {
    return this.teachers.detail(params.id);
  }

  @Patch(":id")
  update(@Param() params: IdParamDto, @Body() body: UpdateTeacherRequestDto): Promise<TeacherListItemDto> {
    return this.teachers.update(params.id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.teachers.remove(params.id);
  }
}
