import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { openSecret, sealSecret } from "../../common/domain";

const BCRYPT_COST = 12;

/**
 * Внутренний CRUD учётных записей (BACKEND.md §3, `modules/users`). Не имеет
 * собственного контроллера — вызывается только из других сервисов
 * (`AuthService`, `StudentsService.create` → `UsersService.createAccount()`).
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get encKey(): string {
    return this.config.get<string>("credentials.encKey")!;
  }

  /** Зашифровать пароль для показа куратору (параллельно bcrypt-хешу). */
  sealPassword(plain: string): string {
    return sealSecret(plain, this.encKey);
  }

  /** Расшифровать (`null` — не сохранён / другой ключ). */
  openPassword(sealed: string | null | undefined): string | null {
    return openSecret(sealed, this.encKey);
  }

  findByLogin(login: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { login } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async validatePassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, BCRYPT_COST);
  }

  async createAccount(params: {
    login: string;
    plainPassword: string;
    role: Role;
    name?: string;
  }): Promise<User> {
    const passwordHash = await this.hashPassword(params.plainPassword);
    return this.prisma.user.create({
      data: { login: params.login, passwordHash, role: params.role, name: params.name },
    });
  }

  /** Инвалидирует все refresh-токены пользователя (logout, смена пароля). */
  async bumpTokenVersion(userId: string): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  }

  async loginTaken(login: string): Promise<boolean> {
    return (await this.prisma.user.count({ where: { login } })) > 0;
  }
}
