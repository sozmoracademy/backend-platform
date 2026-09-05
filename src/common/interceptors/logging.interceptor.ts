import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

/** Метод, путь, статус, длительность, requestId (BACKEND.md §8) — дублирует часть того,
 * что уже логирует `nestjs-pino`, но оставлен как явный, читаемый в дев-режиме след запроса. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, originalUrl } = request;
    const start = Date.now();
    const requestId = (request.headers["x-request-id"] as string) ?? (request as unknown as { id?: string }).id;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${originalUrl} ${response.statusCode} +${duration}ms [${requestId ?? "-"}]`);
      }),
    );
  }
}
