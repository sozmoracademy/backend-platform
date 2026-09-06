import { Module } from "@nestjs/common";
import { StudentCabinetController } from "./student-cabinet.controller";
import { StudentCabinetService } from "./student-cabinet.service";
import { StudentCabinetRepository } from "./student-cabinet.repository";
import { CoursesModule } from "../courses/courses.module";
import { MediaModule } from "../media/media.module";

@Module({
  imports: [CoursesModule, MediaModule],
  controllers: [StudentCabinetController],
  providers: [StudentCabinetService, StudentCabinetRepository],
})
export class StudentCabinetModule {}
