import { ApiProperty } from "@nestjs/swagger";

/** `GET /courses/products/:productId/lessons` — каталог уроков одного продукта (BACKEND.md §12). */
export class LessonCatalogItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() order!: number;
  @ApiProperty() title!: string;
  @ApiProperty() block!: string;
  @ApiProperty() duration!: string;
  @ApiProperty() hasPractice!: boolean;
}
