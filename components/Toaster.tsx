"use client";

import { useEffect, useState } from 'react';

type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let idCounter = 1;
    type Detail = { type?: Toast['type']; message?: string };
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Detail>;
      const payload = custom?.detail || {};
      const toast: Toast = { id: idCounter++, type: payload.type || 'info', message: payload.message || '' };
      setToasts((t) => [...t, toast]);
      // auto remove
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== toast.id));
      }, 4500);
    };
    window.addEventListener('triviacast:toast', handler as EventListener);
    return () => window.removeEventListener('triviacast:toast', handler as EventListener);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`rounded-md px-4 py-2 text-sm shadow ${t.type === 'success' ? 'bg-green-500 text-white' : t.type === 'error' ? 'bg-red-500 text-white' : 'bg-neutral-800 text-white'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
