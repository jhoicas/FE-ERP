import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LoginSchema, type LoginInput } from "@/features/auth/schemas";
import { loginService } from "@/features/auth/services";
import { getDefaultRouteForRoles, getUserRoles } from "@/features/auth/permissions";
import { AUTH_TOKEN_COOKIE_KEY, AUTH_USER_STORAGE_KEY } from "@/config/auth";
import { prefetchRbacMenu, RBAC_MENU_QUERY_KEY } from "@/features/auth/useRbacMenu";
import { getDefaultRouteFromMenu } from "@/features/auth/permissions";
import type { RbacMenuDTO } from "@/features/auth/services";

export default function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);

    try {
      const result = await loginService(values);

      Cookies.set(AUTH_TOKEN_COOKIE_KEY, result.token, {
        sameSite: "lax",
      });

      if (result.user) {
        const sessionRoleIdCandidate = result.role_id ?? (result.user as Record<string, unknown>).role_id;
        const sessionRoleKeyCandidate =
          result.role_key
          ?? (result.user as Record<string, unknown>).role_key
          ?? (result.user as Record<string, unknown>).role;
        const sessionRoleId = typeof sessionRoleIdCandidate === "string" ? sessionRoleIdCandidate : undefined;
        const sessionRoleKey =
          typeof sessionRoleKeyCandidate === "string" && sessionRoleKeyCandidate.trim().length > 0
            ? sessionRoleKeyCandidate
            : undefined;

        const sessionUser = {
          ...result.user,
          role_id: sessionRoleId,
          role: sessionRoleKey,
          role_key: sessionRoleKey,
          roles: sessionRoleKey ? [sessionRoleKey] : [],
        };

        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(sessionUser));

        queryClient.removeQueries({ queryKey: RBAC_MENU_QUERY_KEY });
        await prefetchRbacMenu(queryClient).catch(() => undefined);

        const cachedMenu = queryClient.getQueryData<RbacMenuDTO>(RBAC_MENU_QUERY_KEY);
        const nextRoles = getUserRoles(sessionUser);
        navigate(
          cachedMenu ? getDefaultRouteFromMenu(cachedMenu) : getDefaultRouteForRoles(nextRoles),
          { replace: true },
        );
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error(error);
      setServerError("No se pudo iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="erp-card space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Inicia sesión</h1>
            <p className="text-sm text-muted-foreground">
              Accede a tu panel de control de Ludoia ERP.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="tu@empresa.com" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {serverError && (
                <p className="text-sm font-medium text-destructive text-center">{serverError}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Ingresando..." : "Iniciar sesión"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

