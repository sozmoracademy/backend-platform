import { Module } from "@nestjs/common";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";
import { LessonsRepository } from "./lessons.repository";

@Module({
  controllers: [LessonsController],
  providers: [LessonsService, LessonsRepository],
  exports: [LessonsService, LessonsRepository],
})
export class LessonsModule {}
