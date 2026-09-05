import { ApiProperty } from "@nestjs/swagger";
import type { CourseType, Lang } from "@prisma/client";
import type { ApiRole } from "../../../common/mappers/role.mapper";

/** Минимум, нужный кабинету ученика в шапке/сайдбаре (BACKEND.md §4, Student). */
export class StudentSelfDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty({ enum: ["GROUP", "INDIVIDUAL"] }) type!: CourseType;
  @ApiProperty({ enum: ["en", "ru"] }) language!: Lang;
}

/** Единый аккаунт куратора (TЗ §3.2) — витрина для шелла, без отдельной сущности-профиля. */
export class CuratorSelfDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ["student", "curator"] }) role!: ApiRole;
  @ApiProperty({ type: StudentSelfDto, required: false }) student?: StudentSelfDto;
  @ApiProperty({ type: CuratorSelfDto, required: false }) curator?: CuratorSelfDto;
}

export class LoginResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}

export class RefreshResponseDto {
  @ApiProperty() accessToken!: string;
}
