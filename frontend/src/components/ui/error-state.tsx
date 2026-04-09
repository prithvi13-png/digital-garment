import { Button } from "@/components/ui/button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-100 bg-gradient-to-b from-red-50 to-white p-6 shadow-[0_1px_2px_rgba(127,29,29,0.06)]">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry ? (
        <Button className="mt-3" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
