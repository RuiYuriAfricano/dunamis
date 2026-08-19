"use client";

import { useEffect, useRef } from "react";

const SCANNER_ELEMENT_ID = "dunamis-qr-scanner";

export function QrScanner({ active, onScan }: { active: boolean; onScan: (token: string) => void }) {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => onScanRef.current(decodedText),
          () => undefined,
        )
        .catch((err) => {
          console.error("Não foi possível iniciar a câmara.", err);
        });
    });

    return () => {
      cancelled = true;
      scanner
        ?.stop()
        .then(() => scanner?.clear())
        .catch(() => undefined);
    };
  }, [active]);

  return <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />;
}
