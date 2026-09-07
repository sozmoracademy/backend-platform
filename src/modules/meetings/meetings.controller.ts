import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { MeetingsService } from "./meetings.service";
import {
  CreateMeetingRequestDto,
  MarkAttendanceRequestDto,
  MeetingsQueryDto,
  ScheduleGroupMeetingRequestDto,
  ScheduleMeetingDto,
  UpdateMeetingRequestDto,
} from "./dto/meeting.dto";

/** `meetings` — роль curator (BACKEND.md §7.5, §12). */
@ApiTags("meetings")
@Roles("CURATOR")
@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  list(@Query() query: MeetingsQueryDto): Promise<ScheduleMeetingDto[]> {
    return this.meetings.list(query);
  }

  @Post()
  create(@Body() body: CreateMeetingRequestDto): Promise<ScheduleMeetingDto> {
    return this.meetings.create(body);
  }

  @Patch(":id")
  update(@Param() params: IdParamDto, @Body() body: UpdateMeetingRequestDto): Promise<ScheduleMeetingDto> {
    return this.meetings.update(params.id, body);
  }

  @Patch(":id/attendance")
  markAttendance(
    @Param() params: IdParamDto,
    @Body() body: MarkAttendanceRequestDto,
  ): Promise<ScheduleMeetingDto> {
    return this.meetings.markAttendance(params.id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.meetings.remove(params.id);
  }
}

/** `groups/:id/meetings` — назначение практики с экрана группы (BACKEND.md §7.5). */
@ApiTags("meetings")
@Roles("CURATOR")
@Controller("groups/:id/meetings")
export class GroupMeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Post()
  schedule(
    @Param() params: IdParamDto,
    @Body() body: ScheduleGroupMeetingRequestDto,
  ): Promise<ScheduleMeetingDto> {
    return this.meetings.createForGroup(params.id, body);
  }
}
