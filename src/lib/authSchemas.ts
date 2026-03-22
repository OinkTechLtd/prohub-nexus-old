import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string()
    .email("Введите корректный email адрес")
    .max(255, "Email не может превышать 255 символов")
    .trim(),
  password: z.string()
    .min(6, "Пароль должен содержать минимум 6 символов")
    .max(72, "Пароль не может превышать 72 символа"),
  username: z.string()
    .min(3, "Имя пользователя должно содержать минимум 3 символа")
    .max(30, "Имя пользователя не может превышать 30 символов")
    .regex(/^[a-zA-Z0-9_-]+$/, "Имя пользователя может содержать только буквы, цифры, дефис и подчеркивание")
    .trim()
    .optional(),
});

export const signInSchema = z.object({
  email: z.string()
    .email("Введите корректный email адрес")
    .trim(),
  password: z.string()
    .min(1, "Введите пароль"),
});
