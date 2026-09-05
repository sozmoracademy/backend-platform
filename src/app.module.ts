import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "./infra/config/config.module";
import { PrismaModule } from "./infra/prisma/prisma.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { StudentCabinetModule } from "./modules/student-cabinet/student-cabinet.module";
import { TestsModule } from "./modules/tests/tests.module";
import { StudentsModule } from "./modules/students/students.module";
import { GroupsModule } from "./modules/groups/groups.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { NotesModule } from "./modules/notes/notes.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { TeachersModule } from "./modules/teachers/teachers.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: Number(process.env.THROTTLE_TTL ?? 300) * 1000,
          limit: Number(process.env.THROTTLE_LIMIT ?? 100),
        },
      ],
      // В e2e-тестах много последовательных запросов (в т.ч. login) от одного IP —
      // рейт-лимит там не тестируем отдельным сценарием, поэтому отключаем шумовой 429.
      skipIf: () => process.env.NODE_ENV === "test",
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    CoursesModule,
    LessonsModule,
    StudentCabinetModule,
    TestsModule,
    StudentsModule,
    GroupsModule,
    ProgressModule,
    NotesModule,
    DashboardModule,
    TeachersModule,
    MeetingsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Порядок регистрации важен: Nest применяет `@Catch()`-фильтры в обратном
    // порядке — последний зарегистрированный проверяется первым. PrismaExceptionFilter
    // ловит только PrismaClientKnownRequestError, AllExceptionsFilter — всё остальное.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
