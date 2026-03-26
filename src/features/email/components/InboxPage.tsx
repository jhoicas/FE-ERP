import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import DOMPurify from "dompurify";
import axios from "axios";
import { Loader2, TicketPlus } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import {
  createTicketFromEmail,
  getEmailAccounts,
  getEmails,
} from "@/features/email/services";
import type { EmailMessage } from "@/types/email";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

type CreateTicketFormData = {
  title: string;
  description: string;
};

type InboxPageProps = {
  accountId?: string;
};

function formatReceivedAt(receivedAt: string): string {
  const date = new Date(receivedAt);
  if (Number.isNaN(date.getTime())) {
    return receivedAt;
  }

  return date.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EmailListItem({
  email,
  isActive,
  onClick,
}: {
  email: EmailMessage;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
      aria-pressed={isActive}
    >
      <Card
        className={[
          "mb-3 cursor-pointer border p-3 transition-colors hover:bg-muted/40",
          isActive ? "bg-muted border-primary" : "",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <p
            className={[
              "truncate text-sm",
              !email.is_read ? "font-semibold" : "font-medium",
            ].join(" ")}
          >
            {email.from_address}
          </p>
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatReceivedAt(email.received_at)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {!email.is_read ? (
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
          ) : null}
          <p className="truncate text-sm text-muted-foreground">{email.subject}</p>
        </div>
      </Card>
    </button>
  );
}

function CreateTicketDialog({
  email,
  open,
  onOpenChange,
  onCreated,
}: {
  email: EmailMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTicketFormData>({
    defaultValues: {
      title: email.subject,
      description: email.body_text,
    },
  });

  useEffect(() => {
    form.reset({
      title: email.subject,
      description: email.body_text,
    });
  }, [email, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setIsSubmitting(true);
      await createTicketFromEmail(email.id, {
        title: data.title,
        description: data.description,
      });

      toast({
        title: "Ticket creado",
        description: "El correo fue convertido en ticket correctamente.",
      });

      onOpenChange(false);
      onCreated();
    } catch (error) {
      console.error("Error creating ticket from email:", error);
      toast({
        title: "Error al crear ticket",
        description: "No se pudo crear el ticket desde este correo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convertir correo en ticket</DialogTitle>
          <DialogDescription>
            Revisa y ajusta la información antes de crear el ticket en CRM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="ticket-title" className="text-sm font-medium">
              Asunto
            </label>
            <Input
              id="ticket-title"
              {...form.register("title", { required: true })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="ticket-description" className="text-sm font-medium">
              Descripción
            </label>
            <Textarea
              id="ticket-description"
              rows={8}
              {...form.register("description", { required: true })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Ticket"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmailDetail({ email }: { email: EmailMessage }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const sanitizedBodyHtml = useMemo(
    () => DOMPurify.sanitize(email.body_html),
    [email.body_html],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{email.subject}</h2>
          <p className="truncate text-sm text-muted-foreground">
            De: {email.from_address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
          >
            <TicketPlus className="mr-2 h-4 w-4" />
            Convertir en Ticket
          </Button>

          {email.customer_id ? (
            <Link to={`/crm/customers/${email.customer_id}`}>
              <Badge className="cursor-pointer" variant="secondary">
                Ver Cliente
              </Badge>
            </Link>
          ) : null}
        </div>
      </div>

      <ScrollArea className="h-full">
        <article className="prose prose-sm max-w-none p-4 dark:prose-invert">
          <div dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }} />
        </article>
      </ScrollArea>

      <CreateTicketDialog
        email={email}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onCreated={() => undefined}
      />
    </div>
  );
}

export function InboxPage({ accountId }: InboxPageProps) {
  const { toast } = useToast();

  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccountConfigured, setHasAccountConfigured] = useState(true);

  const activeEmail = useMemo(
    () => emails.find((email) => email.id === activeEmailId) ?? null,
    [emails, activeEmailId],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadEmails() {
      try {
        setIsLoading(true);

        let resolvedAccountId = accountId;

        if (!resolvedAccountId) {
          const accounts = await getEmailAccounts();

          if (!accounts.length) {
            if (isMounted) {
              setHasAccountConfigured(false);
              setEmails([]);
              setActiveEmailId(null);
            }
            return;
          }

          resolvedAccountId = accounts[0].id;
        }

        const fetchedEmails = await getEmails(resolvedAccountId);

        if (!isMounted) {
          return;
        }

        setHasAccountConfigured(true);
        setEmails(fetchedEmails);

        if (fetchedEmails.length > 0) {
          setActiveEmailId((current) => current ?? fetchedEmails[0].id);
        } else {
          setActiveEmailId(null);
        }
      } catch (error) {
        console.error("Error loading inbox:", error);
        if (isMounted) {
          let description = "No fue posible obtener la bandeja de entrada.";

          if (axios.isAxiosError(error)) {
            const status = error.response?.status;

            if (status === 404) {
              description =
                "No se encontró la bandeja para esta cuenta. Verifica la configuración de correo.";
            } else if (status === 403) {
              description =
                "No tienes permisos para consultar los correos de esta cuenta.";
            } else if (status && status >= 500) {
              description =
                "El servidor de correo no está disponible en este momento. Intenta de nuevo más tarde.";
            } else if (typeof error.response?.data === "object" && error.response?.data) {
              const apiMessage = (error.response.data as { message?: string }).message;
              if (apiMessage) {
                description = apiMessage;
              }
            }
          }

          toast({
            title: "Error al cargar correos",
            description,
            variant: "destructive",
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadEmails();

    return () => {
      isMounted = false;
    };
  }, [accountId, toast]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasAccountConfigured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          No hay cuentas de correo configuradas. Configura una cuenta IMAP para
          ver la bandeja de entrada.
        </p>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden rounded-lg border bg-background">
      <div className="flex h-full">
        <div className="w-full border-r md:w-1/3">
          <ScrollArea className="h-full p-3">
            {emails.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                No hay correos para mostrar.
              </p>
            ) : (
              emails.map((email) => (
                <EmailListItem
                  key={email.id}
                  email={email}
                  isActive={email.id === activeEmailId}
                  onClick={() => setActiveEmailId(email.id)}
                />
              ))
            )}
          </ScrollArea>
        </div>

        <div className="hidden h-full md:block md:w-2/3">
          {activeEmail ? (
            <EmailDetail email={activeEmail} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Selecciona un correo para leerlo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
