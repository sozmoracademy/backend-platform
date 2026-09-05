import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

/** Валидация `:order` — номер урока (1-based), BACKEND.md §9. */
export class OrderParamDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}
