import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsEnum, IsIn, IsOptional, IsString, MinLength } from "class-validator";
import type { Lang, TeacherStatus } from "@prisma/client";
import type { CefrLevel } from "../../../common/domain";
import type { GroupStatus } from "@prisma/client";

export class TeacherOptionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: [String], enum: ["en", "ru"] }) languages!: Lang[];
  @ApiProperty({ enum: ["active", "absent", "replacement"] }) status!: TeacherStatus;
  @ApiProperty() name!: string;
}

export class TeacherListItemDto extends TeacherOptionDto {
  @ApiProperty() phone!: string;
  @ApiProperty() tone!: string;
  @ApiProperty() groupsCount!: number;
  @ApiProperty() studentsCount!: number;
  @ApiProperty({ nullable: true }) nextPracticeDate!: string | null;
}

export class TeachersSummaryDto {
  @ApiProperty() active!: number;
  @ApiProperty() absent!: number;
  @ApiProperty() replacement!: number;
  @ApiProperty() practicesToday!: number;
}

export class TeachersListDto {
  @ApiProperty({ type: [TeacherListItemDto] }) items!: TeacherListItemDto[];
  @ApiProperty({ type: TeachersSummaryDto }) summary!: TeachersSummaryDto;
}

export class TeacherGroupDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["recruiting", "active", "finished", "archived"] }) status!: GroupStatus;
  @ApiProperty() practiceStart!: string;
  @ApiProperty() practiceEnd!: string;
  @ApiProperty() studentCount!: number;
  @ApiProperty() maxStudents!: number;
  @ApiProperty() month!: number;
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
}

export class TeacherIndividualStudentDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
}

export class TeacherStatsDto {
  @ApiProperty() groupsCount!: number;
  @ApiProperty() groupStudents!: number;
  @ApiProperty() individualsCount!: number;
  @ApiProperty() practicesToday!: number;
}

export class TeacherDetailDto extends TeacherOptionDto {
  @ApiProperty() phone!: string;
  @ApiProperty() tone!: string;
  @ApiProperty({ type: TeacherStatsDto }) stats!: TeacherStatsDto;
  @ApiProperty({ type: [TeacherGroupDto] }) groups!: TeacherGroupDto[];
  @ApiProperty({ type: [TeacherIndividualStudentDto] }) individuals!: TeacherIndividualStudentDto[];
}

export class CreateTeacherRequestDto {
  @ApiProperty() @IsString() @MinLength(1) name!: string;
  @ApiProperty() @IsString() phone!: string;
  @ApiProperty({ type: [String], enum: ["en", "ru"] })
  @IsArray()
  @IsIn(["en", "ru"], { each: true })
  languages!: Lang[];
}

export class UpdateTeacherRequestDto {
  @ApiProperty({ required: false, enum: ["active", "absent", "replacement"] })
  @IsOptional()
  @IsEnum(["active", "absent", "replacement"])
  status?: TeacherStatus;

  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;

  @ApiProperty({ required: false, type: [String], enum: ["en", "ru"] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(["en", "ru"], { each: true })
  languages?: Lang[];
}
