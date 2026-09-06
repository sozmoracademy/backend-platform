import { Module } from "@nestjs/common";
import { CoursesController } from "./courses.controller";
import { CoursesService } from "./courses.service";
import { CourseResolverService } from "./course-resolver.service";

@Module({
  controllers: [CoursesController],
  providers: [CoursesService, CourseResolverService],
  exports: [CoursesService, CourseResolverService],
})
export class CoursesModule {}
