import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { OpenCloseLessonRequestDto } from "../../common/dto/open-close-lesson.dto";
import type { GroupSummaryDto } from "../groups/dto/group.dto";
import { ProgressService } from "./progress.service";

/** `progress` — открытие/закрытие уроков по группе, роль curator (BACKEND.md §7.1, §12). */
@ApiTags("progress")
@Roles("CURATOR")
@Controller("groups")
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Post(":id/publish-lesson")
  publish(@Param() params: IdParamDto, @Body() body: OpenCloseLessonRequestDto): Promise<GroupSummaryDto> {
    return this.progress.publishForGroup(params.id, body.order);
  }

  @Post(":id/unpublish-lesson")
  unpublish(@Param() params: IdParamDto, @Body() body: OpenCloseLessonRequestDto): Promise<GroupSummaryDto> {
    return this.progress.unpublishForGroup(params.id, body.order);
  }
}
