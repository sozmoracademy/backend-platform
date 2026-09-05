import { ApiProperty } from "@nestjs/swagger";

export class PaginatedDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  pageCount: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.pageCount = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  }
}
