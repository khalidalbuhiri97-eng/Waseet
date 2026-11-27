import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  alt: string;
}

export function QrCodeCanvas({ value, size = 140, alt }: QrCodeCanvasProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white text-xs font-mono text-slate-500"
      >
        QR
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt}
      referrerPolicy="no-referrer"
      className="border border-slate-200 dark:border-slate-700 bg-white p-1.5 rounded-lg"
    />
  );
}
