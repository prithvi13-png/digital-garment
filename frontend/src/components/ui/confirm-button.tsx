import { Button } from "@/components/ui/button";

export function ConfirmButton({
  onConfirm,
  label,
  message,
  variant = "danger",
}: {
  onConfirm: () => void;
  label: string;
  message?: string;
  variant?: "danger" | "secondary" | "ghost";
}) {
  return (
    <Button
      variant={variant}
      onClick={() => {
        const ok = window.confirm(message || "Are you sure?");
        if (ok) {
          onConfirm();
        }
      }}
    >
      {label}
    </Button>
  );
}
