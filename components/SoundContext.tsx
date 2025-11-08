"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type SoundState = {
  disabled: boolean;
  toggle: () => void;
  set: (v: boolean) => void;
};

const SoundCtx = createContext<SoundState | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [disabled, setDisabled] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('triviacast:sound-disabled');
      if (v !== null) setDisabled(v === '1');
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem('triviacast:sound-disabled', disabled ? '1' : '0');
    } catch {}
  }, [disabled]);

  const value = useMemo<SoundState>(() => ({
    disabled,
    toggle: () => setDisabled((x) => !x),
    set: (v: boolean) => setDisabled(!!v),
  }), [disabled]);

  return <SoundCtx.Provider value={value}>{children}</SoundCtx.Provider>;
}

export function useSound() {
  const v = useContext(SoundCtx);
  if (!v) throw new Error('useSound must be used within <SoundProvider>');
  return v;
}

export default SoundCtx;
