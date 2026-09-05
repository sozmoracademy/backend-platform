import { Module } from "@nestjs/common";
import { TeachersController } from "./teachers.controller";
import { TeachersService } from "./teachers.service";
import { TeachersRepository } from "./teachers.repository";

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, TeachersRepository],
  exports: [TeachersService, TeachersRepository],
})
export class TeachersModule {}
