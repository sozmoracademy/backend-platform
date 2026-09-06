import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { CourseProduct, Student } from "@prisma/client";
import { StudentsRepository, PAGE_SIZE, type StudentsFilter } from "./students.repository";
import { UsersService } from "../users/users.service";
import { CourseResolverService } from "../courses/course-resolver.service";
import {
  bestAttemptOf,
  currentLessonOrder,
  daysLeft,
  effectiveAccessStatus,
  findMatchingGroup,
  generatePassword,
  lessonState,
  levelForLesson,
  monthOfLesson,
  practiceStats,
  progressPercent,
  testClearedOrders,
  testsStats,
  todayInTz,
  type AttemptLike,
  type CefrLevel,
  type LevelPlanEntry,
} from "../../common/domain";
import {
  BulkUpdateStudentsRequestDto,
  CreateStudentRequestDto,
  CreateStudentResponseDto,
  ResetStudentPasswordResponseDto,
  StudentHeaderDto,
  StudentLearningDto,
  StudentOverviewDto,
  StudentPracticeDto,
  StudentProgressDto,
  StudentsListDto,
  StudentsQueryDto,
  UpdateStudentAccessRequestDto,
  UpdateStudentGroupRequestDto,
  UpdateStudentRequestDto,
} from "./dto/student.dto";

@Injectable()
export class StudentsService {
  constructor(
    private readonly repo: StudentsRepository,
    private readonly users: UsersService,
    private readonly config: ConfigService,
    private readonly resolver: CourseResolverService,
  ) {}

  private today(): string {
    return todayInTz(this.config.get<string>("school.tz")!);
  }

  private toDateStr(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Резолвит продукт студента (GROUP — через его группу, INDIVIDUAL — язык). */
  private productFor(student: {
    language: Student["language"];
    type: Student["type"];
    groupId: string | null;
  }) {
    return this.resolver.forStudent(student);
  }

  private accessStatusOf(student: { status: Student["status"]; endDate: Date }, today: string) {
    return effectiveAccessStatus({ status: student.status, endDate: this.toDateStr(student.endDate) }, today);
  }

  private paymentStatus(paid: number, total: number): "full" | "partial" | "unpaid" {
    if (paid >= total) return "full";
    if (paid > 0) return "partial";
    return "unpaid";
  }

  async list(query: StudentsQueryDto): Promise<StudentsListDto> {
    const today = this.today();
    const filter: StudentsFilter = {
      q: query.q,
      language: query.language ?? "all",
      type: query.type ?? "all",
      status: query.status ?? "all",
      groupId: query.groupId ?? "all",
      teacherId: query.teacherId ?? "all",
    };
    const page = query.page ?? 1;
    const { items, total } = await this.repo.findPage(filter, page, new Date(`${today}T00:00:00.000Z`));

    const productCache = new Map<string, CourseProduct>();
    const lessonCountCache = new Map<string, number>();
    const productFor = async (s: {
      language: Student["language"];
      type: Student["type"];
      groupId: string | null;
    }) => {
      const key = s.type === "INDIVIDUAL" ? `ind:${s.language}` : `grp:${s.groupId}`;
      if (!productCache.has(key)) productCache.set(key, await this.resolver.forStudent(s));
      return productCache.get(key)!;
    };
    const lessonCountFor = async (courseProductId: string) => {
      if (!lessonCountCache.has(courseProductId)) {
        lessonCountCache.set(courseProductId, await this.resolver.countLessons(courseProductId));
      }
      return lessonCountCache.get(courseProductId)!;
    };

    const mapped = await Promise.all(
      items.map(async (s) => {
        const product = await productFor(s);
        const lessonsTotal = await lessonCountFor(product.id);
        const completedOrders = new Set(s.lessons.map((l) => l.lesson.order));
        const payment = s.payment;
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          avatarTone: s.avatarTone,
          login: s.user.login,
          phone: s.phone,
          language: s.language,
          type: s.type,
          productTitle: product?.title ?? "",
          groupCode: s.group?.code ?? null,
          groupName: s.group?.name ?? null,
          startDate: this.toDateStr(s.startDate),
          endDate: this.toDateStr(s.endDate),
          currentLessonOrder: currentLessonOrder(s.openedUpTo, completedOrders),
          lessonsTotal,
          progressPct: progressPercent(completedOrders.size, lessonsTotal),
          payment: payment
            ? {
                status: this.paymentStatus(payment.paid, payment.totalCost),
                paid: payment.paid,
                total: payment.totalCost,
                currency: product?.currency ?? "сом",
                remaining: Math.max(0, payment.totalCost - payment.paid),
                purchaseDate: this.toDateStr(payment.purchaseDate),
              }
            : {
                status: "unpaid" as const,
                paid: 0,
                total: 0,
                currency: product?.currency ?? "сом",
                remaining: 0,
                purchaseDate: this.toDateStr(s.startDate),
              },
          lastActivity: this.toDateStr(s.lastActivity),
          accessStatus: this.accessStatusOf(s, today),
        };
      }),
    );

    return { items: mapped, total, page, pageSize: PAGE_SIZE };
  }

  async create(body: CreateStudentRequestDto): Promise<CreateStudentResponseDto> {
    if (await this.repo.loginExists(body.login)) {
      throw new BadRequestException("Такой логин уже есть в базе — измените");
    }
    let group = body.groupId ? await this.repo.findGroupById(body.groupId) : null;
    if (body.type === "GROUP" && !group) {
      const candidates = await this.repo.findMatchingGroupCandidates(
        body.language,
        new Date(`${body.startDate}T00:00:00.000Z`),
      );
      const match = findMatchingGroup(
        candidates.map((g) => ({
          id: g.id,
          language: g.language,
          status: g.status,
          startDate: this.toDateStr(g.startDate),
          practiceStart: g.practiceStart,
          studentCount: g._count.students,
          maxStudents: g.maxStudents,
        })),
        body.language,
        body.startDate,
        body.practiceStart,
      );
      group = match ? await this.repo.findGroupById(match.id) : null;
    }

    const product =
      body.type === "INDIVIDUAL"
        ? await this.resolver.forIndividual(body.language)
        : group
          ? await this.resolver.forGroup(group.courseProductId)
          : null;
    if (!product) throw new BadRequestException("Не найдена группа для зачисления — укажите группу");

    const start = group ? group.startDate : new Date(`${body.startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + product.durationMonths);
    const total = body.total ?? product.price;
    const paid = body.paid ?? 0;

    // Пароль приходит с формы (клиентский предпросмотр, как в референсе). Если он
    // почему-то пуст — генерируем на сервере, чтобы учётка не осталась без пароля.
    // `generatePassword`'s "уникальный по базе" (BACKEND.md §6) относится к мок-хранилищу
    // паролей в открытом виде; здесь пароли — только bcrypt-хеши, сверить их с новым
    // паролем в открытом виде нельзя (и не нужно: коллизия пароля между разными логинами
    // не создаёт уязвимости — учётную запись всегда разделяет уникальный login).
    const plainPassword = body.password?.trim() || generatePassword(new Set());

    const user = await this.repo.createUser({
      login: body.login,
      passwordHash: await this.users.hashPassword(plainPassword),
      passwordEnc: this.users.sealPassword(plainPassword),
      role: "STUDENT",
    });

    const student = await this.repo.createStudent({
      user: { connect: { id: user.id } },
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      language: body.language,
      type: body.type,
      age: body.age,
      city: body.city,
      group: group ? { connect: { id: group.id } } : undefined,
      teacher: group?.teacherId ? { connect: { id: group.teacherId } } : undefined,
      startDate: start,
      endDate: end,
      status: "active",
      openedUpTo: 1,
      onboarded: false,
      managerName: body.manager || "—",
      lastActivity: new Date(`${this.today()}T00:00:00.000Z`),
    });

    await this.repo.createPayment({
      student: { connect: { id: student.id } },
      totalCost: total,
      paid,
      purchaseDate: new Date(`${this.today()}T00:00:00.000Z`),
    });

    return {
      id: student.id,
      login: student.user.login,
      password: plainPassword,
      groupName: group?.name ?? null,
    };
  }

  private async loadOrThrow(id: string) {
    const student = await this.repo.findByIdFull(id);
    if (!student) throw new NotFoundException("Ученик не найден");
    return student;
  }

  /**
   * Сгенерировать ученику новый пароль (для «забыл» и для аккаунтов без
   * сохранённого пароля). Обновляет и bcrypt-хеш, и зашифрованную копию,
   * инвалидирует старые сессии. Возвращает новый пароль (показывается один раз,
   * но потом виден на карточке).
   */
  async resetPassword(id: string): Promise<ResetStudentPasswordResponseDto> {
    const student = await this.loadOrThrow(id);
    const plainPassword = generatePassword(new Set());
    await this.repo.updateUserCredentials(student.userId, {
      passwordHash: await this.users.hashPassword(plainPassword),
      passwordEnc: this.users.sealPassword(plainPassword),
    });
    await this.users.bumpTokenVersion(student.userId);
    return { login: student.user.login, password: plainPassword };
  }

  async header(id: string): Promise<StudentHeaderDto> {
    const student = await this.loadOrThrow(id);
    const today = this.today();
    const product = await this.productFor(student);
    const lessonsTotal = await this.resolver.countLessons(product.id);
    const completed = await this.repo.findCompletedOrders(id);
    const completedOrders = new Set(completed.map((l) => l.lessonOrder));
    const meetings = await this.repo.findMeetingsFor(student);
    const nextMeeting = meetings.find((m) => m.status === "scheduled" && this.toDateStr(m.date) >= today);

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      avatarTone: student.avatarTone,
      language: student.language,
      type: student.type,
      accessStatus: this.accessStatusOf(student, today),
      status: student.status,
      daysLeft: daysLeft(this.toDateStr(student.endDate), today),
      endDate: this.toDateStr(student.endDate),
      lastActivity: this.toDateStr(student.lastActivity),
      currentLessonOrder: currentLessonOrder(student.openedUpTo, completedOrders),
      openedUpTo: student.openedUpTo,
      lessonsTotal,
      progressPct: progressPercent(completedOrders.size, lessonsTotal),
      onboarded: student.onboarded,
      ...(nextMeeting
        ? { nextMeeting: { date: this.toDateStr(nextMeeting.date), startTime: nextMeeting.startTime } }
        : {}),
    };
  }

  async overview(id: string): Promise<StudentOverviewDto> {
    const student = await this.loadOrThrow(id);
    const product = await this.productFor(student);
    const payment = student.payment;

    return {
      login: student.user.login,
      // Расшифрованный пароль для куратора; null — создан до фичи, нужен сброс.
      password: this.users.openPassword(student.user.passwordEnc),
      phone: student.phone,
      age: student.age,
      city: student.city,
      managerName: student.managerName,
      productTitle: product?.title ?? "",
      productPrice: product?.price ?? 0,
      productCurrency: product?.currency ?? "сом",
      startDate: this.toDateStr(student.startDate),
      endDate: this.toDateStr(student.endDate),
      payment: payment
        ? {
            status: this.paymentStatus(payment.paid, payment.totalCost),
            paid: payment.paid,
            total: payment.totalCost,
            currency: product?.currency ?? "сом",
            remaining: Math.max(0, payment.totalCost - payment.paid),
            purchaseDate: this.toDateStr(payment.purchaseDate),
          }
        : {
            status: "unpaid",
            paid: 0,
            total: 0,
            currency: product?.currency ?? "сом",
            remaining: 0,
            purchaseDate: this.toDateStr(student.startDate),
          },
      group: student.group ? { id: student.group.id, name: student.group.name } : null,
      groupRequired: student.type === "GROUP",
      teacherName: student.teacher?.name ?? null,
    };
  }

  async learning(id: string): Promise<StudentLearningDto> {
    const student = await this.loadOrThrow(id);
    const completed = await this.repo.findCompletedOrders(id);
    const completedOrders = new Set(completed.map((l) => l.lessonOrder));
    const order = currentLessonOrder(student.openedUpTo, completedOrders);
    const product = await this.productFor(student);
    const levelPlan = (product.levelPlan as unknown as LevelPlanEntry[]) ?? [];
    const lessonCount = await this.resolver.countLessons(product.id);

    const tests = await this.repo.findTestsWithQuestionCount(product.id);
    const attempts = await this.repo.findAttemptsForStudent(id);
    const testIdByLessonOrder = new Map(tests.map((t) => [t.lessonOrder, t.id]));
    const attemptsByTest = new Map<string, AttemptLike[]>();
    for (const a of attempts) {
      const list = attemptsByTest.get(a.testId) ?? [];
      list.push({ status: a.status, expiresAt: a.expiresAt.toISOString(), score: a.score, passed: a.passed });
      attemptsByTest.set(a.testId, list);
    }
    const ts = testsStats({
      openedUpTo: student.openedUpTo,
      tests: tests.map((t) => ({ lessonOrder: t.lessonOrder, status: t.status })),
      attemptsByTest,
      testIdByLessonOrder,
    });

    const allLessons = await this.repo.findAllLessonsLight(product.id);

    // Тест-гейт (ТЗ инвариант 4): для состояния уроков нужен набор «зачтённых» тестов.
    const orderByTestId = new Map(tests.map((t) => [t.id, t.lessonOrder]));
    const clearedOrders = testClearedOrders(
      allLessons.map((l) => l.order),
      tests,
      attempts.map((a) => ({
        lessonOrder: orderByTestId.get(a.testId) ?? -1,
        status: a.status,
        expiresAt: a.expiresAt.toISOString(),
        score: a.score,
        passed: a.passed,
      })),
    );

    return {
      level: levelForLesson(levelPlan, order, lessonCount, product.durationMonths) as CefrLevel,
      month: monthOfLesson(order, lessonCount, product.durationMonths),
      currentLessonOrder: order,
      openedUpTo: student.openedUpTo,
      completedCount: completedOrders.size,
      testsPassed: ts.passed,
      testsTotal: ts.total,
      lessons: allLessons.map((l) => {
        const t = tests.find((x) => x.lessonOrder === l.order);
        const best = t ? bestAttemptOf(attemptsByTest.get(t.id) ?? []) : null;
        return {
          order: l.order,
          title: l.title,
          state: lessonState(student.openedUpTo, completedOrders, clearedOrders, l.order),
          test: t
            ? {
                published: t.status === "published",
                bestScore: best?.score ?? null,
                passed: best?.passed ?? null,
                passingScore: t.passingScore,
              }
            : null,
        };
      }),
    };
  }

  async practice(id: string): Promise<StudentPracticeDto> {
    const student = await this.loadOrThrow(id);
    const today = this.today();
    const meetings = await this.repo.findMeetingsFor(student);
    const ps = practiceStats(meetings);
    const nextMeeting = meetings.find((m) => m.status === "scheduled" && this.toDateStr(m.date) >= today);

    return {
      total: ps.total,
      attended: ps.attended,
      ...(nextMeeting ? { nextMeetingDate: this.toDateStr(nextMeeting.date) } : {}),
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        date: this.toDateStr(m.date),
        startTime: m.startTime,
        endTime: m.endTime,
        meetUrl: m.meetUrl,
        status: m.status,
        ...(m.status === "completed"
          ? { attended: m.attendance.some((a) => a.studentId === student.id) }
          : {}),
      })),
    };
  }

  async progress(id: string): Promise<StudentProgressDto> {
    const student = await this.loadOrThrow(id);
    const today = this.today();
    const product = await this.productFor(student);
    const lessonsTotal = await this.resolver.countLessons(product.id);
    const completed = await this.repo.findCompletedOrders(id);
    const completedOrders = new Set(completed.map((l) => l.lessonOrder));
    const meetings = await this.repo.findMeetingsFor(student);
    const ps = practiceStats(meetings);

    const tests = await this.repo.findTestsWithQuestionCount(product.id);
    const attempts = await this.repo.findAttemptsForStudent(id);
    const testIdByLessonOrder = new Map(tests.map((t) => [t.lessonOrder, t.id]));
    const attemptsByTest = new Map<string, AttemptLike[]>();
    for (const a of attempts) {
      const list = attemptsByTest.get(a.testId) ?? [];
      list.push({ status: a.status, expiresAt: a.expiresAt.toISOString(), score: a.score, passed: a.passed });
      attemptsByTest.set(a.testId, list);
    }
    const ts = testsStats({
      openedUpTo: student.openedUpTo,
      tests: tests.map((t) => ({ lessonOrder: t.lessonOrder, status: t.status })),
      attemptsByTest,
      testIdByLessonOrder,
    });

    return {
      completedCount: completedOrders.size,
      lessonsTotal,
      progressPct: progressPercent(completedOrders.size, lessonsTotal),
      testsPassed: ts.passed,
      testsTotal: ts.total,
      practiceAttended: ps.attended,
      practiceTotal: ps.total,
      // Порт значения из curator.students.$id.tsx референса: не серия активных дней,
      // а дни с последней активности (см. discrepancy-отчёт).
      streakDays: Math.max(0, daysLeft(today, this.toDateStr(student.lastActivity))),
    };
  }

  async updateContact(id: string, body: UpdateStudentRequestDto): Promise<StudentHeaderDto> {
    await this.loadOrThrow(id);
    await this.repo.updateContact(id, {
      phone: body.phone,
      city: body.city,
      age: body.age,
      managerName: body.managerName,
      onboarded: body.onboarded,
    });
    if (body.payment) {
      const student = await this.loadOrThrow(id);
      if (student.payment) {
        await this.repo.updatePayment(id, { totalCost: body.payment.total, paid: body.payment.paid });
      } else {
        await this.repo.createPayment({
          student: { connect: { id } },
          totalCost: body.payment.total,
          paid: body.payment.paid,
          purchaseDate: new Date(`${this.today()}T00:00:00.000Z`),
        });
      }
    }
    return this.header(id);
  }

  async updateAccess(id: string, body: UpdateStudentAccessRequestDto): Promise<StudentHeaderDto> {
    await this.loadOrThrow(id);
    await this.repo.updateAccess(id, {
      status: body.status,
      endDate: body.endDate ? new Date(`${body.endDate}T00:00:00.000Z`) : undefined,
    });
    return this.header(id);
  }

  async updateGroup(id: string, body: UpdateStudentGroupRequestDto): Promise<StudentHeaderDto> {
    await this.loadOrThrow(id);
    const group = body.groupId ? await this.repo.findGroupById(body.groupId) : null;
    await this.repo.updateGroupAssignment(id, {
      groupId: body.groupId,
      ...(group ? { teacherId: group.teacherId, startDate: group.startDate, endDate: group.endDate } : {}),
    });
    return this.header(id);
  }

  async bulk(body: BulkUpdateStudentsRequestDto): Promise<{ updated: number }> {
    await this.repo.bulkUpdate(body.ids, body.patch);
    return { updated: body.ids.length };
  }

  async openLesson(id: string, order: number): Promise<StudentHeaderDto> {
    const student = await this.loadOrThrow(id);
    if (student.type !== "INDIVIDUAL") throw new BadRequestException("Доступно только для Individual");
    const product = await this.resolver.forIndividual(student.language);
    const lessonCount = await this.resolver.countLessons(product.id);
    if (order < 1 || order > lessonCount) throw new BadRequestException("Некорректный номер урока");
    await this.repo.updateOpenedUpTo(id, order);
    return this.header(id);
  }

  async closeLesson(id: string, order: number): Promise<StudentHeaderDto> {
    const student = await this.loadOrThrow(id);
    if (student.type !== "INDIVIDUAL") throw new BadRequestException("Доступно только для Individual");
    await this.repo.updateOpenedUpTo(id, Math.max(0, order - 1));
    return this.header(id);
  }

  async exportCsv(query: StudentsQueryDto, ids?: string[]): Promise<string> {
    const today = this.today();
    const filter: StudentsFilter = {
      q: query.q,
      language: query.language ?? "all",
      type: query.type ?? "all",
      status: query.status ?? "all",
      groupId: query.groupId ?? "all",
      teacherId: query.teacherId ?? "all",
    };
    const rows = await this.repo.findAllForExport(filter, ids, new Date(`${today}T00:00:00.000Z`));

    const header = [
      "Name",
      "Login",
      "Phone",
      "Course",
      "Type",
      "Group",
      "StartDate",
      "EndDate",
      "Status",
      "Paid",
      "Total",
      "Payment",
    ];
    const csvRows = rows.map((s) => {
      const payment = s.payment;
      const status = this.accessStatusOf(s, today);
      const paymentStatus = payment ? this.paymentStatus(payment.paid, payment.totalCost) : "unpaid";
      return [
        `${s.firstName} ${s.lastName}`,
        s.user.login,
        s.phone,
        s.language,
        s.type,
        s.group?.code ?? "",
        this.toDateStr(s.startDate),
        this.toDateStr(s.endDate),
        status,
        String(payment?.paid ?? 0),
        String(payment?.totalCost ?? 0),
        paymentStatus,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });
    return [header.join(","), ...csvRows].join("\n");
  }
}
