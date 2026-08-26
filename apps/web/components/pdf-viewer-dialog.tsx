"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfViewerDialog({
  src,
  title,
  trigger,
}: {
  src: string;
  title: string;
  trigger: ReactElement;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPageWidth(Math.max(entry.contentRect.width - 16, 0));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="fixed top-8 right-4 bottom-4 left-4 z-50 flex w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-xl bg-popover p-0 sm:top-1/2 sm:right-auto sm:bottom-auto sm:left-1/2 sm:h-[85vh] sm:max-h-[800px] sm:w-[calc(100%-2rem)] sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2">
        <div className="flex items-center gap-2 border-b py-3 pr-10 pl-4">
          <FileText className="size-4 shrink-0 text-primary" aria-hidden />
          <DialogTitle className="truncate text-base">{title}</DialogTitle>
        </div>
        <div ref={containerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted p-2">
          <Document
            file={src}
            loading={
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                <Spinner className="size-4" />A carregar documento...
              </div>
            }
            error={
              <p className="py-16 text-center text-sm text-destructive">
                Não foi possível carregar o documento.
              </p>
            }
            onLoadSuccess={({ numPages: total }) => setNumPages(total)}
          >
            {pageWidth > 0 &&
              Array.from({ length: numPages }, (_, i) => (
                <Page
                  key={i}
                  pageNumber={i + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mx-auto mb-2 shadow-sm last:mb-0"
                />
              ))}
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  );
}
