import { Body, Controller, ForbiddenException, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { OrderParamDto } from "../../common/dto/order-param.dto";
import { AttemptIdParamDto } from "./dto/attempt-id-param.dto";
import { SaveAnswerRequestDto, TestAttemptDto, TestIntroDto } from "./dto/test-attempt.dto";
import { TestsService } from "./tests.service";

/**
 * `/me/tests/*`, `/me/attempts/*` — роль student (BACKEND.md §7.3, §12).
 * `studentId` — только из токена (IDOR, TЗ §3.3).
 */
@ApiTags("student-cabinet")
@Roles("STUDENT")
@Controller("me")
export class MeTestsController {
  constructor(private readonly tests: TestsService) {}

  private studentId(user: CurrentUserPayload): string {
    if (!user.studentId) throw new ForbiddenException("Профиль ученика не найден");
    return user.studentId;
  }

  @Get("tests/:order")
  intro(@CurrentUser() user: CurrentUserPayload, @Param() params: OrderParamDto): Promise<TestIntroDto> {
    return this.tests.intro(this.studentId(user), params.order);
  }

  @Post("tests/:order/attempts")
  start(@CurrentUser() user: CurrentUserPayload, @Param() params: OrderParamDto): Promise<TestAttemptDto> {
    return this.tests.startAttempt(this.studentId(user), params.order);
  }

  @Patch("attempts/:id/answers")
  saveAnswer(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AttemptIdParamDto,
    @Body() body: SaveAnswerRequestDto,
  ): Promise<TestAttemptDto> {
    return this.tests.saveAnswer(this.studentId(user), params.id, body);
  }

  @Post("attempts/:id/submit")
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AttemptIdParamDto,
  ): Promise<TestAttemptDto> {
    return this.tests.submit(this.studentId(user), params.id);
  }

  @Get("attempts/:id")
  getAttempt(
    @CurrentUser() user: CurrentUserPayload,
    @Param() params: AttemptIdParamDto,
  ): Promise<TestAttemptDto> {
    return this.tests.getAttempt(this.studentId(user), params.id);
  }
}
