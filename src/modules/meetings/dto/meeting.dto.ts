import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsEnum, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { MeetingScope, MeetingStatus } from "@prisma/client";

export class MeetingAttendeeDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty() present!: boolean;
}

export class ScheduleMeetingDto {
  @ApiProperty() id!: string;
  @ApiProperty() lessonOrder!: number;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) scope!: MeetingScope;
  @ApiProperty({ nullable: true }) groupId!: string | null;
  @ApiProperty({ nullable: true }) groupName!: string | null;
  @ApiProperty({ nullable: true }) studentId!: string | null;
  @ApiProperty({ nullable: true }) studentName!: string | null;
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() meetUrl!: string;
  @ApiProperty({ enum: ["scheduled", "completed", "cancelled"] }) status!: MeetingStatus;
  @ApiProperty({ nullable: true }) teacherName!: string | null;
  @ApiProperty({ type: [MeetingAttendeeDto] }) roster!: MeetingAttendeeDto[];
}

export class MeetingsQueryDto {
  @ApiProperty({ required: false, enum: ["today", "week", "next-week"] })
  @IsOptional()
  @IsIn(["today", "week", "next-week"])
  range?: "today" | "week" | "next-week";

  @ApiProperty({ required: false }) @IsOptional() @IsDateString() from?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() to?: string;
}

export class CreateMeetingRequestDto {
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) @IsEnum(["GROUP", "INDIVIDUAL"]) scope!: MeetingScope;
  @ApiProperty({ required: false, nullable: true }) @IsOptional() @IsString() groupId?: string | null;
  @ApiProperty({ required: false, nullable: true }) @IsOptional() @IsString() studentId?: string | null;
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() startTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() endTime?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() meetUrl?: string;
}

/**
 * `POST /groups/:id/meetings` — узкая форма назначения практики с экрана группы
 * (BACKEND.md §7.5): `groupId` берётся из пути, `scope` всегда `GROUP`, время —
 * из вечернего слота группы. В теле — только дата и (опционально) разовая ссылка.
 */
export class ScheduleGroupMeetingRequestDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() meetUrl?: string;
}

export class UpdateMeetingRequestDto {
  @ApiProperty({ required: false, enum: ["scheduled", "completed", "cancelled"] })
  @IsOptional()
  @IsEnum(["scheduled", "completed", "cancelled"])
  status?: MeetingStatus;

  @ApiProperty({ required: false }) @IsOptional() @IsDateString() date?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() meetUrl?: string;
}

export class MarkAttendanceRequestDto {
  @ApiProperty() @IsString() @MinLength(1) studentId!: string;
  @ApiProperty() @IsBoolean() present!: boolean;
}
