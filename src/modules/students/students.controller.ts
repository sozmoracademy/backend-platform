import { Body, Controller, Get, Header, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { OpenCloseLessonRequestDto } from "../../common/dto/open-close-lesson.dto";
import { StudentsService } from "./students.service";
import {
  BulkUpdateStudentsRequestDto,
  CreateStudentRequestDto,
  CreateStudentResponseDto,
  StudentHeaderDto,
  StudentLearningDto,
  StudentOverviewDto,
  StudentPracticeDto,
  StudentProgressDto,
  StudentsListDto,
  StudentsQueryDto,
  UpdateStudentAccessRequestDto,
  UpdateStudentGroupRequestDto,
  UpdateStudentRequestDto,
} from "./dto/student.dto";

/** `students` — роль curator (BACKEND.md §12). */
@ApiTags("students")
@Roles("CURATOR")
@Controller("students")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query() query: StudentsQueryDto): Promise<StudentsListDto> {
    return this.students.list(query);
  }

  @Post()
  create(@Body() body: CreateStudentRequestDto): Promise<CreateStudentResponseDto> {
    return this.students.create(body);
  }

  @Post("bulk")
  bulk(@Body() body: BulkUpdateStudentsRequestDto): Promise<{ updated: number }> {
    return this.students.bulk(body);
  }

  @Get("export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="students.csv"')
  export(@Query() query: StudentsQueryDto): Promise<string> {
    return this.students.exportCsv(query);
  }

  @Get(":id")
  header(@Param() params: IdParamDto): Promise<StudentHeaderDto> {
    return this.students.header(params.id);
  }

  @Get(":id/overview")
  overview(@Param() params: IdParamDto): Promise<StudentOverviewDto> {
    return this.students.overview(params.id);
  }

  @Get(":id/learning")
  learning(@Param() params: IdParamDto): Promise<StudentLearningDto> {
    return this.students.learning(params.id);
  }

  @Get(":id/practice")
  practice(@Param() params: IdParamDto): Promise<StudentPracticeDto> {
    return this.students.practice(params.id);
  }

  @Get(":id/progress")
  progress(@Param() params: IdParamDto): Promise<StudentProgressDto> {
    return this.students.progress(params.id);
  }

  @Patch(":id")
  updateContact(
    @Param() params: IdParamDto,
    @Body() body: UpdateStudentRequestDto,
  ): Promise<StudentHeaderDto> {
    return this.students.updateContact(params.id, body);
  }

  @Patch(":id/access")
  updateAccess(
    @Param() params: IdParamDto,
    @Body() body: UpdateStudentAccessRequestDto,
  ): Promise<StudentHeaderDto> {
    return this.students.updateAccess(params.id, body);
  }

  @Patch(":id/group")
  updateGroup(
    @Param() params: IdParamDto,
    @Body() body: UpdateStudentGroupRequestDto,
  ): Promise<StudentHeaderDto> {
    return this.students.updateGroup(params.id, body);
  }

  @Post(":id/open-lesson")
  openLesson(
    @Param() params: IdParamDto,
    @Body() body: OpenCloseLessonRequestDto,
  ): Promise<StudentHeaderDto> {
    return this.students.openLesson(params.id, body.order);
  }

  @Post(":id/close-lesson")
  closeLesson(
    @Param() params: IdParamDto,
    @Body() body: OpenCloseLessonRequestDto,
  ): Promise<StudentHeaderDto> {
    return this.students.closeLesson(params.id, body.order);
  }
}
