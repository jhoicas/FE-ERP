import { z } from "zod";

export const ScreenFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  key: z.string().min(1, "La key es obligatoria"),
  frontend_route: z.string().min(1, "La ruta frontend es obligatoria"),
  api_endpoint: z.string().optional().default(""),
  module_id: z.string().min(1, "El módulo es obligatorio"),
  order: z.coerce.number().int().min(0, "El orden debe ser mayor o igual a 0"),
  is_active: z.boolean(),
});

export type ScreenFormValues = z.infer<typeof ScreenFormSchema>;
