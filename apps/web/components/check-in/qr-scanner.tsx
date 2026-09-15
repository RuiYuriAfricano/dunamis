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
    let startPromise: Promise<unknown> = Promise.resolve();

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      startPromise = scanner
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
      // html5-qrcode's stop() throws synchronously if the camera hasn't
      // finished starting yet, which corrupts the unmount if called too
      // early (e.g. navigating away right after opening the scanner) —
      // wait for start() to settle and swallow the throw before stopping.
      startPromise
        .then(() => {
          try {
            scanner?.stop().then(() => scanner?.clear()).catch(() => undefined);
          } catch {
            // scanner never entered the "scanning" state — nothing to stop.
          }
        })
        .catch(() => undefined);
    };
  }, [active]);

  return <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg" />;
}
