import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Renders a Code128 barcode client-side (jsbarcode draws to a <canvas>).
 * No external API call — unlike the earlier QR approach, this always works
 * regardless of any third-party service being up or reachable.
 */
export function Barcode({ value, height = 50 }: { value: string; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: "CODE128",
          height,
          width: 1.6,
          fontSize: 12,
          margin: 4,
          displayValue: true,
        });
      } catch {
        // If the value contains characters CODE128 can't encode, fail silently
        // rather than crashing the invoice page.
      }
    }
  }, [value, height]);

  return <canvas ref={canvasRef} />;
}
