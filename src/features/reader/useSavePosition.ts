import { useCallback, useEffect, useMemo, useRef } from "react";
import { savePosition } from "../../storage/books";
import type { Phrase } from "./phrases";
import { remainingWeights } from "./timing";
import type { Rsvp } from "./useRsvp";

// 再生中に保存する間隔。毎文節書くと多すぎるので間を空ける
const SAVE_INTERVAL = 5000;
// 止めている時に、位置や速さを動かしてから保存するまでの待ち時間
const SAVE_DELAY = 500;

// 読んだ位置と速さを本棚に保存する。再生中は数秒おき、止めている時は動かした後、画面を離れる時は必ず保存する
export function useSavePosition(id: number, phrases: Phrase[], rsvp: Rsvp) {
  const { index, playing, speed } = rsvp;
  const remaining = useMemo(() => remainingWeights(phrases), [phrases]);

  // 保存の処理からは、いつでも最新の位置を読めるようにする
  const latest = useRef({ index, speed });
  useEffect(() => {
    latest.current = { index, speed };
  });

  const save = useCallback(() => {
    const { index, speed } = latest.current;
    const phrase = phrases[index];
    if (!phrase) return;
    savePosition(id, {
      position: phrase.start,
      remainingWeight: remaining[index] ?? 0,
      speed,
    }).catch((e) => console.error(e));
  }, [id, phrases, remaining]);

  useEffect(() => {
    if (playing) return;
    const timer = setTimeout(save, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [save, playing, index, speed]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(save, SAVE_INTERVAL);
    return () => clearInterval(timer);
  }, [save, playing]);

  // アプリを裏に回した時と、読む画面を離れた時
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "hidden") save();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      save();
    };
  }, [save]);
}
