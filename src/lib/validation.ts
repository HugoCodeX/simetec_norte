import z from "zod";

export const passwordSchema = z
  .string()
  .min(1, { message: "Contraseña es requerida" })
  .min(8, { message: "Contraseña debe tener al menos 8 caracteres" });

