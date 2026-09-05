import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class NoteDto {
  @ApiProperty() id!: string;
  @ApiProperty() author!: string;
  @ApiProperty() content!: string;
  @ApiProperty() createdAt!: string;
}

export class AddNoteRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content!: string;
}
