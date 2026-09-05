import { Body, Controller, ForbiddenException, Get, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { LessonOrderParamDto } from "./dto/lesson-order-param.dto";
import { StudentCabinetService } from "./student-cabinet.service";
import {
  LessonDetailDto,
  LessonListItemDto,
  MeCourseDto,
  MeDashboardDto,
  MeProfileDto,
  MeScheduleDayDto,
  WatchProgressRequestDto,
  WatchProgressResponseDto,
} from "./dto/me.dto";

/**
 * `/me/*` — роль student (BACKEND.md §2.3). `studentId` берётся ТОЛЬКО из токена
 * (`@CurrentUser()`), никогда из параметра пути — исключает IDOR (TЗ §3.3).
 */
@ApiTags("student-cabinet")
@Roles("STUDENT")
@Controller("me")
export class StudentCabinetController {
  constructor(private readonly cabinet: StudentCabinetService) {}

  private studentId(user: CurrentUserPayload): string {
    if (!user.studentId) throw new ForbiddenException("Профиль ученика не найден");
    return user.studentId;
  }

  @Get("dashboard")
  dashboard(@CurrentUser() user: CurrentUserPayload): Promise<MeDashboardDto> {
    return this.cabinet.dashboard(this.studentId(user));
  }

  @Get("course")
  course(@CurrentUser() user: CurrentUserPayload): Promise<MeCourseDto> {
    return this.cabinet.course(this.studentId(user));
  }

  @Get("lessons")
  lessons(@CurrentUser() user: CurrentUserPayload): Promise<LessonListItemDto[]> {
    return this.cabinet.lessons(this.studentId(user));
  }

  @Get("lessons/:order")
  lessonDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: LessonOrderParamDto,
  ): Promise<LessonDetailDto> {
    return this.cabinet.lessonDetail(this.studentId(user), params.order);
  }

  @Post("lessons/:order/watch")
  watch(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: LessonOrderParamDto,
    @Body() body: WatchProgressRequestDto,
  ): Promise<WatchProgressResponseDto> {
    return this.cabinet.watch(this.studentId(user), params.order, body.pct);
  }

  @Get("schedule")
  schedule(@CurrentUser() user: CurrentUserPayload): Promise<MeScheduleDayDto[]> {
    return this.cabinet.schedule(this.studentId(user));
  }

  @Get("profile")
  profile(@CurrentUser() user: CurrentUserPayload): Promise<MeProfileDto> {
    return this.cabinet.profile(this.studentId(user));
  }
}
