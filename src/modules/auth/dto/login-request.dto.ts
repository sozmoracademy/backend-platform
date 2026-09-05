import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class LoginRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  login!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}
