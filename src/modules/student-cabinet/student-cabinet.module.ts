import { Module } from "@nestjs/common";
import { StudentCabinetController } from "./student-cabinet.controller";
import { StudentCabinetService } from "./student-cabinet.service";
import { StudentCabinetRepository } from "./student-cabinet.repository";

@Module({
  controllers: [StudentCabinetController],
  providers: [StudentCabinetService, StudentCabinetRepository],
})
export class StudentCabinetModule {}
