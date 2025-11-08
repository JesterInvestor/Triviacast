"use client";
import { useEffect, useRef } from 'react';

// Plays a short click / pop sound on every primary button press.
// We avoid wrapping each button; instead we delegate from the document.
// If performance becomes a concern, scope to a class like .sfx-btn.
export default function ButtonSoundProvider() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio
    const audio = new Audio('/button-click.mp3');
    audio.preload = 'auto';
    audio.volume = 0.4;
    audioRef.current = audio;

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Only play for left clicks on buttons with no disabled attribute
      const button = target.closest('button');
      if (!button) return;
      if (button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') return;
      try {
        // Clone for overlapping rapid clicks
        const a = audioRef.current;
        if (!a) return;
        const clone = a.cloneNode(true) as HTMLAudioElement;
        clone.volume = a.volume;
        clone.play().catch(() => {});
      } catch {}
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  return null;
}
