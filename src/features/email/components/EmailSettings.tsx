import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useMsal } from "@azure/msal-react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail, Zap, Trash2 } from "lucide-react";

import { useToast } from "@/components/ui/use-toast";
import {
  configureCustomImapSmtp,
  configureGoogleOAuth,
  configureMicrosoftOAuth,
  deleteEmailAccount,
  getEmailAccounts,
  testSavedEmailAccount,
  updateEmailAccount,
} from "@/features/email/services";
import {
  customImapSmtpSchema,
  type CustomImapSmtpFormData,
} from "@/features/email/schemas";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

function decodeGoogleEmailFromJwt(credential: string): string | null {
  try {
    const payloadSegment = credential.split(".")[1];
    if (!payloadSegment) {
      return null;
    }

    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = atob(normalized);
    const payload = JSON.parse(json) as { email?: string };

    return payload.email ?? null;
  } catch {
    return null;
  }
}

export function EmailSettings() {
  const { toast } = useToast();
  const { instance } = useMsal();

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  const [editImapServer, setEditImapServer] = useState("");
  const [editImapPort, setEditImapPort] = useState<number>(993);
  const [editSmtpHost, setEditSmtpHost] = useState("");
  const [editSmtpPort, setEditSmtpPort] = useState<number>(587);
  const [editPassword, setEditPassword] = useState("");

  const [processingAccountId, setProcessingAccountId] = useState<string | null>(
    null,
  );

  const form = useForm<CustomImapSmtpFormData>({
    resolver: zodResolver(customImapSmtpSchema),
    defaultValues: {
      email_address: "",
      imap_host: "",
      imap_port: 993,
      smtp_host: "",
      smtp_port: 587,
      app_password: "",
    },
  });

  const googleOAuthMutation = useMutation({
    mutationFn: ({ credential, email }: { credential: string; email: string }) =>
      configureGoogleOAuth(credential, email),
  });

  const microsoftOAuthMutation = useMutation({
    mutationFn: ({ accessToken, email, idToken }: { accessToken: string; email: string; idToken?: string }) =>
      configureMicrosoftOAuth(accessToken, email, idToken),
  });

  const customImapMutation = useMutation({
    mutationFn: (data: CustomImapSmtpFormData) => configureCustomImapSmtp(data),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (accountId: string) => deleteEmailAccount(accountId),
  });

  const googleLoading = googleOAuthMutation.isPending;
  const microsoftLoading = microsoftOAuthMutation.isPending;
  const customImapLoading = customImapMutation.isPending;

  const loadAccounts = useCallback(async () => {
    try {
      setIsLoadingAccounts(true);
      const response = await getEmailAccounts();
      setAccounts(response);
    } catch (error) {
      console.error("Error loading email accounts:", error);
      toast({
        title: "Error al cargar cuentas",
        description: "No fue posible obtener las cuentas configuradas.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse,
  ) => {
    const credential = credentialResponse.credential;

    if (!credential) {
      toast({
        title: "Error de Google",
        description: "No se recibió la credencial de Google.",
        variant: "destructive",
      });
      return;
    }

    const email = decodeGoogleEmailFromJwt(credential);
    if (!email) {
      toast({
        title: "Error de Google",
        description: "No se pudo extraer el correo desde el token JWT.",
        variant: "destructive",
      });
      return;
    }

    try {
      await googleOAuthMutation.mutateAsync({ credential, email });
      toast({
        title: "Google Workspace conectado",
        description: `La cuenta ${email} se configuró correctamente.`,
      });
      await loadAccounts();
    } catch (error) {
      console.error("Error configuring Google OAuth:", error);
      toast({
        title: "Error al conectar Google Workspace",
        description: "No se pudo completar la configuración OAuth.",
        variant: "destructive",
      });
    }
  };

  const handleMicrosoftLogin = async () => {
    try {
      const loginResult = await instance.loginPopup({
        scopes: ["openid", "profile", "email", "offline_access", "User.Read"],
      });

      const account =
        loginResult.account ?? instance.getActiveAccount() ?? instance.getAllAccounts()[0];

      if (account) {
        instance.setActiveAccount(account);
      }

      const tokenResult = account
        ? await instance.acquireTokenSilent({
            account,
            scopes: ["openid", "profile", "email", "offline_access", "User.Read"],
          })
        : null;

      const accessToken = tokenResult?.accessToken || loginResult.accessToken;
      const idToken = tokenResult?.idToken || loginResult.idToken;

      const emailAddress =
        account?.username ||
        (typeof loginResult.idTokenClaims?.preferred_username === "string"
          ? loginResult.idTokenClaims.preferred_username
          : typeof tokenResult?.idTokenClaims?.preferred_username === "string"
            ? tokenResult.idTokenClaims.preferred_username
          : "");

      if (!emailAddress) {
        throw new Error("No se pudo obtener el correo de la cuenta Microsoft.");
      }

      if (!accessToken && !idToken) {
        throw new Error("No se recibió access token ni id token de Microsoft.");
      }

      await microsoftOAuthMutation.mutateAsync({
        accessToken: accessToken || idToken || "",
        email: emailAddress,
        idToken,
      });

      toast({
        title: "Microsoft 365 conectado",
        description: `La cuenta ${emailAddress} se configuró correctamente.`,
      });

      await loadAccounts();
    } catch (error) {
      console.error("Error configuring Microsoft OAuth:", error);
      toast({
        title: "Error al conectar Microsoft 365",
        description: "No se pudo completar la autenticación con Microsoft.",
        variant: "destructive",
      });
    }
  };

  const onSubmitCustomImap = async (data: CustomImapSmtpFormData) => {
    try {
      await customImapMutation.mutateAsync(data);

      toast({
        title: "Cuenta agregada",
        description: `La cuenta ${data.email_address} se configuró correctamente.`,
      });

      form.reset({
        email_address: "",
        imap_host: "",
        imap_port: 993,
        smtp_host: "",
        smtp_port: 587,
        app_password: "",
      });

      await loadAccounts();
    } catch (error) {
      console.error("Error configuring custom IMAP/SMTP:", error);
      toast({
        title: "Error al configurar IMAP/SMTP",
        description: "No se pudo guardar la configuración personalizada.",
        variant: "destructive",
      });
    }
  };

  const beginEditAccount = (account: EmailAccount) => {
    const accountWithSmtp = account as EmailAccount & {
      smtp_host?: string;
      smtp_port?: number;
    };

    setEditingAccountId(account.id);
    setEditImapServer(account.imap_server);
    setEditImapPort(account.imap_port);
    setEditSmtpHost(accountWithSmtp.smtp_host ?? account.imap_server);
    setEditSmtpPort(accountWithSmtp.smtp_port ?? 587);
    setEditPassword("");
  };

  const cancelEditAccount = () => {
    setEditingAccountId(null);
    setEditImapServer("");
    setEditImapPort(993);
    setEditSmtpHost("");
    setEditSmtpPort(587);
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

    if (
      !Number.isFinite(editImapPort) ||
      editImapPort <= 0 ||
      editImapPort > 65535
    ) {
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
        description: "La cuenta fue actualizada correctamente.",
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

      await updateEmailAccount(account.id, { is_active: nextIsActive });

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

  const handleDeleteAccount = async (account: EmailAccount) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la cuenta ${account.email_address}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setProcessingAccountId(account.id);
      await deleteAccountMutation.mutateAsync(account.id);

      toast({
        title: "Cuenta eliminada",
        description: `La cuenta ${account.email_address} fue eliminada correctamente.`,
      });

      await loadAccounts();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la cuenta seleccionada.",
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
          description: response.message || "La cuenta respondió correctamente.",
        });
        return;
      }

      toast({
        title: "Error de conexión",
        description:
          response.error ||
          response.message ||
          "No se pudo conectar con la cuenta guardada.",
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
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Agregar Cuenta de Email
          </CardTitle>
          <CardDescription>
            Configura Google Workspace, Microsoft 365 o una conexión IMAP/SMTP
            personalizada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="google">Google Workspace</TabsTrigger>
              <TabsTrigger value="microsoft">Microsoft 365</TabsTrigger>
              <TabsTrigger value="custom">IMAP/SMTP</TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="pt-4">
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background font-semibold">
                    G
                  </div>
                  Inicia sesión con tu cuenta de Google Workspace.
                </div>
                <div className="w-fit">
                  {googleLoading ? (
                    <Button disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </Button>
                  ) : (
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {
                        toast({
                          title: "Error de Google",
                          description: "No se pudo iniciar sesión con Google.",
                          variant: "destructive",
                        });
                      }}
                    />
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="microsoft" className="pt-4">
              <div className="flex flex-col gap-4 rounded-lg border p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-8 w-8 items-center justify-center rounded border bg-background font-semibold">
                    M
                  </div>
                  Conecta tu cuenta corporativa de Microsoft 365.
                </div>
                <div>
                  <Button onClick={handleMicrosoftLogin} disabled={microsoftLoading}>
                    {microsoftLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Conectar con Microsoft
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="custom" className="pt-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitCustomImap)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="usuario@empresa.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4 rounded-md border p-4">
                    <p className="text-sm font-medium">Configuración IMAP</p>
                    <FormField
                      control={form.control}
                      name="imap_host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host IMAP</FormLabel>
                          <FormControl>
                            <Input placeholder="imap.gmail.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            ej: imap.gmail.com o imaps://imap.gmail.com
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="imap_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto IMAP</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={65535}
                              value={field.value ?? 993}
                              onChange={(event) =>
                                field.onChange(Number(event.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4 rounded-md border p-4">
                    <p className="text-sm font-medium">Configuración SMTP</p>
                    <FormField
                      control={form.control}
                      name="smtp_host"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Host SMTP</FormLabel>
                          <FormControl>
                            <Input placeholder="smtp.gmail.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            ej: smtp.gmail.com o smtps://smtp.gmail.com
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="smtp_port"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Puerto SMTP</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={65535}
                              value={field.value ?? 587}
                              onChange={(event) =>
                                field.onChange(Number(event.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="app_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña de aplicación</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormDescription>
                          Genera una contraseña en{" "}
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            myaccount.google.com/apppasswords
                          </a>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={customImapLoading}>
                    {customImapLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar configuración IMAP/SMTP
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas Configuradas</CardTitle>
          <CardDescription>
            Administra las cuentas conectadas y prueba su estado de conexión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingAccounts ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando cuentas...
            </div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cuentas configuradas.
            </p>
          ) : (
            accounts.map((account) => {
              const isProcessing = processingAccountId === account.id;
              const isEditing = editingAccountId === account.id;
              const isActive = account.is_active ?? true;

              return (
                <div key={account.id} className="rounded-lg border p-4">
                  <div className="grid gap-2 text-sm md:grid-cols-4">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-muted-foreground">{account.email_address}</p>
                    </div>
                    <div>
                      <p className="font-medium">Servidor</p>
                      <p className="text-muted-foreground">{account.imap_server}</p>
                    </div>
                    <div>
                      <p className="font-medium">Puerto</p>
                      <p className="text-muted-foreground">{account.imap_port}</p>
                    </div>
                    <div>
                      <p className="font-medium">Estado</p>
                      <p className={isActive ? "text-green-600" : "text-muted-foreground"}>
                        {isActive ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleTestSavedAccount(account.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Probar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => beginEditAccount(account)}
                      disabled={isProcessing}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleToggleAccountStatus(account)}
                      disabled={isProcessing}
                    >
                      {isActive ? "Desactivar" : "Reactivar"}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDeleteAccount(account)}
                      disabled={isProcessing}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>

                  {isEditing && (
                    <div className="mt-4 space-y-3 rounded-md border p-3">
                      <Input
                        value={editImapServer}
                        onChange={(event) => setEditImapServer(event.target.value)}
                        placeholder="Servidor IMAP"
                      />
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        value={editImapPort}
                        onChange={(event) => setEditImapPort(Number(event.target.value))}
                        placeholder="Puerto IMAP"
                      />
                      <Input
                        type="password"
                        value={editPassword}
                        onChange={(event) => setEditPassword(event.target.value)}
                        placeholder="Nueva contraseña (opcional)"
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateAccount(account.id)}
                          disabled={processingAccountId === account.id}
                        >
                          {processingAccountId === account.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Guardar cambios
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={cancelEditAccount}
                          disabled={processingAccountId === account.id}
                        >
                          Cancelar
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
