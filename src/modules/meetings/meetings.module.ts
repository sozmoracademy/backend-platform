import { Module } from "@nestjs/common";
import { MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { MeetingsRepository } from "./meetings.repository";

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
