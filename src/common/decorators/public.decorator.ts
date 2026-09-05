import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
/** Снимает `JwtAuthGuard` для эндпоинта (BACKEND.md §5.3). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
