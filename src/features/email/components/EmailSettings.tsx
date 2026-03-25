import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  getEmailAccounts,
  saveEmailAccount,
  testEmailConnection,
  testSavedEmailAccount,
  updateEmailAccount,
} from "@/features/email/services";
import type { EmailAccount } from "@/types/email";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Schema de validación para la configuración de cuenta de email
 */
const emailAccountSchema = z.object({
  email_address: z
    .string()
    .email("Ingrese un correo electrónico válido")
    .min(1, "El correo electrónico es requerido"),
  password: z
    .string()
    .min(1, "La contraseña es requerida")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  imap_server: z
    .string()
    .min(1, "El servidor IMAP es requerido")
    .refine(
      (value) => {
        const trimmedValue = value.trim();
        if (!trimmedValue) return false;

        if (/^[a-zA-Z0-9.-]+$/.test(trimmedValue)) {
          return true;
        }

        try {
          const parsedUrl = new URL(trimmedValue);
          return ["imap:", "imaps:"].includes(parsedUrl.protocol) || parsedUrl.protocol === "https:";
        } catch {
          return false;
        }
      },
      "Ingrese un host válido (ej: imap.gmail.com) o URL IMAP",
    ),
  imap_port: z
    .number()
    .min(1, "El puerto debe ser mayor a 0")
    .max(65535, "El puerto debe ser menor a 65536"),
});

type EmailAccountFormData = z.infer<typeof emailAccountSchema>;

export function EmailSettings() {
  const { toast } = useToast();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editImapServer, setEditImapServer] = useState("");
  const [editImapPort, setEditImapPort] = useState<number>(993);
  const [editPassword, setEditPassword] = useState("");
  const [processingAccountId, setProcessingAccountId] = useState<string | null>(null);

  const form = useForm<EmailAccountFormData>({
    resolver: zodResolver(emailAccountSchema),
    defaultValues: {
      email_address: "",
      password: "",
      imap_server: "",
      imap_port: 993,
    },
  });

  const loadAccounts = async () => {
    try {
      setIsLoadingAccounts(true);
      const response = await getEmailAccounts();
      setAccounts(response);
    } catch (error) {
      console.error("Error loading email accounts:", error);
      toast({
        title: "Error al cargar cuentas",
        description: "No fue posible obtener las cuentas de correo configuradas.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  /**
   * Maneja la prueba de conexión IMAP
   */
  const handleTestConnection = async () => {
    try {
      // Valida el formulario antes de probar conexión
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validación fallida",
          description: "Por favor, corrija los errores en el formulario",
          variant: "destructive",
        });
        return;
      }

      setIsTestingConnection(true);
      const formData = form.getValues();

      const response = await testEmailConnection({
        email_address: formData.email_address,
        password: formData.password,
        imap_server: formData.imap_server,
        imap_port: formData.imap_port,
      });

      if (response.success) {
        toast({
          title: "Conexión exitosa",
          description:
            "Se ha conectado correctamente al servidor IMAP. Ya puede guardar la configuración.",
          variant: "default",
        });
      } else {
        toast({
          title: "Error de conexión",
          description:
            response.error ||
            "No se pudo conectar al servidor IMAP. Verifique los datos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast({
        title: "Error",
        description:
          "Ocurrió un error al probar la conexión. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  /**
   * Maneja el envío del formulario para guardar la configuración
   */
  const onSubmit = async (data: EmailAccountFormData) => {
    try {
      setIsSaving(true);

      const savedAccount = await saveEmailAccount({
        email_address: data.email_address,
        password: data.password,
        imap_server: data.imap_server,
        imap_port: data.imap_port,
      });

      toast({
        title: "Configuración guardada",
        description: `La cuenta ${savedAccount.email_address} ha sido configurada correctamente.`,
        variant: "default",
      });

      // Limpiar el formulario después de guardar
      form.reset();
      await loadAccounts();
    } catch (error) {
      console.error("Error saving email account:", error);
      toast({
        title: "Error al guardar",
        description:
          "No se pudo guardar la configuración de la cuenta. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const beginEditAccount = (account: EmailAccount) => {
    setEditingAccountId(account.id);
    setEditImapServer(account.imap_server);
    setEditImapPort(account.imap_port);
    setEditPassword("");
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setEditImapServer("");
    setEditImapPort(993);
    setEditPassword("");
  };

  const handleUpdateAccount = async (accountId: string) => {
    if (!editImapServer.trim()) {
      toast({
        title: "Servidor requerido",
        description: "Debes ingresar el servidor IMAP.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(editImapPort) || editImapPort <= 0) {
      toast({
        title: "Puerto inválido",
        description: "Debes ingresar un puerto IMAP válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessingAccountId(accountId);

      await updateEmailAccount(accountId, {
        imap_server: editImapServer,
        imap_port: editImapPort,
        password: editPassword.trim() ? editPassword : undefined,
      });

      toast({
        title: "Cuenta actualizada",
        description: "La configuración de la cuenta fue actualizada correctamente.",
      });

      cancelEditAccount();
      await loadAccounts();
    } catch (error) {
      console.error("Error updating account:", error);
      toast({
        title: "Error al actualizar",
        description: "No se pudo actualizar la cuenta seleccionada.",
        variant: "destructive",
      });
    } finally {
      setProcessingAccountId(null);
    }
  };

  const handleToggleAccountStatus = async (account: EmailAccount) => {
    try {
      setProcessingAccountId(account.id);
      const nextIsActive = !(account.is_active ?? true);

      await updateEmailAccount(account.id, {
        is_active: nextIsActive,
      });

      toast({
        title: nextIsActive ? "Cuenta activada" : "Cuenta desactivada",
        description: `La cuenta ${account.email_address} fue ${nextIsActive ? "activada" : "desactivada"}.`,
      });

      await loadAccounts();
    } catch (error) {
      console.error("Error toggling account status:", error);
      toast({
        title: "Error al cambiar estado",
        description: "No se pudo actualizar el estado de la cuenta.",
        variant: "destructive",
      });
    } finally {
      setProcessingAccountId(null);
    }
  };

  const handleTestSavedAccount = async (accountId: string) => {
    try {
      setProcessingAccountId(accountId);
      const response = await testSavedEmailAccount(accountId);

      if (response.success) {
        toast({
          title: "Conexión exitosa",
          description: response.message || "La cuenta guardada respondió correctamente.",
        });
        return;
      }

      toast({
        title: "Error de conexión",
        description: response.error || response.message || "No se pudo conectar con la cuenta guardada.",
        variant: "destructive",
      });
    } catch (error) {
      console.error("Error testing saved account:", error);
      toast({
        title: "Error al probar cuenta",
        description: "No se pudo probar la cuenta seleccionada.",
        variant: "destructive",
      });
    } finally {
      setProcessingAccountId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Cuenta de Email</CardTitle>
          <CardDescription>
            Configure su cuenta IMAP para sincronizar correos con el inbox del
            CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Campo: Email Address */}
              <FormField
                control={form.control}
                name="email_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="usuario@ejemplo.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: IMAP Server */}
              <FormField
                control={form.control}
                name="imap_server"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Servidor IMAP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="imap.gmail.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo: IMAP Port */}
              <FormField
                control={form.control}
                name="imap_port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puerto IMAP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="993"
                        type="number"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Botones de acción */}
              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || isSaving}
                >
                  {isTestingConnection && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isTestingConnection ? "Probando..." : "Probar Conexión"}
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isTestingConnection}
                >
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas Configuradas</CardTitle>
          <CardDescription>
            Lista de cuentas guardadas. Puedes editarlas, activarlas o probar su conexión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAccounts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando cuentas...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cuentas configuradas todavía.
            </p>
          ) : (
            accounts.map((account) => {
              const isEditing = editingAccountId === account.id;
              const isProcessing = processingAccountId === account.id;
              const isActive = account.is_active ?? true;

              return (
                <div key={account.id} className="rounded-md border p-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-sm">{account.email_address}</p>
                      <p className="text-xs text-muted-foreground">
                        Servidor: {account.imap_server} · Puerto: {account.imap_port}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Estado: {isActive ? "Activa" : "Inactiva"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSavedAccount(account.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? "Probando..." : "Probar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => beginEditAccount(account)}
                        disabled={isProcessing}
                      >
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant={isActive ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleAccountStatus(account)}
                        disabled={isProcessing}
                      >
                        {isActive ? "Desactivar" : "Reactivar"}
                      </Button>
                    </div>
                  </div>

                  {isEditing && (
                    <div className="grid grid-cols-1 gap-3 rounded-md border p-3 md:grid-cols-3">
                      <Input
                        placeholder="imap.gmail.com"
                        value={editImapServer}
                        onChange={(event) => setEditImapServer(event.target.value)}
                      />
                      <Input
                        placeholder="993"
                        type="number"
                        value={editImapPort}
                        onChange={(event) => setEditImapPort(parseInt(event.target.value, 10) || 0)}
                      />
                      <Input
                        placeholder="Nueva contraseña (opcional)"
                        type="password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                      />

                      <div className="md:col-span-3 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={cancelEditAccount}>
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleUpdateAccount(account.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? "Guardando..." : "Guardar cambios"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
