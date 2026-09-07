import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { AccessStatus, GroupStatus, Lang, MeetingStatus } from "@prisma/client";
import type { CefrLevel } from "../../../common/domain";

export class GroupSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty() courseProductId!: string;
  @ApiProperty({ enum: [3, 6] }) durationMonths!: number;
  @ApiProperty({ enum: ["recruiting", "active", "finished", "archived"] }) status!: GroupStatus;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() practiceStart!: string;
  @ApiProperty() practiceEnd!: string;
  @ApiProperty() studentCount!: number;
  @ApiProperty() maxStudents!: number;
  @ApiProperty({ nullable: true }) teacherId!: string | null;
  @ApiProperty({ nullable: true }) teacherName!: string | null;
  @ApiProperty({ nullable: true }) teacherTone!: string | null;
  @ApiProperty() hasMeetUrl!: boolean;
  @ApiProperty() month!: number;
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
  @ApiProperty() lessonOrder!: number;
}

export class GroupsByLanguageDto {
  @ApiProperty({ enum: ["en", "ru"] }) code!: Lang;
  @ApiProperty() name!: string;
  @ApiProperty() count!: number;
}

export class GroupsListDto {
  @ApiProperty({ type: [GroupSummaryDto] }) items!: GroupSummaryDto[];
  @ApiProperty({ type: [GroupsByLanguageDto] }) byLanguage!: GroupsByLanguageDto[];
}

export class GroupsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() language?: string;
}

export class GroupWeekDayDto {
  @ApiProperty() day!: string;
  @ApiProperty({ enum: ["theory", "practice", "rest"] }) kind!: "theory" | "practice" | "rest";
  @ApiProperty() time!: string;
}

export class GroupHealthDto {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() atRisk!: number;
  @ApiProperty() inactive!: number;
}

export class GroupRecentMeetingDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() meetUrl!: string;
  @ApiProperty({ enum: ["scheduled", "completed", "cancelled"] }) status!: MeetingStatus;
}

export class GroupRosterItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty() currentLessonOrder!: number;
  @ApiProperty() progressPct!: number;
  @ApiProperty() lastActivity!: string;
  @ApiProperty({ enum: ["active", "expired", "disabled"] }) accessStatus!: AccessStatus;
  @ApiProperty({ enum: ["active", "at_risk", "inactive"] }) idleBucket!: "active" | "at_risk" | "inactive";
}

export class GroupDetailDto extends GroupSummaryDto {
  @ApiProperty() topic!: string;
  @ApiProperty() currentLesson!: number;
  @ApiProperty() meetUrl!: string;
  @ApiProperty({ type: GroupHealthDto }) health!: GroupHealthDto;
  @ApiProperty({ type: [GroupWeekDayDto] }) weekSchedule!: GroupWeekDayDto[];
  @ApiProperty({ type: [GroupRecentMeetingDto] }) recentMeetings!: GroupRecentMeetingDto[];
  @ApiProperty({ type: [GroupRosterItemDto] }) roster!: GroupRosterItemDto[];
}

export class CreateGroupRequestDto {
  @ApiProperty({ enum: ["en", "ru"] }) @IsEnum(["en", "ru"]) language!: Lang;
  @ApiProperty({ enum: [3, 6] }) @IsIn([3, 6]) durationMonths!: 3 | 6;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsString() practiceStart!: string;
  @ApiProperty() @IsString() practiceEnd!: string;
  @ApiProperty({ nullable: true }) @IsOptional() @IsString() teacherId!: string | null;
  @ApiProperty() @IsInt() @Min(1) maxStudents!: number;
}

export class UpdateGroupRequestDto {
  @ApiProperty({ required: false, enum: ["recruiting", "active", "finished", "archived"] })
  @IsOptional()
  @IsEnum(["recruiting", "active", "finished", "archived"])
  status?: GroupStatus;

  @ApiProperty({ required: false }) @IsOptional() @IsString() meetUrl?: string;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxStudents?: number;
}

export class AssignTeacherRequestDto {
  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  teacherId!: string | null;
}
