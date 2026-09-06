import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MinLength } from "class-validator";

/**
 * `POST /courses/products/:productId/lessons` (роль C) — создать урок.
 * `order` присваивает сервер: `max(order у продукта) + 1` (урок всегда попадает
 * в конец набора продукта). Осознанное расширение поверх замороженного
 * референса — TЗ §15 п.9 («решить, нужен ли администратору CRUD уроков»).
 */
export class CreateLessonRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ description: "Блок программы; можно указать существующий или новый." })
  @IsString()
  @MinLength(1)
  block!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Длительность "MM:SS", по умолчанию "00:00".' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/, { message: 'duration должен быть в формате "MM:SS"' })
  duration?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  videoUrl?: string;
}
