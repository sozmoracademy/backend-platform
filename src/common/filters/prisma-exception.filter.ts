import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

/** P2002 → 409 «уже существует», P2025 → 404, P2003 → 409 (BACKEND.md §8). */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Ошибка базы данных";

    switch (exception.code) {
      case "P2002": {
        const target = (exception.meta?.target as string[] | undefined)?.join(", ");
        status = HttpStatus.CONFLICT;
        message = target ? `Запись с таким «${target}» уже существует` : "Запись уже существует";
        break;
      }
      case "P2025":
        status = HttpStatus.NOT_FOUND;
        message = "Запись не найдена";
        break;
      case "P2003":
        status = HttpStatus.CONFLICT;
        message = "Связанная запись используется или не найдена";
        break;
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = "Ошибка базы данных";
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status],
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: (request.headers["x-request-id"] as string) ?? undefined,
    });
  }
}
