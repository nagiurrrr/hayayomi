import { useEffect, useState } from "react";
import type { Phrase } from "./phrases";
import { DEFAULT_SPEED, phraseDuration } from "./timing";

export function useRsvp(phrases: Phrase[]) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  useEffect(() => {
    if (!playing) return;
    const current = phrases[index];
    if (!current) return;
    const timer = setTimeout(
      () => {
        if (index >= phrases.length - 1) {
          setPlaying(false);
        } else {
          setIndex(index + 1);
        }
      },
      phraseDuration(current, speed),
    );
    return () => clearTimeout(timer);
  }, [playing, index, speed, phrases]);

  function toggle() {
    // 最後まで読んだ後に再生したら頭から
    if (!playing && index >= phrases.length - 1) setIndex(0);
    setPlaying(!playing);
  }

  function pause() {
    setPlaying(false);
  }

  function seek(next: number) {
    setIndex(Math.min(Math.max(next, 0), Math.max(phrases.length - 1, 0)));
  }

  return { index, playing, speed, setSpeed, toggle, pause, seek };
}

export type Rsvp = ReturnType<typeof useRsvp>;
