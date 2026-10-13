import { useEffect, useState } from "react";
import type { Phrase } from "./phrases";
import { phraseDuration } from "./timing";

// initialIndex・initialSpeed は、本棚に保存した読んだ位置と速さ
export function useRsvp(
  phrases: Phrase[],
  initialIndex: number,
  initialSpeed: number,
) {
  const [index, setIndex] = useState(initialIndex);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);

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
