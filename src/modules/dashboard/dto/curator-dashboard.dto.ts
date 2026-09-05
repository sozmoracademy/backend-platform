import { ApiProperty } from "@nestjs/swagger";

export class DashboardStatsDto {
  @ApiProperty() students!: number;
  @ApiProperty() active!: number;
  @ApiProperty() groups!: number;
  @ApiProperty() teachers!: number;
}

export class AttentionRowDto {
  @ApiProperty() label!: string;
  @ApiProperty() count!: number;
  @ApiProperty({ enum: ["students", "groups"] }) to!: "students" | "groups";
}

export class DashboardMeetingDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() date!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() meetUrl!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) groupName!: string | null;
}

export class IdleStudentDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() avatarTone!: string;
  @ApiProperty() lastActivity!: string;
}

export class CuratorDashboardDto {
  @ApiProperty() curatorName!: string;
  @ApiProperty() today!: string;
  @ApiProperty({ type: DashboardStatsDto }) stats!: DashboardStatsDto;
  @ApiProperty() todayPracticeGroupsCount!: number;
  @ApiProperty() newStudentsCount!: number;
  @ApiProperty() attentionCount!: number;
  @ApiProperty({ type: [AttentionRowDto] }) attentionRows!: AttentionRowDto[];
  @ApiProperty({ type: [DashboardMeetingDto] }) todayMeetings!: DashboardMeetingDto[];
  @ApiProperty({ type: [IdleStudentDto] }) idleStudents!: IdleStudentDto[];
}
