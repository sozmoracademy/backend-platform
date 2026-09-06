import { Module } from "@nestjs/common";
import { MeTestsController } from "./me-tests.controller";
import { TestsEditorController } from "./tests-editor.controller";
import { TestsService } from "./tests.service";
import { TestsEditorService } from "./tests-editor.service";
import { TestsRepository } from "./tests.repository";
import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [CoursesModule],
  controllers: [MeTestsController, TestsEditorController],
  providers: [TestsService, TestsEditorService, TestsRepository],
  exports: [TestsService, TestsRepository],
})
export class TestsModule {}
