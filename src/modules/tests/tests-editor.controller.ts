import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Roles } from "../../common/decorators/roles.decorator";
import { IdParamDto } from "../../common/dto/id-param.dto";
import { TestsEditorService } from "./tests-editor.service";
import {
  CreateTestRequestDto,
  TestEditorDto,
  UpdateOptionRequestDto,
  UpdateQuestionRequestDto,
  UpdateTestRequestDto,
} from "./dto/test-editor.dto";

/** Редактор теста — роль curator (BACKEND.md §12: `/tests`, `/questions/:id`, `/options/:id`). */
@ApiTags("tests")
@Roles("CURATOR")
@Controller()
export class TestsEditorController {
  constructor(private readonly editor: TestsEditorService) {}

  @Get("tests/lesson/:id")
  async byLessonId(@Param() params: IdParamDto, @Res() res: Response): Promise<void> {
    const test = await this.editor.byLessonId(params.id);
    // Явный JSON `null` (не пустое тело, BACKEND.md §12) — Nest иначе отдаёт `null`
    // как пустой ответ без тела, который `response.json()` на фронте не распарсит.
    res.status(HttpStatus.OK).json(test);
  }

  @Post("tests")
  create(@Body() body: CreateTestRequestDto): Promise<TestEditorDto> {
    return this.editor.create(body);
  }

  @Patch("tests/:id")
  update(@Param() params: IdParamDto, @Body() body: UpdateTestRequestDto): Promise<TestEditorDto> {
    return this.editor.update(params.id, body);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("tests/:id")
  remove(@Param() params: IdParamDto): Promise<void> {
    return this.editor.remove(params.id);
  }

  @Post("tests/:id/questions")
  addQuestion(@Param() params: IdParamDto): Promise<TestEditorDto> {
    return this.editor.addQuestion(params.id);
  }

  @Patch("questions/:id")
  updateQuestion(
    @Param() params: IdParamDto,
    @Body() body: UpdateQuestionRequestDto,
  ): Promise<TestEditorDto> {
    return this.editor.updateQuestion(params.id, body);
  }

  @Delete("questions/:id")
  removeQuestion(@Param() params: IdParamDto): Promise<TestEditorDto> {
    return this.editor.removeQuestion(params.id);
  }

  @Patch("options/:id")
  updateOption(@Param() params: IdParamDto, @Body() body: UpdateOptionRequestDto): Promise<TestEditorDto> {
    return this.editor.updateOption(params.id, body);
  }
}
