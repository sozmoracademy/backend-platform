import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser, type CurrentUserPayload } from "../../common/decorators/current-user.decorator";
import { DashboardService } from "./dashboard.service";
import { CuratorDashboardDto } from "./dto/curator-dashboard.dto";

/** `dashboard` — роль curator (BACKEND.md §12). */
@ApiTags("dashboard")
@Roles("CURATOR")
@Controller("curator")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("dashboard")
  get(@CurrentUser() user: CurrentUserPayload): Promise<CuratorDashboardDto> {
    return this.dashboard.get(user.userId);
  }
}
