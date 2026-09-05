import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { AddNoteRequestDto, NoteDto } from "./dto/note.dto";

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  private toDto(n: { id: string; author: string; content: string; createdAt: Date }): NoteDto {
    return {
      id: n.id,
      author: n.author,
      content: n.content,
      createdAt: n.createdAt.toISOString().slice(0, 10),
    };
  }

  async list(studentId: string): Promise<NoteDto[]> {
    const exists = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!exists) throw new NotFoundException("Ученик не найден");
    const notes = await this.prisma.note.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });
    return notes.map((n) => this.toDto(n));
  }

  async add(studentId: string, curatorUserId: string, body: AddNoteRequestDto): Promise<NoteDto> {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException("Ученик не найден");
    const curator = await this.users.findById(curatorUserId);

    const note = await this.prisma.note.create({
      data: {
        studentId,
        authorId: curatorUserId,
        author: curator?.name ?? "Куратор",
        content: body.content.trim(),
      },
    });
    return this.toDto(note);
  }

  async remove(noteId: string): Promise<void> {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException("Заметка не найдена");
    await this.prisma.note.delete({ where: { id: noteId } });
  }
}
