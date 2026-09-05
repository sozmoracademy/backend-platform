import { ApiProperty } from "@nestjs/swagger";
import type { CourseType, Lang } from "@prisma/client";
import type { CefrLevel } from "../../../common/domain";

export class CourseLevelPlanEntryDto {
  @ApiProperty() month!: number;
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
}

export class CourseProductDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) format!: CourseType;
  @ApiProperty() title!: string;
  @ApiProperty() durationMonths!: number;
  @ApiProperty() price!: number;
  @ApiProperty() currency!: string;
  @ApiProperty({ type: [String] }) features!: string[];
  @ApiProperty({ type: [CourseLevelPlanEntryDto] }) levelPlan!: CourseLevelPlanEntryDto[];
}

export class CourseBlockDto {
  @ApiProperty() block!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ enum: ["A1", "A2", "B1", "B2"] }) level!: CefrLevel;
  @ApiProperty() month!: number;
}
