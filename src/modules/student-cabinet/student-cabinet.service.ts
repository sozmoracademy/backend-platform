import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StudentCabinetRepository } from "./student-cabinet.repository";
import { CourseResolverService } from "../courses/course-resolver.service";
import { BunnyStreamService } from "../media/bunny-stream.service";
import {
  activityDatesFor,
  bestAttemptOf,
  courseLevels,
  currentLessonOrder,
  daysLeft,
  effectiveAccessStatus,
  lessonState,
  levelStatus,
  nextStepFor,
  practiceStats,
  stageStatus,
  streakDays,
  testAvailability,
  testClearedOrders,
  testsStats,
  todayInTz,
  weekAgenda,
  weekPlan,
  weekRange,
  type CefrLevel,
} from "../../common/domain";
import {
  DashboardProgressDto,
  LessonDetailDto,
  LessonListItemDto,
  LessonTestSummaryDto,
  MeCourseBlockDto,
  MeCourseDto,
  MeDashboardDto,
  MeProfileDto,
  MeScheduleDayDto,
  MeetingSummaryDto,
  NextStepDto,
  WatchProgressResponseDto,
} from "./dto/me.dto";

const COMPLETE_THRESHOLD = 0.9;

interface PlainMeeting {
  id: string;
  lessonOrder: number;
  scope: "GROUP" | "INDIVIDUAL";
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  meetUrl: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface PlainTest {
  id: string;
  lessonOrder: number;
  title: string;
  status: "draft" | "published";
  timeLimitSec: number;
  passingScore: number;
  questionCount: number;
}

interface PlainAttempt {
  testId: string;
  lessonOrder: number;
  status: "in_progress" | "submitted";
  expiresAt: string;
  score: number | null;
  passed: boolean | null;
  submittedAt: string | null;
}

@Injectable()
export class StudentCabinetService {
  constructor(
    private readonly repo: StudentCabinetRepository,
    private readonly config: ConfigService,
    private readonly resolver: CourseResolverService,
    private readonly bunny: BunnyStreamService,
  ) {}

  private today(): string {
    return todayInTz(this.config.get<string>("school.tz")!);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private accessStatusOf(
    student: { status: "active" | "expired" | "disabled"; endDate: Date },
    today: string,
  ) {
    return effectiveAccessStatus({ status: student.status, endDate: this.toDateStr(student.endDate) }, today);
  }

  private async loadContext(studentId: string) {
    const student = await this.repo.findStudentOrThrow(studentId);
    const product = await this.resolver.forStudent(student);
    const [lessons, tests, studentLessons, attempts, meetings] = await Promise.all([
      this.repo.findLessons(product.id),
      this.repo.findTestsWithQuestionCount(product.id),
      this.repo.findStudentLessons(studentId),
      this.repo.findAttempts(studentId),
      this.repo.findMeetings(student),
    ]);

    const completedOrders = new Set(
      studentLessons.filter((sl) => sl.completedAt).map((sl) => sl.lessonOrder),
    );
    const completedAtByOrder = new Map(
      studentLessons
        .filter((sl) => sl.completedAt)
        .map((sl) => [sl.lessonOrder, this.toDateStr(sl.completedAt!)]),
    );
    const watchedByOrder = new Map(studentLessons.map((sl) => [sl.lessonOrder, sl.watchedPct]));
    const orderByLessonId = new Map(lessons.map((l) => [l.id, l.order]));

    const testsPlain: PlainTest[] = tests.map((t) => ({
      id: t.id,
      lessonOrder: t.lessonOrder,
      title: t.title,
      status: t.status,
      timeLimitSec: t.timeLimitSec,
      passingScore: t.passingScore,
      questionCount: t._count.questions,
    }));
    const attemptsPlain: PlainAttempt[] = attempts.map((a) => ({
      testId: a.testId,
      lessonOrder: orderByLessonId.get(a.lessonId) ?? 0,
      status: a.status,
      expiresAt: a.expiresAt.toISOString(),
      score: a.score,
      passed: a.passed,
      submittedAt: a.submittedAt?.toISOString() ?? null,
    }));
    const meetingsPlain: PlainMeeting[] = meetings.map((m) => ({
      id: m.id,
      lessonOrder: orderByLessonId.get(m.lessonId) ?? 0,
      scope: m.scope,
      title: m.title,
      date: this.toDateStr(m.date),
      startTime: m.startTime,
      endTime: m.endTime,
      meetUrl: m.meetUrl,
      status: m.status,
    }));

    // Тест-гейт (ТЗ инвариант 4): уроки с зачтённым/отсутствующим тестом не
    // блокируют открытие следующего. Считаем один раз на запрос.
    const clearedOrders = testClearedOrders(
      lessons.map((l) => l.order),
      testsPlain,
      attemptsPlain,
    );

    return {
      student,
      product,
      lessons,
      testsPlain,
      attemptsPlain,
      meetingsPlain,
      completedOrders,
      completedAtByOrder,
      watchedByOrder,
      clearedOrders,
    };
  }

  private meetingSummary(m: PlainMeeting): MeetingSummaryDto {
    return {
      id: m.id,
      title: m.title,
      date: m.date,
      startTime: m.startTime,
      endTime: m.endTime,
      meetUrl: m.meetUrl,
      status: m.status,
      type: m.scope,
      lessonOrder: m.lessonOrder,
    };
  }

  private lessonTestSummary(
    order: number,
    testsPlain: PlainTest[],
    attemptsPlain: PlainAttempt[],
    lessonCompleted: boolean,
    now: string,
  ): LessonTestSummaryDto | undefined {
    const test = testsPlain.find((t) => t.lessonOrder === order);
    if (!test) return undefined;
    const testAttempts = attemptsPlain.filter((a) => a.testId === test.id);
    const availability = testAvailability(test.status, lessonCompleted, testAttempts, now);
    const best = bestAttemptOf(testAttempts);
    return {
      title: test.title,
      questionCount: test.questionCount,
      minutes: Math.round(test.timeLimitSec / 60),
      availability,
      ...(best?.score !== undefined && best?.score !== null ? { bestScore: best.score } : {}),
    };
  }

  async dashboard(studentId: string): Promise<MeDashboardDto> {
    const ctx = await this.loadContext(studentId);
    const {
      student,
      lessons,
      testsPlain,
      attemptsPlain,
      meetingsPlain,
      completedOrders,
      completedAtByOrder,
    } = ctx;
    const today = this.today();
    const now = new Date().toISOString();

    const week = weekRange(today);
    const agenda = weekAgenda(week, {
      completedAtByOrder,
      lessons: lessons.map((l) => ({ order: l.order, title: l.title })),
      tests: testsPlain,
      attempts: attemptsPlain,
      meetings: meetingsPlain,
    });

    const step = nextStepFor({
      openedUpTo: student.openedUpTo,
      completedOrders,
      lessons: lessons.map((l) => ({
        order: l.order,
        title: l.title,
        description: l.description,
        duration: l.duration,
      })),
      tests: testsPlain,
      attempts: attemptsPlain,
      meetings: meetingsPlain,
      today,
      now,
    });

    const currentOrder = currentLessonOrder(student.openedUpTo, completedOrders);
    const currentLesson = lessons.find((l) => l.order === currentOrder) ?? null;

    const usedBlockNames = new Set(lessons.map((l) => l.block));
    const blocks = (await this.repo.findCourseBlocks()).filter((b) => usedBlockNames.has(b.name));
    const stages = blocks.map((b) => ({ block: b.name, level: b.level as CefrLevel, month: b.month }));
    const levels = courseLevels(stages);
    const statusOfStage = (stage: (typeof stages)[number]) =>
      stageStatus(
        lessons.filter((l) => l.block === stage.block).map((l) => l.order),
        student.openedUpTo,
        completedOrders,
      );
    const statusOf = (level: CefrLevel) => levelStatus(level, stages, statusOfStage);
    const currentLevel =
      levels.find((l) => statusOf(l) === "current") ??
      [...levels].reverse().find((l) => statusOf(l) === "completed") ??
      levels[0]!;
    const levelBlockNames = stages.filter((s) => s.level === currentLevel).map((s) => s.block);
    const levelLessonOrders = lessons.filter((l) => levelBlockNames.includes(l.block)).map((l) => l.order);
    const levelDone = levelLessonOrders.filter((o) => completedOrders.has(o)).length;
    const percentInLevel = levelLessonOrders.length
      ? Math.round((levelDone / levelLessonOrders.length) * 100)
      : 0;

    const activityDates = activityDatesFor({
      completedAtByOrder,
      attempts: attemptsPlain,
      meetings: meetingsPlain,
    });
    const streak = streakDays(activityDates, today);

    let nextStep: NextStepDto;
    if (step.kind === "lesson") {
      nextStep = { kind: "lesson", lesson: step.lesson };
    } else if (step.kind === "test") {
      nextStep = { kind: "test", lesson: step.lesson, test: step.test };
    } else if (step.kind === "practice") {
      nextStep = { kind: "practice", meeting: this.meetingSummary(step.meeting) };
    } else {
      nextStep = {
        kind: "done",
        ...(step.nextMeeting ? { nextMeeting: this.meetingSummary(step.nextMeeting) } : {}),
      };
    }

    const progress: DashboardProgressDto = {
      level: currentLevel,
      percentInLevel,
      lessonsDone: completedOrders.size,
      lessonsTotal: lessons.length,
      streakDays: streak,
      // TODO(TЗ §15.4): «Точность 87%» захардкожена в референсе — воспроизведено как есть.
      accuracyPct: 87,
      // TODO(TЗ §15.4): «180 дней доступа» захардкожено в референсе (не путать с AccessInfoDto.daysLeft).
      daysLeftAccess: 180,
      levels: levels.map((level) => ({ level, status: statusOf(level) })),
    };

    return {
      firstName: student.firstName,
      courseType: student.type,
      learningLanguage: student.language,
      access: {
        status: this.accessStatusOf(student, today),
        daysLeft: daysLeft(this.toDateStr(student.endDate), today),
      },
      week: agenda,
      currentLesson: currentLesson
        ? {
            order: currentLesson.order,
            title: currentLesson.title,
            description: currentLesson.description,
            duration: currentLesson.duration,
          }
        : null,
      nextStep,
      meetings: meetingsPlain.map((m) => this.meetingSummary(m)),
      progress,
    };
  }

  async course(studentId: string): Promise<MeCourseDto> {
    const ctx = await this.loadContext(studentId);
    const { student, product, lessons, completedOrders } = ctx;
    const usedBlockNames = new Set(lessons.map((l) => l.block));
    const blocks = (await this.repo.findCourseBlocks()).filter((b) => usedBlockNames.has(b.name));

    const blockDtos: MeCourseBlockDto[] = blocks.map((b) => ({
      block: b.name,
      level: b.level as CefrLevel,
      month: b.month,
      title: b.title,
      status: stageStatus(
        lessons.filter((l) => l.block === b.name).map((l) => l.order),
        student.openedUpTo,
        completedOrders,
      ),
    }));

    return {
      language: student.language,
      productTitle: product?.title ?? "",
      completed: completedOrders.size,
      total: lessons.length,
      currentLessonOrder: currentLessonOrder(student.openedUpTo, completedOrders),
      blocks: blockDtos,
    };
  }

  async lessons(studentId: string): Promise<LessonListItemDto[]> {
    const ctx = await this.loadContext(studentId);
    const { student, lessons, testsPlain, attemptsPlain, completedOrders, clearedOrders } = ctx;
    const now = new Date().toISOString();

    return lessons.map((l) => {
      const state = lessonState(student.openedUpTo, completedOrders, clearedOrders, l.order);
      const test = this.lessonTestSummary(l.order, testsPlain, attemptsPlain, state === "completed", now);
      return {
        order: l.order,
        title: l.title,
        description: l.description,
        duration: l.duration,
        block: l.block,
        state,
        ...(test ? { test } : {}),
      };
    });
  }

  async lessonDetail(studentId: string, order: number): Promise<LessonDetailDto> {
    const ctx = await this.loadContext(studentId);
    const { student, lessons, testsPlain, attemptsPlain, completedOrders, clearedOrders, watchedByOrder } =
      ctx;
    const now = new Date().toISOString();

    const lesson = lessons.find((l) => l.order === order);
    if (!lesson) throw new NotFoundException("Урок не найден");

    const state = lessonState(student.openedUpTo, completedOrders, clearedOrders, order);
    const prevLesson = lessons.find((l) => l.order === order - 1);
    const nextLesson = lessons.find((l) => l.order === order + 1);
    // «Следующий урок закрыт» = его нет ИЛИ он не available под тест-гейтом.
    const nextLocked = nextLesson
      ? lessonState(student.openedUpTo, completedOrders, clearedOrders, nextLesson.order) !== "available"
      : true;
    const test = this.lessonTestSummary(order, testsPlain, attemptsPlain, state === "completed", now);
    const previewVideoUrl = await this.repo.findPreviewVideoUrl();

    return {
      order: lesson.order,
      title: lesson.title,
      description: lesson.description,
      duration: lesson.duration,
      block: lesson.block,
      state,
      // Приоритет: нет доступа → ""; тестовое видео куратора (TЗ §4.3) →
      // оно; залитое и готовое видео → свежий подписанный Bunny-HLS (живёт
      // ~6 ч, переслать нельзя); иначе → внешняя ссылка / placeholder из сида.
      videoUrl:
        state === "locked"
          ? ""
          : previewVideoUrl
            ? previewVideoUrl
            : lesson.videoAssetId && lesson.videoStatus === "ready"
              ? this.bunny.signedPlaylistUrl(lesson.videoAssetId)
              : lesson.videoUrl,
      watchedPct: completedOrders.has(order) ? 100 : (watchedByOrder.get(order) ?? 0),
      ...(prevLesson ? { prev: { order: prevLesson.order, title: prevLesson.title } } : {}),
      ...(nextLesson ? { next: { order: nextLesson.order, title: nextLesson.title } } : {}),
      nextLocked,
      ...(test ? { test } : {}),
    };
  }

  async schedule(studentId: string): Promise<MeScheduleDayDto[]> {
    const ctx = await this.loadContext(studentId);
    const {
      student,
      lessons,
      testsPlain,
      attemptsPlain,
      meetingsPlain,
      completedOrders,
      completedAtByOrder,
    } = ctx;
    const today = this.today();
    const week = weekRange(today);

    const agendaByDate = new Map(
      weekAgenda(week, {
        completedAtByOrder,
        lessons: lessons.map((l) => ({ order: l.order, title: l.title })),
        tests: testsPlain,
        attempts: attemptsPlain,
        meetings: meetingsPlain,
      }).map((d) => [d.date, d.items]),
    );

    return weekPlan({
      openedUpTo: student.openedUpTo,
      completedOrders,
      lessons: lessons.map((l) => ({ order: l.order, title: l.title, duration: l.duration })),
      meetings: meetingsPlain,
      week,
      today,
      dayAgendaOf: (date) => agendaByDate.get(date) ?? [],
    });
  }

  async profile(studentId: string): Promise<MeProfileDto> {
    const ctx = await this.loadContext(studentId);
    const { student, lessons, testsPlain, attemptsPlain, meetingsPlain, completedOrders } = ctx;
    const today = this.today();

    const testIdByLessonOrder = new Map(testsPlain.map((t) => [t.lessonOrder, t.id]));
    const attemptsByTest = new Map<string, PlainAttempt[]>();
    for (const a of attemptsPlain) {
      const list = attemptsByTest.get(a.testId) ?? [];
      list.push(a);
      attemptsByTest.set(a.testId, list);
    }
    const ts = testsStats({
      openedUpTo: student.openedUpTo,
      tests: testsPlain,
      attemptsByTest,
      testIdByLessonOrder,
    });
    const ps = practiceStats(meetingsPlain);

    return {
      firstName: student.firstName,
      lastName: student.lastName,
      avatarTone: student.avatarTone,
      type: student.type,
      language: student.language,
      access: {
        status: this.accessStatusOf(student, today),
        daysLeft: daysLeft(this.toDateStr(student.endDate), today),
      },
      startDate: this.toDateStr(student.startDate),
      endDate: this.toDateStr(student.endDate),
      phone: student.phone,
      login: student.user.login,
      lessonsCompleted: completedOrders.size,
      lessonsTotal: lessons.length,
      testsPassed: ts.passed,
      testsTotal: ts.total,
      practiceTotal: ps.total,
      practiceAttended: ps.attended,
    };
  }

  /** `POST /me/lessons/:order/watch` — BACKEND.md §7.2. */
  async watch(studentId: string, order: number, pct: number): Promise<WatchProgressResponseDto> {
    const ctx = await this.loadContext(studentId);
    const { student, lessons, completedOrders, clearedOrders, watchedByOrder } = ctx;
    const today = this.today();

    if (this.accessStatusOf(student, today) !== "active") {
      throw new ForbiddenException("Доступ к обучению закрыт");
    }
    const lesson = lessons.find((l) => l.order === order);
    if (!lesson) throw new NotFoundException("Урок не найден");
    // Закрыт группой ИЛИ тест-гейтом (не сдан тест предыдущего урока).
    if (lessonState(student.openedUpTo, completedOrders, clearedOrders, order) === "locked") {
      throw new ForbiddenException("Урок пока закрыт");
    }

    const wasCompleted = completedOrders.has(order);
    const nextPct = Math.max(watchedByOrder.get(order) ?? 0, pct);
    const completedJustNow = !wasCompleted && pct / 100 >= COMPLETE_THRESHOLD;
    const nowCompleted = wasCompleted || completedJustNow;

    let completedAt: Date | null = null;
    if (wasCompleted) {
      completedAt = (await this.repo.findStudentLesson(studentId, lesson.id))?.completedAt ?? null;
    } else if (completedJustNow) {
      completedAt = new Date(`${today}T00:00:00.000Z`);
    }

    await this.repo.upsertStudentLesson(studentId, lesson.id, {
      watchedPct: nowCompleted ? 100 : nextPct,
      completedAt,
    });
    await this.repo.updateLastActivity(studentId, new Date(`${today}T00:00:00.000Z`));

    const updatedCompletedOrders = nowCompleted ? new Set(completedOrders).add(order) : completedOrders;
    return {
      watchedPct: nowCompleted ? 100 : nextPct,
      state: lessonState(student.openedUpTo, updatedCompletedOrders, clearedOrders, order),
      completedJustNow,
    };
  }
}
