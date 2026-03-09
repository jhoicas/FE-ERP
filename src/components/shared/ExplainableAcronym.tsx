import { ACRONYMS } from "@/lib/constants/acronyms";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ExplainableAcronymProps {
  sigla: string;
  className?: string;
}

export default function ExplainableAcronym({ sigla, className }: ExplainableAcronymProps) {
  const meaning = ACRONYMS[sigla.toUpperCase()];

  const content = (
    <span
      className={
        "underline decoration-dashed decoration-muted-foreground/70 underline-offset-4 cursor-help " +
        (className ?? "")
      }
      aria-label={meaning ?? sigla}
    >
      {sigla}
    </span>
  );

  if (!meaning) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs leading-snug">{meaning}</p>
      </TooltipContent>
    </Tooltip>
  );
}

