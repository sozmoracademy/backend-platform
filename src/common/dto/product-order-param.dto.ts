import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";

/** Валидация `:productId/:order` — урок конкретного продукта (курс-каталог/редактор куратора). */
export class ProductOrderParamDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  order!: number;
}

/** Валидация `:productId` — идентификатор CourseProduct. */
export class ProductParamDto {
  @ApiProperty()
  @IsString()
  productId!: string;
}
