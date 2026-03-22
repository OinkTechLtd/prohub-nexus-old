import { z } from "zod";

export const topicSchema = z.object({
  title: z.string()
    .min(3, "Заголовок должен содержать минимум 3 символа")
    .max(200, "Заголовок не может превышать 200 символов")
    .trim(),
  content: z.string()
    .min(10, "Содержание должно содержать минимум 10 символов")
    .max(10000, "Содержание не может превышать 10000 символов")
    .trim(),
  category_id: z.string().uuid("Выберите категорию"),
});

export const postSchema = z.object({
  content: z.string()
    .min(1, "Сообщение не может быть пустым")
    .max(5000, "Сообщение не может превышать 5000 символов")
    .trim(),
});

export const resourceSchema = z.object({
  title: z.string()
    .min(3, "Название должно содержать минимум 3 символа")
    .max(200, "Название не может превышать 200 символов")
    .trim(),
  description: z.string()
    .min(10, "Описание должно содержать минимум 10 символов")
    .max(1000, "Описание не может превышать 1000 символов")
    .trim(),
  resource_type: z.enum(["code", "tutorial", "tool", "library"]),
  url: z.string().url("Введите корректный URL").optional().or(z.literal("")),
});

export const profileSchema = z.object({
  username: z.string()
    .min(3, "Имя пользователя должно содержать минимум 3 символа")
    .max(30, "Имя пользователя не может превышать 30 символов")
    .regex(/^[a-zA-Z0-9_-]+$/, "Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание")
    .trim(),
  bio: z.string()
    .max(500, "Биография не может превышать 500 символов")
    .optional(),
});