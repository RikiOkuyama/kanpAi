"use client";

import { useEffect, useRef } from "react";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export default function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;

    import("qrcode").then((QRCode) => {
      QRCode.toCanvas(canvasRef.current!, url, {
        width: size,
        margin: 2,
        color: { dark: "#1A1A1A", light: "#FFFFFF" },
      });
    });
  }, [url, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} className="rounded-lg shadow-md" />
      <p className="text-xs text-gray-500 break-all max-w-xs text-center">{url}</p>
    </div>
  );
}
