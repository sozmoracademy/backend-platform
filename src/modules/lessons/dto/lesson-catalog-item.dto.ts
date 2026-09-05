import { ApiProperty } from "@nestjs/swagger";

/** `GET /lessons` — каталог 54 уроков (BACKEND.md §12). */
export class LessonCatalogItemDto {
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty() block!: string;
  @ApiProperty() duration!: string;
  @ApiProperty() hasPractice!: boolean;
}
