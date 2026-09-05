import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

export class OpenCloseLessonRequestDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  order!: number;
}
