"use client";

import type { ReactElement } from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function PdfViewerDialog({
  src,
  title,
  trigger,
}: {
  src: string;
  title: string;
  trigger: ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex h-[88vh] max-h-[800px] w-full max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-3xl">
        <div className="flex items-center gap-2 border-b py-3 pr-10 pl-4">
          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
          <DialogTitle className="truncate text-base">{title}</DialogTitle>
        </div>
        <iframe src={src} title={title} className="min-h-0 flex-1 rounded-b-xl bg-muted" />
      </DialogContent>
    </Dialog>
  );
}
