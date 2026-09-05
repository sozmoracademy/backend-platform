import type { Student, User } from "@prisma/client";
import { roleToDto } from "../../common/mappers/role.mapper";
import { AuthUserDto } from "./dto/auth-user.dto";

export function toAuthUserDto(user: User, student: Student | null): AuthUserDto {
  const dto = new AuthUserDto();
  dto.id = user.id;
  dto.role = roleToDto(user.role);
  if (user.role === "STUDENT" && student) {
    dto.student = {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      avatarTone: student.avatarTone,
      type: student.type,
      language: student.language,
    };
  } else if (user.role === "CURATOR") {
    dto.curator = { id: user.id, name: user.name ?? "Куратор" };
  }
  return dto;
}
