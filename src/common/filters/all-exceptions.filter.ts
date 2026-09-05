import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * Единый формат ошибки (BACKEND.md §8):
 * `{ statusCode, error, message, path, timestamp, requestId }`.
 * Ловит всё, что не поймал `PrismaExceptionFilter` — тот должен быть объявлен позже
 * (Nest применяет фильтры в обратном порядке регистрации, последний — первым).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = "Внутренняя ошибка сервера";
    let error = "Internal Server Error";

    if (isHttp) {
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? HttpStatus[status] ?? error;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    if (!isHttp) {
      error = "Internal Server Error";
    } else if (error === "Internal Server Error") {
      error = HttpStatus[status] ?? error;
    }

    const requestId = (request.headers["x-request-id"] as string) ?? (request as unknown as { id?: string }).id;

    response.status(status).json({
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
