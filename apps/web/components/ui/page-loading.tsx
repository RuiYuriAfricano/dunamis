import { Spinner } from "@/components/ui/spinner";

export function PageLoading({ label = "A carregar..." }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 py-24 text-muted-foreground">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
