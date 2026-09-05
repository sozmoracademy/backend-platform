import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Max, Min } from "class-validator";
import type { CourseType, Lang, MeetingStatus } from "@prisma/client";
import type { CefrLevel, LessonState, StageStatus, TestAvailability } from "../../../common/domain";

export type AccessStatusDto = "active" | "expired" | "disabled";
export type WeekPlanKindDto = "theory" | "practice" | "rest";
export type WeekPlanStatusDto = "done" | "past" | "today" | "upcoming" | "locked" | "rest";
export type DayItemKindDto = "lesson" | "test" | "practice";
export type DayItemStatusDto = "done" | "missed" | "scheduled" | "cancelled";

export class AccessInfoDto {
  @ApiProperty({ enum: ["active", "expired", "disabled"] }) status!: AccessStatusDto;
  @ApiProperty() daysLeft!: number;
}

export class LessonSummaryDto {
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() duration!: string;
}

export class LessonTestSummaryDto {
  @ApiProperty() title!: string;
  @ApiProperty() questionCount!: number;
  @ApiProperty() minutes!: number;
  @ApiProperty({ enum: ["locked", "available", "in_progress", "passed", "failed"] })
  availability!: TestAvailability;
  @ApiProperty({ required: false }) bestScore?: number;
}

export class LessonListItemDto extends LessonSummaryDto {
  @ApiProperty() block!: string;
  @ApiProperty({ enum: ["locked", "available", "completed"] }) state!: LessonState;
  @ApiProperty({ type: LessonTestSummaryDto, required: false }) test?: LessonTestSummaryDto;
}

export class LessonNeighborDto {
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
}

export class LessonDetailDto extends LessonSummaryDto {
  @ApiProperty() block!: string;
  @ApiProperty({ enum: ["locked", "available", "completed"] }) state!: LessonState;
  @ApiProperty() videoUrl!: string;
  @ApiProperty() watchedPct!: number;
  @ApiProperty({ type: LessonNeighborDto, required: false }) prev?: LessonNeighborDto;
  @ApiProperty({ type: LessonNeighborDto, required: false }) next?: LessonNeighborDto;
  @ApiProperty() nextLocked!: boolean;
  @ApiProperty({ type: LessonTestSummaryDto, required: false }) test?: LessonTestSummaryDto;
}

export class MeetingSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() meetUrl!: string;
  @ApiProperty() status!: MeetingStatus;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) type!: CourseType;
  @ApiProperty() lessonOrder!: number;
}

export class DayAgendaItemDto {
  @ApiProperty({ enum: ["lesson", "test", "practice"] }) kind!: DayItemKindDto;
  @ApiProperty({ enum: ["done", "missed", "scheduled", "cancelled"] }) status!: DayItemStatusDto;
  @ApiProperty() title!: string;
  @ApiProperty() subtitle!: string;
  @ApiProperty({ required: false }) time?: string;
  @ApiProperty({ required: false }) meetUrl?: string;
  @ApiProperty() lessonOrder!: number;
}

export class WeekAgendaDayDto {
  @ApiProperty() date!: string;
  @ApiProperty({ type: [DayAgendaItemDto] }) items!: DayAgendaItemDto[];
}

export class NextStepTestPreviewDto {
  @ApiProperty() questionCount!: number;
  @ApiProperty() minutes!: number;
}

/** Один и тот же JSON, что и дискриминированный union фронта (BACKEND.md §12 `NextStepDto`) —
 * поля, не относящиеся к `kind`, просто отсутствуют. */
export class NextStepDto {
  @ApiProperty({ enum: ["lesson", "test", "practice", "done"] }) kind!:
    "lesson" | "test" | "practice" | "done";
  @ApiProperty({ type: LessonSummaryDto, required: false }) lesson?: LessonSummaryDto;
  @ApiProperty({ type: NextStepTestPreviewDto, required: false }) test?: NextStepTestPreviewDto;
  @ApiProperty({ type: MeetingSummaryDto, required: false }) meeting?: MeetingSummaryDto;
  @ApiProperty({ type: MeetingSummaryDto, required: false }) nextMeeting?: MeetingSummaryDto;
}

export class LevelStatusDto {
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
  @ApiProperty({ enum: ["locked", "current", "completed"] }) status!: StageStatus;
}

export class DashboardProgressDto {
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
  @ApiProperty() percentInLevel!: number;
  @ApiProperty() lessonsDone!: number;
  @ApiProperty() lessonsTotal!: number;
  @ApiProperty() streakDays!: number;
  @ApiProperty() accuracyPct!: number;
  @ApiProperty() daysLeftAccess!: number;
  @ApiProperty({ type: [LevelStatusDto] }) levels!: LevelStatusDto[];
}

export class MeDashboardDto {
  @ApiProperty() firstName!: string;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) courseType!: CourseType;
  @ApiProperty({ enum: ["en", "ru"] }) learningLanguage!: Lang;
  @ApiProperty({ type: AccessInfoDto }) access!: AccessInfoDto;
  @ApiProperty({ type: [WeekAgendaDayDto] }) week!: WeekAgendaDayDto[];
  @ApiProperty({ type: LessonSummaryDto, nullable: true }) currentLesson!: LessonSummaryDto | null;
  @ApiProperty({ type: NextStepDto }) nextStep!: NextStepDto;
  @ApiProperty({ type: [MeetingSummaryDto] }) meetings!: MeetingSummaryDto[];
  @ApiProperty({ type: DashboardProgressDto }) progress!: DashboardProgressDto;
}

export class MeCourseBlockDto {
  @ApiProperty() block!: string;
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
  @ApiProperty() month!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ["locked", "current", "completed"] }) status!: StageStatus;
}

export class MeCourseDto {
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty() productTitle!: string;
  @ApiProperty() completed!: number;
  @ApiProperty() total!: number;
  @ApiProperty() currentLessonOrder!: number;
  @ApiProperty({ type: [MeCourseBlockDto] }) blocks!: MeCourseBlockDto[];
}

export class MeScheduleDayDto {
  @ApiProperty() date!: string;
  @ApiProperty() weekday!: string;
  @ApiProperty({ enum: ["theory", "practice", "rest"] }) kind!: WeekPlanKindDto;
  @ApiProperty({ enum: ["done", "past", "today", "upcoming", "locked", "rest"] }) status!: WeekPlanStatusDto;
  @ApiProperty() title!: string;
  @ApiProperty() topic!: string;
  @ApiProperty() meta!: string;
  @ApiProperty({ required: false }) meetUrl?: string;
  @ApiProperty({ required: false }) lessonOrder?: number;
}

export class MeProfileDto {
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) type!: CourseType;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ type: AccessInfoDto }) access!: AccessInfoDto;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() login!: string;
  @ApiProperty() lessonsCompleted!: number;
  @ApiProperty() lessonsTotal!: number;
  @ApiProperty() testsPassed!: number;
  @ApiProperty() testsTotal!: number;
  @ApiProperty() practiceTotal!: number;
  @ApiProperty() practiceAttended!: number;
}

export class WatchProgressRequestDto {
  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  pct!: number;
}

export class WatchProgressResponseDto {
  @ApiProperty() watchedPct!: number;
  @ApiProperty({ enum: ["locked", "available", "completed"] }) state!: LessonState;
  @ApiProperty() completedJustNow!: boolean;
}
