import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AttemptIdParamDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  id!: string;
}
