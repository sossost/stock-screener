import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

type StateMessageProps = {
  title: string;
  description?: string;
  variant?: "info" | "error";
  actionLabel?: string;
  onAction?: () => void;
};

export function StateMessage({
  title,
  description,
  variant = "info",
  actionLabel,
  onAction,
}: StateMessageProps) {
  const Icon = variant === "error" ? AlertTriangle : Info;
  const iconColor =
    variant === "error" ? "text-red-500" : "text-blue-500";

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <Icon className={`h-6 w-6 ${iconColor}`} />
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md whitespace-pre-line">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
