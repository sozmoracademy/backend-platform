import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { NotesService } from "./notes.service";
import { AddNoteRequestDto, NoteDto } from "./dto/note.dto";

/** `notes` — внутренние заметки куратора об ученике (BACKEND.md §12), роль curator. */
@ApiTags("notes")
@Roles("CURATOR")
@Controller()
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get("students/:id/notes")
  list(@Param() params: IdParamDto): Promise<NoteDto[]> {
    return this.notes.list(params.id);
  }

  @Post("students/:id/notes")
  add(
    @Param() params: IdParamDto,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: AddNoteRequestDto,
  ): Promise<NoteDto> {
    return this.notes.add(params.id, user.userId, body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("notes/:id")
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.notes.remove(params.id);
  }
}
