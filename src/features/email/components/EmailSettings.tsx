import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  saveEmailAccount,
  testEmailConnection,
} from "@/features/email/services";
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
    .url("Ingrese una URL válida para el servidor IMAP"),
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

  const form = useForm<EmailAccountFormData>({
    resolver: zodResolver(emailAccountSchema),
    defaultValues: {
      email_address: "",
      password: "",
      imap_server: "",
      imap_port: 993,
    },
  });

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

  return (
    <div className="w-full max-w-2xl mx-auto">
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
    </div>
  );
}
