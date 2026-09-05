import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class IdParamDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  id!: string;
}
