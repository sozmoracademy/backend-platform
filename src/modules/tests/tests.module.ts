import { Module } from "@nestjs/common";
import { MeTestsController } from "./me-tests.controller";
import { TestsService } from "./tests.service";
import { TestsRepository } from "./tests.repository";

@Module({
  controllers: [MeTestsController],
  providers: [TestsService, TestsRepository],
  exports: [TestsService, TestsRepository],
})
export class TestsModule {}
