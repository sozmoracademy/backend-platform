import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../infra/prisma/prisma.service";

@ApiExcludeController()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        db: "ok",
        dbLatencyMs: Date.now() - startedAt,
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        db: "error",
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    }
  }
}
