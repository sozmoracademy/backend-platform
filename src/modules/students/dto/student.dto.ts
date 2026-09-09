import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type { AccessStatus, CourseType, Lang, MeetingStatus } from "@prisma/client";

export type PaymentStatusDto = "full" | "partial" | "unpaid";

export class PaymentInfoDto {
  @ApiProperty({ enum: ["full", "partial", "unpaid"] }) status!: PaymentStatusDto;
  @ApiProperty() paid!: number;
  @ApiProperty() total!: number;
  @ApiProperty() currency!: string;
  @ApiProperty() remaining!: number;
  @ApiProperty() purchaseDate!: string;
}

export class StudentListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty() login!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) type!: CourseType;
  @ApiProperty() productTitle!: string;
  @ApiProperty({ nullable: true }) groupCode!: string | null;
  @ApiProperty({ nullable: true }) groupName!: string | null;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty() currentLessonOrder!: number;
  @ApiProperty() lessonsTotal!: number;
  @ApiProperty() progressPct!: number;
  @ApiProperty({ type: PaymentInfoDto }) payment!: PaymentInfoDto;
  @ApiProperty() lastActivity!: string;
  @ApiProperty({ enum: ["active", "expired", "disabled"] }) accessStatus!: AccessStatus;
}

export class StudentsListDto {
  @ApiProperty({ type: [StudentListItemDto] }) items!: StudentListItemDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class StudentsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() q?: string;
  @ApiProperty({ required: false, enum: ["all", "en", "ru"] }) @IsOptional() @IsString() language?: string;
  @ApiProperty({ required: false, enum: ["all", "GROUP", "INDIVIDUAL"] })
  @IsOptional()
  @IsString()
  type?: string;
  @ApiProperty({ required: false, enum: ["all", "active", "expired", "disabled"] })
  @IsOptional()
  @IsString()
  status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() groupId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() teacherId?: string;
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class NextMeetingPreviewDto {
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
}

export class StudentHeaderDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) type!: CourseType;
  @ApiProperty({ enum: ["active", "expired", "disabled"] }) accessStatus!: AccessStatus;
  @ApiProperty({ enum: ["active", "expired", "disabled"] }) status!: AccessStatus;
  @ApiProperty() daysLeft!: number;
  @ApiProperty() endDate!: string;
  @ApiProperty() lastActivity!: string;
  @ApiProperty() currentLessonOrder!: number;
  @ApiProperty() openedUpTo!: number;
  @ApiProperty() lessonsTotal!: number;
  @ApiProperty() progressPct!: number;
  @ApiProperty() onboarded!: boolean;
  @ApiProperty({ type: NextMeetingPreviewDto, required: false }) nextMeeting?: NextMeetingPreviewDto;
}

export class StudentOverviewGroupDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class StudentOverviewDto {
  @ApiProperty() login!: string;
  /** Пароль ученика в открытом виде для куратора; `null` — не сохранён (нужен сброс). */
  @ApiProperty({ nullable: true }) password!: string | null;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true }) age!: number | null;
  @ApiProperty() city!: string;
  @ApiProperty() managerName!: string;
  @ApiProperty() productTitle!: string;
  @ApiProperty() productPrice!: number;
  @ApiProperty() productCurrency!: string;
  @ApiProperty() startDate!: string;
  @ApiProperty() endDate!: string;
  @ApiProperty({ type: PaymentInfoDto }) payment!: PaymentInfoDto;
  @ApiProperty({ type: StudentOverviewGroupDto, nullable: true }) group!: StudentOverviewGroupDto | null;
  @ApiProperty() groupRequired!: boolean;
  @ApiProperty({ nullable: true }) teacherName!: string | null;
}

export class StudentLearningLessonTestDto {
  @ApiProperty() published!: boolean;
  /** Лучший результат ученика по тесту, % (`null` — попыток не было). */
  @ApiProperty({ nullable: true }) bestScore!: number | null;
  /** `true`/`false` по лучшей попытке; `null` — попыток не было. */
  @ApiProperty({ nullable: true }) passed!: boolean | null;
  @ApiProperty() passingScore!: number;
}

export class StudentLearningLessonDto {
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ["locked", "available", "completed"] }) state!: "locked" | "available" | "completed";
  /** Тест урока с результатом ученика; `null` — у урока нет теста. */
  @ApiProperty({ type: StudentLearningLessonTestDto, nullable: true })
  test!: StudentLearningLessonTestDto | null;
}

export class StudentLearningDto {
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: string;
  @ApiProperty() month!: number;
  @ApiProperty() currentLessonOrder!: number;
  @ApiProperty() openedUpTo!: number;
  @ApiProperty() completedCount!: number;
  @ApiProperty() testsPassed!: number;
  @ApiProperty() testsTotal!: number;
  @ApiProperty({ type: [StudentLearningLessonDto] }) lessons!: StudentLearningLessonDto[];
}

export class StudentMeetingDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() meetUrl!: string;
  @ApiProperty({ enum: ["scheduled", "completed", "cancelled"] }) status!: MeetingStatus;
  @ApiProperty({ required: false }) attended?: boolean;
}

export class StudentPracticeDto {
  @ApiProperty() total!: number;
  @ApiProperty() attended!: number;
  @ApiProperty({ required: false }) nextMeetingDate?: string;
  @ApiProperty({ type: [StudentMeetingDto] }) meetings!: StudentMeetingDto[];
}

export class StudentProgressDto {
  @ApiProperty() completedCount!: number;
  @ApiProperty() lessonsTotal!: number;
  @ApiProperty() progressPct!: number;
  @ApiProperty() testsPassed!: number;
  @ApiProperty() testsTotal!: number;
  @ApiProperty() practiceAttended!: number;
  @ApiProperty() practiceTotal!: number;
  @ApiProperty() streakDays!: number;
}

export class CreateStudentRequestDto {
  @ApiProperty() @IsString() @MinLength(1) firstName!: string;
  @ApiProperty() @IsString() @MinLength(1) lastName!: string;
  @ApiProperty({ nullable: true }) @IsOptional() age!: number | null;
  @ApiProperty() @IsString() city!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty() @IsString() @MinLength(1) login!: string;
  @ApiProperty({ description: "Пароль ученика (клиентский предпросмотр). Хранится только bcrypt-хешем." })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  password!: string;
  @ApiProperty({ enum: ["en", "ru"] }) @IsEnum(["en", "ru"]) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) @IsEnum(["GROUP", "INDIVIDUAL"]) type!: CourseType;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsString() practiceStart!: string;
  @ApiProperty({ nullable: true }) @IsOptional() @IsString() groupId!: string | null;
  @ApiProperty() @IsString() manager!: string;
  @ApiProperty({ nullable: true }) @IsOptional() @IsInt() total!: number | null;
  @ApiProperty({ nullable: true }) @IsOptional() @IsInt() paid!: number | null;
}

export class CreateStudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() login!: string;
  @ApiProperty() password!: string;
  @ApiProperty({ nullable: true }) groupName!: string | null;
  /** Телефон ученика — для приветственного сообщения куратора (копируется отдельной кнопкой). */
  @ApiProperty() phone!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  /** Длительность курса в месяцах (из продукта зачисления) — для текста сообщения. */
  @ApiProperty() durationMonths!: number;
}

export class ResetStudentPasswordResponseDto {
  @ApiProperty() login!: string;
  @ApiProperty() password!: string;
}

export class BulkPatchDto {
  @ApiProperty({ required: false, nullable: true }) @IsOptional() groupId?: string | null;
  @ApiProperty({ required: false, nullable: true }) @IsOptional() teacherId?: string | null;
  @ApiProperty({ required: false, enum: ["active", "expired", "disabled"] })
  @IsOptional()
  @IsEnum(["active", "expired", "disabled"])
  status?: AccessStatus;
}

export class BulkUpdateStudentsRequestDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @ApiProperty({ type: BulkPatchDto })
  @ValidateNested()
  @Type(() => BulkPatchDto)
  patch!: BulkPatchDto;
}

export class UpdateStudentPaymentDto {
  @ApiProperty() @IsInt() total!: number;
  @ApiProperty() @IsInt() paid!: number;
}

export class UpdateStudentRequestDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() city?: string;
  @ApiProperty({ required: false, nullable: true }) @IsOptional() age?: number | null;
  @ApiProperty({ required: false }) @IsOptional() @IsString() managerName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() onboarded?: boolean;
  @ApiProperty({ required: false, type: UpdateStudentPaymentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateStudentPaymentDto)
  payment?: UpdateStudentPaymentDto;
}

export class UpdateStudentAccessRequestDto {
  @ApiProperty({ required: false, enum: ["active", "expired", "disabled"] })
  @IsOptional()
  @IsEnum(["active", "expired", "disabled"])
  status?: AccessStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateStudentGroupRequestDto {
  @ApiProperty({ nullable: true })
  @IsOptional()
  @IsString()
  groupId!: string | null;
}
