import { Module } from "@nestjs/common";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";
import { GroupsModule } from "../groups/groups.module";
import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [GroupsModule, CoursesModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
