import { useEffect, useState } from "react";
import type { Phrase } from "./phrases";

// 速読表示で使うフォント。RsvpView の文節の sx と揃える
export const PHRASE_FONT_FAMILY = "'Noto Sans JP'";
export const PHRASE_FONT_WEIGHT = 500;

// 今の位置から何文節先までのフォントを取っておくか
const LOOKAHEAD = 200;
// 毎文節ではなく、この文節数ごとに先読みをやり直す
const CHUNK = 100;

// 和文フォントは文字の範囲ごとのファイルに分かれていて、初めて描く時に取りに行く。
// 届くまでシステムフォントで描かれてちらつくので、これから出る文節の分を先に取っておく。
// 最初の先読みが済んだら true を返す
export function useFontPreload(phrases: Phrase[], index: number): boolean {
  const [readyFor, setReadyFor] = useState<Phrase[] | null>(null);
  const chunk = Math.floor(index / CHUNK);

  useEffect(() => {
    let cancelled = false;
    const start = chunk * CHUNK;
    const text = phrases
      .slice(start, start + CHUNK + LOOKAHEAD)
      .map((phrase) => phrase.text)
      .join("");
    document.fonts
      .load(`${PHRASE_FONT_WEIGHT} 1em ${PHRASE_FONT_FAMILY}`, text)
      // 取れなくても代わりのフォントで読めるので、待つのはやめる
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReadyFor(phrases);
      });
    return () => {
      cancelled = true;
    };
  }, [phrases, chunk]);

  return readyFor === phrases;
}
