"use client";

import { useRef } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FileUpload({
  value,
  onChange,
  accept,
  error,
}: {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5",
            error && "border-destructive",
          )}
        >
          <Upload className="size-5" aria-hidden />
          <span>
            <span className="font-medium text-primary">Carregar comprovativo</span> (imagem ou PDF)
          </span>
        </button>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{value.name}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
