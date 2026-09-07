import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { GroupsService } from "./groups.service";
import {
  AssignTeacherRequestDto,
  CreateGroupRequestDto,
  GroupDetailDto,
  GroupsListDto,
  GroupsQueryDto,
  GroupSummaryDto,
  UpdateGroupRequestDto,
} from "./dto/group.dto";

/** `groups` — роль curator (BACKEND.md §12). */
@ApiTags("groups")
@Roles("CURATOR")
@Controller("groups")
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@Query() query: GroupsQueryDto): Promise<GroupsListDto> {
    return this.groups.list(query);
  }

  @Post()
  create(@Body() body: CreateGroupRequestDto): Promise<GroupSummaryDto> {
    return this.groups.create(body);
  }

  @Get(":id")
  detail(@Param() params: IdParamDto): Promise<GroupDetailDto> {
    return this.groups.detail(params.id);
  }

  @Patch(":id")
  update(@Param() params: IdParamDto, @Body() body: UpdateGroupRequestDto): Promise<GroupSummaryDto> {
    return this.groups.update(params.id, body);
  }

  @Patch(":id/teacher")
  assignTeacher(
    @Param() params: IdParamDto,
    @Body() body: AssignTeacherRequestDto,
  ): Promise<GroupSummaryDto> {
    return this.groups.assignTeacher(params.id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.groups.remove(params.id);
  }
}
