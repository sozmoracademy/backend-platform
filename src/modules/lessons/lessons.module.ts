import { Module } from "@nestjs/common";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";
import { LessonsRepository } from "./lessons.repository";
import { CoursesModule } from "../courses/courses.module";
import { MediaModule } from "../media/media.module";

@Module({
  imports: [CoursesModule, MediaModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonsRepository],
  exports: [LessonsService, LessonsRepository],
})
export class LessonsModule {}
