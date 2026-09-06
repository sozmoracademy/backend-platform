import { Module } from "@nestjs/common";
import { GroupMeetingsController, MeetingsController } from "./meetings.controller";
import { MeetingsService } from "./meetings.service";
import { MeetingsRepository } from "./meetings.repository";
import { CoursesModule } from "../courses/courses.module";

@Module({
  imports: [CoursesModule],
  controllers: [MeetingsController, GroupMeetingsController],
  providers: [MeetingsService, MeetingsRepository],
})
export class MeetingsModule {}
